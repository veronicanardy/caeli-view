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
// Mantem o zoom-out manual amplo o bastante para contexto de orbitas externas.
export const MAX_CAMERA_DISTANCE = ORBIT_AU_SCALE * 96;

/**
 * Plano near da câmera. A precisão do depth buffer escala com a razão far/near: um near minúsculo
 * (ex.: 0.01) com o far enorme desta cena (Sol/planetas a centenas de unidades no modo linear)
 * concentra quase toda a precisão coladinha na câmera e deixa quase nada para a região da Terra.
 * O resultado é z-fighting entre a superfície e a camada de nuvens (a apenas 1.012× do raio), que
 * aparece como "buracos"/chiado nas nuvens ao mover a câmera. Subir o near recupera essa precisão.
 *
 * Teto de segurança: a câmera mais próxima fica a ~0,13 unidade da superfície da Terra
 * (minDistance = EARTH_RADIUS_DL * 2.2) e ainda mais perto de corpos pequenos em close-up, então
 * 0,04 dá folga para nunca recortar um corpo, melhorando a precisão de profundidade em ~4× sobre 0,01.
 */
export const CAMERA_NEAR = 0.04;

export const CAMERA_VIEWS = {
    /* perspective é calculado dinamicamente pelo CameraRig em coordenadas solares
       (de costas para o Sol, olhando para a Terra). Este valor não é lido. */
    perspective: new THREE.Vector3(0, 0, 0),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;

export type CameraViewKey = keyof typeof CAMERA_VIEWS;
