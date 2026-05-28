/**
 * Coordinate transformations shared between the geocentric (radar) and heliocentric (orbit) scenes.
 *
 * Conventions:
 * - JPL Horizons returns geocentric ecliptic vectors in km.
 * - Scene axes swap Y ↔ Z so the ecliptic plane sits on XZ (where the DL rings live) and ecliptic
 *   north points along scene +Y (what the camera reads as "up").
 * - "Scene units" in the geocentric layer means "1 unit = 1 DL", further compressed radially via
 *   compressSceneVector (in sceneEphemeris.ts) — direction is preserved, magnitude is rescaled.
 *
 * Everything in this file is pure: same input → same output, no I/O, no DOM.
 */

import type { SunDirection } from '@/types';
import { KM_PER_LD, compressSceneVector } from '@/lib/sceneEphemeris';

/**
 * Transforms a geocentric ecliptic vector (km) into a radar-scene vector (scene units, post log
 * compression). The Y ↔ Z swap aligns the ecliptic plane with the scene XZ plane; the radial log
 * compression keeps direction and inclination honest while folding in the huge gap to the Sun.
 */
export function horizonsToScene(xKm: number, yKm: number, zKm: number): [number, number, number] {
    return compressSceneVector([
        xKm / KM_PER_LD,
        zKm / KM_PER_LD,
        yKm / KM_PER_LD,
    ]);
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
