/**
 * Constantes de câmera da cena 3D.
 *
 * Responsabilidade: manter FOV, distância máxima e presets de câmera em um único
 * ponto para evitar divergência entre Canvas, rig e helpers de enquadramento.
 */

import * as THREE from 'three';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';

/**
 * Constantes compartilhadas do enquadramento da câmera da cena 3D.
 */
export const CAMERA_FOV_DEG = 42;
export const MAX_CAMERA_DISTANCE = ORBIT_AU_SCALE * 40;

export const CAMERA_VIEWS = {
    /* perspective é calculado dinamicamente pelo CameraRig em coordenadas solares
       (de costas para o Sol, olhando para a Terra). Este valor não é lido. */
    perspective: new THREE.Vector3(0, 0, 0),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;

export type CameraViewKey = keyof typeof CAMERA_VIEWS;
