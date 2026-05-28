/**
 * Kepler-orbit math for propagating an asteroid's instantaneous heliocentric position from its
 * osculating elements. The frontend uses this in the "orbit solar" mode of the 3D radar so that
 * the rendered asteroid lands EXACTLY on the drawn ellipse — by construction.
 *
 * Frame: outputs are in ecliptic J2000 (AU). The same 3-1-3 rotation as buildHeliocentricOrbit is
 * applied (shared via perifocalToEclipticAU), so the propagated point and the orbit curve use the
 * same orientation — no risk of a drift between the two.
 */
import type { OrbitalElements } from '@/types';
import { perifocalToEclipticAU } from '@/lib/sceneEphemeris';

/**
 * Gaussian gravitational constant: k = √(GM_sun) in AU^1.5 / day. Defining GM_sun this way avoids
 * unit-conversion drift between km/s and AU/day. n = k · a^(-3/2) gives the mean motion in rad/day.
 */
export const GAUSS_K = 0.01720209895;
export const GM_SUN_AU3_PER_DAY2 = GAUSS_K * GAUSS_K;

/** Julian Date (UT) from a JS Date — exact, no calendar branches needed past 1970. */
export function julianDayUtc(date: Date): number {
    return date.getTime() / 86_400_000 + 2440587.5;
}

/**
 * Newton iteration on E − e·sin(E) = M. Six iterations land below machine epsilon for any e < 1
 * we'll see from Horizons (NEOs sit at e ≲ 0.9). Seed with M, which is already the right ballpark.
 */
export function solveKeplerEquation(meanAnomaly: number, eccentricity: number, iterations = 6): number {
    let E = meanAnomaly;
    for (let k = 0; k < iterations; k += 1) {
        const delta = (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
        E -= delta;
    }
    return E;
}

export type HelioPositionAU = { x: number; y: number; z: number };

/**
 * Heliocentric ecliptic-J2000 position (AU) of an object at `date`, from its osculating elements.
 *
 * Returns null when the elements can't anchor a position in time:
 *  - non-elliptical (e ≥ 1), zero/negative perihelion, missing tpJd, etc.
 * The orbit *shape* can still be drawn in those cases (see buildHeliocentricOrbit), but we refuse
 * to place a fake "current" point when we don't have the perihelion epoch.
 */
export function heliocentricPositionAU(
    elements: OrbitalElements,
    date: Date = new Date(),
): HelioPositionAU | null {
    const { ec, qrAu, inDeg, omDeg, wDeg, tpJd } = elements;
    if (!Number.isFinite(ec) || !(ec >= 0 && ec < 1)) return null;
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;
    if (!Number.isFinite(tpJd) || tpJd === 0) return null;

    const a = qrAu / (1 - ec);
    if (!(a > 0) || !Number.isFinite(a)) return null;

    const n = Math.sqrt(GM_SUN_AU3_PER_DAY2 / (a * a * a));
    const M = n * (julianDayUtc(date) - tpJd);
    const E = solveKeplerEquation(M, ec);

    // Perifocal frame: x toward perihelion, y at +90° in the direction of motion.
    const xp = a * (Math.cos(E) - ec);
    const yp = a * Math.sqrt(1 - ec * ec) * Math.sin(E);

    return perifocalToEclipticAU(xp, yp, inDeg, omDeg, wDeg);
}

/**
 * A short arc of heliocentric positions (AU) around an anchor date — `pastDays` before to
 * `futureDays` after, sampled at `samples` points. Same Kepler propagation as the single-position
 * helper, so every point lies on the orbit by construction.
 *
 * Use for visualising "where the object is heading on its orbit over the next N days" in the
 * Sun-centred view — semantically distinct from the geocentric ±h trajectory shown in radar mode.
 *
 * Returns null when the elements can't anchor positions in time.
 */
export function heliocentricArcAU(
    elements: OrbitalElements,
    anchor: Date = new Date(),
    pastDays = 30,
    futureDays = 60,
    samples = 96,
): HelioPositionAU[] | null {
    const { ec, qrAu, inDeg, omDeg, wDeg, tpJd } = elements;
    if (!Number.isFinite(ec) || !(ec >= 0 && ec < 1)) return null;
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;
    if (!Number.isFinite(tpJd) || tpJd === 0) return null;

    const a = qrAu / (1 - ec);
    if (!(a > 0) || !Number.isFinite(a)) return null;

    const n = Math.sqrt(GM_SUN_AU3_PER_DAY2 / (a * a * a));
    const sqrt1me2 = Math.sqrt(1 - ec * ec);
    const anchorJd = julianDayUtc(anchor);
    const totalDays = pastDays + futureDays;
    if (samples < 2 || totalDays <= 0) return null;

    const points: HelioPositionAU[] = [];
    for (let i = 0; i <= samples; i += 1) {
        const t = -pastDays + (totalDays * i) / samples;
        const M = n * (anchorJd + t - tpJd);
        const E = solveKeplerEquation(M, ec);
        const xp = a * (Math.cos(E) - ec);
        const yp = a * sqrt1me2 * Math.sin(E);
        points.push(perifocalToEclipticAU(xp, yp, inDeg, omDeg, wDeg));
    }
    return points;
}

/**
 * Scientific self-consistency assertions for the Kepler layer. Pure math, no I/O. Throws on the
 * first failure. The orbit-mode promise is that the propagated asteroid lies ON the drawn ellipse:
 * these checks enforce that, plus rejection of non-elliptical inputs and a perihelion sanity test.
 */
export function runKeplerOrbitAssertions(): void {
    const approx = (actual: number, expected: number, tol: number, label: string): void => {
        if (!(Math.abs(actual - expected) <= tol)) {
            throw new Error(`[keplerOrbit] ${label}: expected ${expected} ± ${tol}, got ${actual}`);
        }
    };

    // Newton's method on E - e sin E = M converges to a fixed point: f(E) - M ≈ 0.
    const E1 = solveKeplerEquation(1.2, 0.5);
    approx(E1 - 0.5 * Math.sin(E1) - 1.2, 0, 1e-12, 'Kepler equation residual @ M=1.2, e=0.5');

    const E2 = solveKeplerEquation(0.1, 0.9);
    approx(E2 - 0.9 * Math.sin(E2) - 0.1, 0, 1e-12, 'Kepler equation residual @ M=0.1, e=0.9');

    // At perihelion (M = 0 → E = 0) the heliocentric radius equals q.
    const tpJd = julianDayUtc(new Date());
    const els = { ec: 0.5, qrAu: 1.0, inDeg: 0, omDeg: 0, wDeg: 0, tpJd, epochJd: tpJd } as OrbitalElements;
    const p = heliocentricPositionAU(els, new Date());
    if (!p) throw new Error('[keplerOrbit] perihelion sanity returned null');
    approx(Math.hypot(p.x, p.y, p.z), 1.0, 1e-9, 'asteroid at M=0 lies at perihelion radius q');

    // Hyperbolic orbits (e ≥ 1) are rejected — we refuse to propagate unbound trajectories.
    const hyp = { ec: 1.2, qrAu: 1, inDeg: 0, omDeg: 0, wDeg: 0, tpJd, epochJd: tpJd } as OrbitalElements;
    if (heliocentricPositionAU(hyp, new Date()) !== null) {
        throw new Error('[keplerOrbit] must reject hyperbolic e ≥ 1');
    }

    // Zero-perihelion is rejected.
    const degenerate = { ec: 0.5, qrAu: 0, inDeg: 0, omDeg: 0, wDeg: 0, tpJd, epochJd: tpJd } as OrbitalElements;
    if (heliocentricPositionAU(degenerate, new Date()) !== null) {
        throw new Error('[keplerOrbit] must reject q ≤ 0');
    }

    // Missing perihelion epoch (tpJd = 0) is rejected — we never invent a position.
    const noTp = { ec: 0.5, qrAu: 1, inDeg: 0, omDeg: 0, wDeg: 0, tpJd: 0, epochJd: 0 } as OrbitalElements;
    if (heliocentricPositionAU(noTp, new Date()) !== null) {
        throw new Error('[keplerOrbit] must reject tpJd = 0');
    }
}
