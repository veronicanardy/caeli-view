/**
 * Lightweight ephemeris helpers for the 3D radar's lighting + Moon placement.
 *
 * Frame contract, matching DailyOrbitalRadar3DPrototype.horizonsToScene:
 * - Astronomy Engine returns Sun/Moon data in EQJ, the J2000 equatorial frame.
 * - JPL Horizons asteroid vectors are rendered in J2000 ecliptic coordinates.
 * - The scene maps ecliptic (x, y, z) to Three.js (x, y, z) as (x, z, y):
 *   ecliptic X/Z become the floor plane, and ecliptic north becomes scene +Y.
 */

import type * as Astronomy from 'astronomy-engine';

const KM_PER_AU = 149_597_870.7;
const KM_PER_LD = 384_400;

/**
 * AU expressed in lunar distances (DL). 1 AU ≈ 389 DL.
 */
export const AU_IN_DL = KM_PER_AU / KM_PER_LD;

/**
 * Radial log compression — the ONE scale rule for the whole scene.
 *
 * A purely linear scale (1 DL = 1 unit) is honest but unusable: 1 AU = 389 DL, so the Sun ends up
 * ~389 units from Earth while the Moon sits at 1, an impossible spread to view at once. Instead we
 * compress the radial DISTANCE through a logarithm, exactly like an astronomical log-scale diagram:
 *
 *     r_scene = K · ln(1 + r_dl / R0)
 *
 * Properties that keep this scientifically defensible:
 *  - Strictly monotonic: a larger real distance always maps to a larger scene distance — nothing
 *    near/far ever swaps order.
 *  - Direction-preserving: only the magnitude is compressed; we keep the unit vector, so angles,
 *    orbital inclination and the shape of every trajectory are undistorted (Z is never squashed
 *    relative to X/Y — the prototype's core promise).
 *  - Near-linear close to Earth: for r ≪ R0 the curve is ≈ r·K/R0, so the Earth–Moon–near-asteroid
 *    neighbourhood stays almost true to scale; the log only "folds in" the huge empty gap to the Sun.
 *
 * R0 is the transition distance (DL) below which the mapping is ~linear. K is fixed so the Moon
 * (1 DL) lands at exactly 1 scene unit. With R0 = 8 the Sun (389 DL) lands at ~33 units: clearly
 * farther than everything else, yet on screen together with the Moon.
 */
const COMPRESS_R0_DL = 8;
const COMPRESS_K = 1 / Math.log(1 + 1 / COMPRESS_R0_DL);

/** Compresses a radial distance in DL to scene units via the log rule above. */
export function compressDistanceDl(rDl: number): number {
    if (rDl <= 0) return 0;
    return COMPRESS_K * Math.log(1 + rDl / COMPRESS_R0_DL);
}

/**
 * Applies the radial log compression to a scene-axis vector expressed in LINEAR DL (1 unit = 1 DL).
 * Keeps the direction, rescales the magnitude. This is the single funnel every distance passes
 * through: the Moon, the Horizons asteroid vectors, and the heliocentric orbit points.
 */
export function compressSceneVector(v: [number, number, number]): [number, number, number] {
    const r = Math.hypot(v[0], v[1], v[2]);
    if (r < 1e-9) return [0, 0, 0];
    const s = compressDistanceDl(r) / r;
    return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Where the Sun marker is drawn, in scene units: its real 1 AU distance run through the same log
 * compression as everything else. Derived, not hand-picked, so the Earth→Sun gap stays honest in
 * ORDER relative to the Earth→Moon gap (just compressed, never reordered).
 */
export const SUN_DISPLAY_DL = compressDistanceDl(AU_IN_DL);

export type SceneEphemeris = {
    /** Unit vector pointing FROM Earth TO the Sun, in scene axes. Use for the light direction. */
    sunDirection: [number, number, number];
    /** Sun position in scene units (1 unit = 1 DL), clamped to a finite display distance. */
    sunScenePosition: [number, number, number];
    /** Moon position in scene units (1 unit = 1 DL). Magnitude is roughly 1. */
    moonScenePosition: [number, number, number];
    /**
     * Unit normal of the Moon's real orbital plane, in scene axes (position x velocity). Defines
     * the actual tilt of the Moon's orbit so the drawn orbit line is not arbitrary.
     */
    moonOrbitNormal: [number, number, number];
    /** Geocentric Moon distance in km. */
    moonDistanceKm: number;
    /** Illuminated fraction of the Moon's disk, 0..1. */
    moonIlluminatedFraction: number;
    /**
     * Geographic lat/lon where the Sun is directly overhead now. The Earth shader uses this to put
     * the correct continents on the day side.
     */
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    /**
     * Heliocentric Earth position in ecliptic J2000 (AU). Used by the orbit-solar mode to draw
     * Earth at its real position on its 1 AU orbit (with eccentricity ~0.017 honestly applied).
     */
    earthHelioPositionAU: { x: number; y: number; z: number };
};

let modulePromise: Promise<typeof Astronomy> | null = null;
function loadAstronomy(): Promise<typeof Astronomy> {
    if (!modulePromise) modulePromise = import('astronomy-engine');
    return modulePromise;
}

/**
 * EQJ → ecliptic-J2000 rotation matrix. Constant (depends only on J2000), so we cache it once per
 * module load. Previously this was rebuilt on every frame-driven ephemeris call.
 */
let cachedEqjToEcl: Astronomy.RotationMatrix | null = null;
function eqjToEclMatrix(A: typeof Astronomy): Astronomy.RotationMatrix {
    if (!cachedEqjToEcl) cachedEqjToEcl = A.Rotation_EQJ_ECL();
    return cachedEqjToEcl;
}

function eclToScene(x: number, y: number, z: number, unitsKmPerInput: number): [number, number, number] {
    return [
        (x * unitsKmPerInput) / KM_PER_LD,
        (z * unitsKmPerInput) / KM_PER_LD,
        (y * unitsKmPerInput) / KM_PER_LD,
    ];
}

function eqjVectorToScene(
    A: typeof Astronomy,
    vec: Astronomy.Vector,
    unitsKmPerInput: number,
): [number, number, number] {
    const ecl = A.RotateVector(eqjToEclMatrix(A), vec);
    return eclToScene(ecl.x, ecl.y, ecl.z, unitsKmPerInput);
}

function eqjStateToScene(
    A: typeof Astronomy,
    state: Astronomy.StateVector,
): { position: [number, number, number]; velocity: [number, number, number] } {
    const ecl = A.RotateState(eqjToEclMatrix(A), state);
    return {
        position: eclToScene(ecl.x, ecl.y, ecl.z, KM_PER_AU),
        velocity: eclToScene(ecl.vx, ecl.vy, ecl.vz, KM_PER_AU),
    };
}

export async function computeSceneEphemeris(date: Date = new Date()): Promise<SceneEphemeris | null> {
    let A: typeof Astronomy;
    try {
        A = await loadAstronomy();
    } catch {
        return null;
    }

    try {
        const sunEqj = A.GeoVector(A.Body.Sun, date, false);
        const sunScene = eqjVectorToScene(A, sunEqj, KM_PER_AU);
        const sunLen = Math.hypot(sunScene[0], sunScene[1], sunScene[2]) || 1;
        const sunDirection: [number, number, number] = [
            sunScene[0] / sunLen,
            sunScene[1] / sunLen,
            sunScene[2] / sunLen,
        ];

        const sunScenePosition: [number, number, number] = [
            sunDirection[0] * SUN_DISPLAY_DL,
            sunDirection[1] * SUN_DISPLAY_DL,
            sunDirection[2] * SUN_DISPLAY_DL,
        ];

        const moonState = A.GeoMoonState(date);
        const moonScene = eqjStateToScene(A, moonState);
        const moonScenePosition = moonScene.position;
        const moonDistanceKm = Math.hypot(moonState.x, moonState.y, moonState.z) * KM_PER_AU;

        const p = moonScenePosition;
        const v = moonScene.velocity;
        let nx = p[1] * v[2] - p[2] * v[1];
        let ny = p[2] * v[0] - p[0] * v[2];
        let nz = p[0] * v[1] - p[1] * v[0];
        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;
        const moonOrbitNormal: [number, number, number] = [nx, ny, nz];

        let moonIlluminatedFraction = 0.5;
        try {
            moonIlluminatedFraction = A.Illumination(A.Body.Moon, date).phase_fraction;
        } catch {
            /* keep default */
        }

        const sunEqOfDate = A.Equator(A.Body.Sun, date, new A.Observer(0, 0, 0), true, false);
        const gastHours = A.SiderealTime(date);
        const subsolarLatDeg = sunEqOfDate.dec;
        let subsolarLonDeg = (sunEqOfDate.ra - gastHours) * 15.0;
        subsolarLonDeg = (((subsolarLonDeg + 180) % 360) + 360) % 360 - 180;

        // Heliocentric Earth position (AU, ecliptic J2000). Used by the orbit-solar scene to draw
        // Earth at its real orbital position with honest eccentricity, not a clamped 1 AU circle.
        const earthHelioEqj = A.HelioVector(A.Body.Earth, date);
        const earthHelioEcl = A.RotateVector(eqjToEclMatrix(A), earthHelioEqj);
        const earthHelioPositionAU = { x: earthHelioEcl.x, y: earthHelioEcl.y, z: earthHelioEcl.z };

        return {
            sunDirection,
            sunScenePosition,
            moonScenePosition,
            moonOrbitNormal,
            moonDistanceKm,
            moonIlluminatedFraction,
            subsolarLatDeg,
            subsolarLonDeg,
            earthHelioPositionAU,
        };
    } catch {
        return null;
    }
}

/**
 * The heliocentric layer's linear AU scale: how many scene units one AU of true heliocentric
 * distance maps to. Set equal to SUN_DISPLAY_DL so that 1 AU (the Earth–Sun distance) lands exactly
 * on the drawn Sun — i.e. the Earth-orbit reference of 1 AU closes right back on Earth at the origin.
 *
 * Crucially this is a LINEAR scale, so the orbit's SHAPE is exact: the Sun sits at the true focus of
 * the ellipse, eccentricity/perihelion/aphelion are all faithful. The near-Earth geocentric layer
 * (Moon, close asteroids) is what uses the log compression — the two layers meet at the Sun.
 */
export const ORBIT_AU_SCALE = SUN_DISPLAY_DL;

/**
 * Perifocal (x toward perihelion, y at +90° in the direction of motion) → heliocentric ecliptic
 * J2000, both in AU. Pure function, shared between the orbit-curve builder and the Kepler-equation
 * propagator (lib/keplerOrbit) so the drawn ellipse and the asteroid's "now" point use IDENTICAL
 * orientation — no chance of a drift between the two.
 *
 * Rotation is R_z(Ω) · R_x(i) · R_z(ω) applied to (xp, yp, 0).
 */
export function perifocalToEclipticAU(
    xp: number,
    yp: number,
    inDeg: number,
    omDeg: number,
    wDeg: number,
): { x: number; y: number; z: number } {
    const i = (inDeg * Math.PI) / 180;
    const om = (omDeg * Math.PI) / 180;
    const w = (wDeg * Math.PI) / 180;
    const cosO = Math.cos(om), sinO = Math.sin(om);
    const cosI = Math.cos(i), sinI = Math.sin(i);
    const cosW = Math.cos(w), sinW = Math.sin(w);

    const x = (cosO * cosW - sinO * sinW * cosI) * xp + (-cosO * sinW - sinO * cosW * cosI) * yp;
    const y = (sinO * cosW + cosO * sinW * cosI) * xp + (-sinO * sinW + cosO * cosW * cosI) * yp;
    const z = (sinW * sinI) * xp + (cosW * sinI) * yp;
    return { x, y, z };
}

/**
 * Builds the asteroid's full heliocentric orbit as a closed loop of scene-space points, with the
 * Sun at the scene origin and a LINEAR AU scale (1 AU = ORBIT_AU_SCALE units). Shape-faithful:
 * eccentricity, perihelion and orbital orientation are exact — no log distortion of the curve.
 *
 * Used in the orbit-solar scene alongside lib/keplerOrbit's Kepler propagator. Because both share
 * perifocalToEclipticAU below, the propagated "now" point lies ON the drawn ellipse by construction.
 */
export function buildHeliocentricOrbit(
    elements: {
        ec: number;
        qrAu: number;
        inDeg: number;
        omDeg: number;
        wDeg: number;
    },
    segments = 256,
): Float32Array | null {
    const { ec, qrAu, inDeg, omDeg, wDeg } = elements;
    if (!Number.isFinite(ec) || ec < 0 || ec >= 1) return null;     // bound orbits only
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;          // sane perihelion
    if (!Number.isFinite(inDeg) || !Number.isFinite(omDeg) || !Number.isFinite(wDeg)) return null;

    const a = qrAu / (1 - ec);          // semi-major axis, AU
    const p = a * (1 - ec * ec);        // semi-latus rectum, AU

    const out: number[] = [];
    for (let s = 0; s <= segments; s += 1) {
        const nu = (s / segments) * Math.PI * 2; // true anomaly
        const r = p / (1 + ec * Math.cos(nu));   // AU
        const xp = r * Math.cos(nu);
        const yp = r * Math.sin(nu);

        const ecl = perifocalToEclipticAU(xp, yp, inDeg, omDeg, wDeg);

        // AU → scene (LINEAR, shape-exact); ecliptic (x, y, z) → scene (x, z, y).
        out.push(
            ecl.x * ORBIT_AU_SCALE,
            ecl.z * ORBIT_AU_SCALE,
            ecl.y * ORBIT_AU_SCALE,
        );
    }
    return new Float32Array(out);
}

/**
 * Converts a heliocentric ecliptic position (AU, J2000) into scene units, with the Sun at the
 * scene origin. Identical axis-swap convention as the orbit builder above so they always agree.
 */
export function helioAUToSunCenteredScene(p: { x: number; y: number; z: number }): [number, number, number] {
    return [p.x * ORBIT_AU_SCALE, p.z * ORBIT_AU_SCALE, p.y * ORBIT_AU_SCALE];
}

export { KM_PER_LD, KM_PER_AU };

/**
 * Scientific self-consistency assertions. Pure math, deterministic — call from a dev console or a
 * future test harness. Throws on the first failure so the caller knows exactly which invariant
 * regressed. Does not exercise astronomy-engine: those checks belong in computeSceneEphemeris's
 * integration coverage.
 */
export function runSceneEphemerisAssertions(): void {
    const approx = (actual: number, expected: number, tol: number, label: string): void => {
        if (!(Math.abs(actual - expected) <= tol)) {
            throw new Error(`[sceneEphemeris] ${label}: expected ${expected} ± ${tol}, got ${actual}`);
        }
    };

    // The Moon (1 DL) lands at exactly 1 scene unit by construction of COMPRESS_K.
    approx(compressDistanceDl(1), 1, 1e-9, 'Moon at 1 DL → 1 scene unit');

    // Compression is strictly monotonic on (0, ∞) — half-the-distance is closer than full.
    if (!(compressDistanceDl(0.5) < compressDistanceDl(1))) {
        throw new Error('[sceneEphemeris] compression must be monotonic');
    }
    if (!(compressDistanceDl(10) < compressDistanceDl(100))) {
        throw new Error('[sceneEphemeris] compression must be monotonic at larger radii');
    }

    // Compression preserves direction (only magnitude rescales).
    const v: [number, number, number] = [10, 5, 2];
    const c = compressSceneVector(v);
    const r0 = Math.hypot(...v);
    const r1 = Math.hypot(...c);
    approx(c[0] / r1, v[0] / r0, 1e-12, 'compression preserves x direction');
    approx(c[1] / r1, v[1] / r0, 1e-12, 'compression preserves y direction');
    approx(c[2] / r1, v[2] / r0, 1e-12, 'compression preserves z direction');

    // 1 AU should fold to a clearly larger scene distance than the Moon, but not absurdly so.
    if (!(SUN_DISPLAY_DL > 20 && SUN_DISPLAY_DL < 60)) {
        throw new Error(`[sceneEphemeris] SUN_DISPLAY_DL out of expected band: ${SUN_DISPLAY_DL}`);
    }

    // Perifocal-to-ecliptic with i = Ω = ω = 0: perihelion lies on +x ecliptic.
    const p = perifocalToEclipticAU(1, 0, 0, 0, 0);
    approx(p.x, 1, 1e-12, 'perihelion at i=Ω=ω=0 maps to +x');
    approx(p.y, 0, 1e-12, 'perihelion at i=Ω=ω=0 has y=0');
    approx(p.z, 0, 1e-12, 'perihelion at i=Ω=ω=0 has z=0');

    // Inclination of 90° pushes the +y perifocal axis out of the ecliptic plane (to +z ecliptic).
    const q = perifocalToEclipticAU(0, 1, 90, 0, 0);
    approx(q.x, 0, 1e-12, 'i=90, yp=1 has x=0');
    approx(q.y, 0, 1e-12, 'i=90, yp=1 has y=0');
    approx(q.z, 1, 1e-12, 'i=90, yp=1 maps to +z ecliptic');
}
