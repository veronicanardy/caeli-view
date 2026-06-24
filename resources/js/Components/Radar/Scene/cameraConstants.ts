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
// Zoom-out máximo. Precisa cobrir cometas famosos distantes: o Halley fica a ~36 UA no afélio (alvo da
// câmera a ~10.800 unidades da origem) e o zoom é medido A PARTIR do alvo, então o teto tem de ter folga
// MUITO acima de 36 UA, senão a rotação/zoom em torno do Halley bate no limite e trava por ângulo. 200 UA
// dá folga ampla sobre o afélio de Halley sem perder o contexto das órbitas internas.
export const MAX_CAMERA_DISTANCE = ORBIT_AU_SCALE * 200;

/**
 * Plano near da câmera. A precisão do depth buffer escala com a razão far/near: um near minúsculo
 * (ex.: 0.01) com o far enorme desta cena (Sol/planetas a centenas de unidades no modo linear)
 * concentra quase toda a precisão coladinha na câmera e deixa quase nada para a região da Terra.
 * O resultado é z-fighting entre a superfície e a camada de nuvens (a apenas 1.012× do raio), que
 * aparece como "buracos"/chiado nas nuvens ao mover a câmera. Subir o near recupera essa precisão.
 *
 * Teto de segurança: a câmera mais próxima fica a ~0,13 unidade da superfície da Terra
 * (minDistance = EARTH_RADIUS_DL * 2.2) e ainda mais perto de corpos pequenos em close-up, então
 * 0,07 dá folga para nunca recortar um corpo. Subido de 0,04 ao ampliar MAX_CAMERA_DISTANCE (far cresceu
 * junto): a precisão do depth escala com far/near, então o near sobe pra não reintroduzir z-fighting nas
 * nuvens da Terra agora que o far é maior (para enquadrar cometas distantes como o Halley).
 */
export const CAMERA_NEAR = 0.07;

/**
 * Distância mínima de zoom (dolly) da câmera ao alvo, em duas calibrações:
 *
 *  - EARTH_MIN_DISTANCE: piso quando navegando o sistema / focando a Terra. Mantém a câmera acima do
 *    brilho da Terra para não mergulhar nela (EARTH_RADIUS_DL * 2.2 ≈ 0.242).
 *  - ROCK_MIN_DISTANCE: piso quando uma ROCHA está selecionada (close-up). As rochas são minúsculas
 *    (raio ~0.003 a ~0.026); o piso da Terra (0.242) deixaria a câmera longe demais — a pequena ficava
 *    a dezenas de raios na tela. Aqui o piso cai para logo acima do CAMERA_NEAR (0.07), o máximo que a
 *    câmera cola SEM o corpo recortar no plano near. Ceres (grande) já enquadrava bem; este piso resolve
 *    as pequenas (Itokawa, Bennu) sem afetar as grandes, que param antes no seu close-up proporcional.
 */
export const EARTH_MIN_DISTANCE = 0.11 * 2.2;
export const ROCK_MIN_DISTANCE = 0.08;

export const CAMERA_VIEWS = {
    /* perspective é calculado dinamicamente pelo CameraRig em coordenadas solares
       (de costas para o Sol, olhando para a Terra). Este valor não é lido. */
    perspective: new THREE.Vector3(0, 0, 0),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;

export type CameraViewKey = keyof typeof CAMERA_VIEWS;
