/**
 * Constantes de câmera da cena 3D.
 *
 * Responsabilidade: manter FOV, distância máxima e presets de câmera em um único
 * ponto para evitar divergência entre Canvas, rig e helpers de enquadramento.
 */

import * as THREE from 'three';
import { LINEAR_AU_SCALE } from '@/lib/sceneEphemeris';

/**
 * Constantes compartilhadas do enquadramento da câmera da cena 3D.
 */
export const CAMERA_FOV_DEG = 42;
// Zoom-out máximo. Precisa cobrir cometas famosos distantes: o Halley fica a ~36 UA no afélio (alvo da
// câmera a ~10.800 unidades da origem) e o zoom é medido A PARTIR do alvo, então o teto tem de ter folga
// MUITO acima de 36 UA, senão a rotação/zoom em torno do Halley bate no limite e trava por ângulo. 200 UA
// dá folga ampla sobre o afélio de Halley sem perder o contexto das órbitas internas.
export const MAX_CAMERA_DISTANCE = LINEAR_AU_SCALE * 200;

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
 * Distância mínima de zoom (dolly) ÚNICA: o quão perto a câmera pode colar em QUALQUER alvo.
 *
 * Decisão de produto (Verônica): o zoom máximo (chegar mais perto) é o MESMO para todo mundo, igual ao
 * das rochas/famosas. ROCK_MIN_DISTANCE fica logo acima do CAMERA_NEAR (0.07), o máximo que a câmera cola
 * SEM o corpo recortar no plano near. Antes havia pisos diferentes (Terra 0.242, gelo 0.65) que impediam
 * aproximar planetas e Terra como nas rochas; foram removidos para uniformizar.
 *
 * 0.072 (era 0.08): a rocha comum é minúscula (raio simbólico 0.003 a 0.012 DL), então no piso anterior
 * o zoom batia no limite com a rocha ainda pequena e parecia "travado". Colando o piso quase no near
 * (0.07), a câmera chega o mais perto fisicamente possível. Este é o PISO BASE (rocha de raio ~0); para um
 * corpo de raio não-desprezível, resolveMinZoomDistance empurra o piso para `near + raio + folga`, senão a
 * FACE do corpo fura o near antes de a câmera bater no piso (a câmera para a `piso` do CENTRO, e a face
 * está `raio` mais perto). A folga de 0.002 sobre o near absorve o epsilon do dolly.
 */
export const ROCK_MIN_DISTANCE = 0.072;

/**
 * Multiplicador de foco ÚNICO de TODO corpo (Sol, planetas, Terra, Lua, rochas, cometas, naves).
 *
 * Decisão de produto (Verônica): todo corpo focado deve ocupar a MESMA fração da tela. A fração que
 * uma esfera de raio `r` ocupa é aproximadamente `r / distância`; como o enquadramento padrão coloca
 * a câmera a `distância = r × MULTIPLICADOR` (ver framingForBody), a fração resultante é
 * `≈ 1 / MULTIPLICADOR` — INDEPENDENTE do tamanho do corpo. Logo, um único multiplicador compartilhado
 * iguala a fração de Júpiter, da Lua e de Bennu. É a "folga" visual em volta do corpo; aumentar afasta
 * a câmera (corpo menor na tela), diminuir aproxima (chegada mais colada para TODOS de uma vez). Único
 * número estético do foco, calibrado por screenshot. As ÚNICAS exceções nomeadas são o panorama dos
 * famosos (recuo proposital para caber a régua inteira) e a Juno (close-up com Júpiter ao fundo);
 * ambas documentadas no call site.
 */
export const BODY_FOCUS_MULTIPLIER = 12;

/**
 * Piso de zoom da cena: o quão perto a câmera pode colar no alvo. Chegar perto é igual para todo corpo
 * (decisão da Verônica), mas o piso PRECISA contar o raio do corpo selecionado, senão um corpo de raio
 * não-desprezível fura o near plane antes de a câmera bater no piso.
 *
 * O motivo: a câmera para a `piso` do CENTRO do corpo, mas a FACE frontal fica a `piso − raio` da câmera.
 * Com um piso fixo (ROCK_MIN_DISTANCE), uma rocha de raio 0,012 (desconhecida) ou 0,026 (Ceres/Vesta)
 * tinha a face a `0,072 − raio`, abaixo do CAMERA_NEAR (0,07), então recortava no plano near ("furava")
 * cedo demais. Somando o raio ao piso (`ROCK_MIN_DISTANCE + raio`), a FACE para sempre exatamente a
 * ROCK_MIN_DISTANCE da câmera — a mesma folga segura sobre o near — qualquer que seja o tamanho do corpo.
 * Sem corpo colável (raio omitido/0) o piso é o ROCK_MIN_DISTANCE de sempre.
 *
 * @param bodyRadius raio VISUAL (DL) do corpo selecionado; omitido = sem corpo colável (navegação livre).
 */
export function resolveMinZoomDistance(bodyRadius = 0): number {
    return ROCK_MIN_DISTANCE + Math.max(0, bodyRadius);
}

export const CAMERA_VIEWS = {
    /* perspective é calculado dinamicamente pelo CameraRig em coordenadas solares
       (de costas para o Sol, olhando para a Terra). Este valor não é lido. */
    perspective: new THREE.Vector3(0, 0, 0),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;

export type CameraViewKey = keyof typeof CAMERA_VIEWS;
