/**
 * Helpers tying the abstract Sun direction (unit vector, scene axes) to concrete scene-space
 * positions used by the geocentric radar layer.
 */

import * as THREE from 'three';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';

/**
 * Earth orbit reference position drawn around the displayed Sun (at SUN_DISPLAY_DL, the
 * compressed 1 AU distance). The Sun is projected onto the ecliptic plane (scene XZ) so the
 * reference ring stays flat. Falls back to +X if the direction is degenerately small.
 */
export function sunEclipticDisplayPosition(sunDirection: [number, number, number]): THREE.Vector3 {
    const planar = new THREE.Vector3(sunDirection[0], 0, sunDirection[2]);
    if (planar.lengthSq() < 1e-6) return new THREE.Vector3(SUN_DISPLAY_DL, 0, 0);
    return planar.normalize().multiplyScalar(SUN_DISPLAY_DL);
}
