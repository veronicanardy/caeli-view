/**
 * Coordinate transformations shared between the geocentric (radar) and heliocentric (orbit) scenes.
 *
 * Conventions:
 * - JPL Horizons returns geocentric ecliptic vectors in km.
 * - Scene axes: ecliptic X → scene X, ecliptic Z → scene Y, ecliptic −Y → scene Z.
 *   This puts the ecliptic plane on XZ (where the DL rings live) and ecliptic north along scene +Y.
 * - "Scene units" in the geocentric layer means "1 unit = 1 DL", further compressed radially via
 *   compressSceneVector (in sceneEphemeris.ts) — direction is preserved, magnitude is rescaled.
 *
 * Everything in this file is pure: same input → same output, no I/O, no DOM.
 */

import type { SunDirection } from '@/types';
import { KM_PER_AU, KM_PER_LD, ORBIT_AU_SCALE, compressSceneVector } from '@/lib/sceneEphemeris';

/**
 * Transforms a geocentric ecliptic vector (km) into a radar-scene vector (scene units, post log
 * compression). The Y ↔ Z swap aligns the ecliptic plane with the scene XZ plane; the radial log
 * compression keeps direction and inclination honest while folding in the huge gap to the Sun.
 */
export function horizonsToScene(xKm: number, yKm: number, zKm: number): [number, number, number] {
    return compressSceneVector([
        xKm / KM_PER_LD,
        zKm / KM_PER_LD,
        -yKm / KM_PER_LD,
    ]);
}

/**
 * Transforms a geocentric ecliptic vector (km) into a heliocentric scene position (scene units,
 * post log compression), given the Earth's heliocentric position in AU (ecliptic J2000).
 *
 * Why: applying log compression to a geocentric vector and then adding earthPos (which is itself
 * log-compressed heliocentrically) does NOT produce the correct heliocentric position — the two
 * compressions don't compose linearly. For nearby objects (< ~0.1 AU) the error is negligible,
 * but for belt objects like Ceres or Vesta (2–4 AU geocentric) the asteroid ends up compressed
 * right next to the Sun instead of at its true heliocentric distance.
 *
 * Fix: convert geo (km) → geo (AU) → add earthHelio (AU) → helio (AU) → linear scale matching
 * helioToScene/ORBIT_AU_SCALE so the asteroid lands on the same grid as planet orbits and earthPos.
 */
export function horizonsGeoToHelioScene(
    xKm: number,
    yKm: number,
    zKm: number,
    earthHelioAU: { x: number; y: number; z: number },
): [number, number, number] {
    const helioX = earthHelioAU.x + xKm / KM_PER_AU;
    const helioY = earthHelioAU.y + yKm / KM_PER_AU;
    // Axis convention matches helioToScene in sceneEphemeris.ts (used by planets and earthScenePosition):
    //   ecl.x → scene X,  -ecl.y → scene Z,  ecliptic plane is flat (Y=0 in scene).
    // LINEAR scale (ORBIT_AU_SCALE) so asteroids land on the same scale as the drawn planet orbits.
    return [
        helioX * ORBIT_AU_SCALE,
        0,
        -helioY * ORBIT_AU_SCALE,
    ];
}

/** Returns the input vector rescaled to unit length, or [1, 0, 0] if the input is degenerate. */
export function normalize3(v: [number, number, number]): [number, number, number] {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Converts the backend's 2D ecliptic Sun direction (x, y in the ecliptic plane, z dropped) into
 * the scene's 3D axis convention (ecliptic x/y → scene x/z, ecliptic z → scene y). The geocentric
 * Sun has |z_ecl| ≲ 1e-4, so collapsing it to zero is well within the radar's visual precision —
 * astronomy-engine takes over once it resolves and supplies the full 3D vector anyway.
 */
export function sunDirectionFromIncoming(input: SunDirection): [number, number, number] {
    return normalize3([input.x, 0, input.y]);
}
