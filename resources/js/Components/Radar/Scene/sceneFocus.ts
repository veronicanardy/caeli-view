/**
 * Regras locais de foco, labels e oclusão da cena.
 *
 * Responsabilidade: decidir visibilidade de labels e oclusores a partir de
 * estado já recebido. Não busca dados nem altera seleção.
 */

import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { currentPositionInHelioScene } from '@/lib/radar/trajectorySampling';
import type { EarthHelioAU } from '@/lib/radar/trajectorySampling';
import type { LabelOccluder } from '../Overlays/SceneLabels';
import type { FocusFraming } from './cameraFraming';
import type { SceneVector } from './scenePositions';

/**
 * Regras locais de foco visual, labels e oclusão dentro da cena 3D.
 */
export type BodyFocus = { body: 'earth' | 'moon'; framing: FocusFraming; nonce: number };

/**
 * Decide se o nome de um objeto deve ser montado em cena.
 *
 * É só o portão grosso (toggle global de labels e o modo "só órbitas"): o amontoamento por zoom
 * NÃO é tratado aqui. Quem decide se uma rocha específica some por estar numa pilha é o resolvedor
 * central (resolveRadarLabels, regra de densidade local), que precisa receber a label montada para
 * poder medir os vizinhos. Cortar aqui por distância esconderia rochas isoladas que deviam aparecer.
 */
export function shouldShowLabelForObject({
    id,
    selectedId,
    showLabels,
    orbitLabelsOnly,
}: {
    id: string;
    selectedId: string | null;
    showLabels: boolean;
    orbitLabelsOnly: boolean;
}) {
    if (!showLabels) return false;
    if (id === selectedId) return !orbitLabelsOnly;
    return !orbitLabelsOnly;
}

/**
 * Posição de cena ABSOLUTA do objeto focado, na régua heliocêntrica linear (Sol na origem) — a mesma
 * em que os NEOs são desenhados (currentPositionInHelioScene). Alimenta o occluder de labels, que
 * precisa do centro do corpo no espaço-mundo. Retorna null quando falta o objeto ou a posição
 * heliocêntrica da Terra (efeméride ainda não resolvida).
 */
export function focusedObjectScenePosition(
    focusedObject: ClosestNowObject | null,
    earthHelioAU: EarthHelioAU | null,
): SceneVector | null {
    if (!focusedObject || !earthHelioAU) return null;
    return currentPositionInHelioScene(focusedObject, earthHelioAU);
}

export function computeLabelOccluder({
    bodyFocus,
    earthPos,
    moonPos,
    focusedObjectPosition,
}: {
    bodyFocus: BodyFocus | null;
    earthPos: SceneVector;
    moonPos: SceneVector;
    focusedObjectPosition: SceneVector | null;
}): LabelOccluder {
    if (bodyFocus?.body === 'earth') {
        return { center: new THREE.Vector3(...earthPos), radius: EARTH_RADIUS_DL * 1.35 };
    }

    if (bodyFocus?.body === 'moon') {
        return { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL * 1.9 };
    }

    return focusedObjectPosition
        ? { center: new THREE.Vector3(...focusedObjectPosition), radius: 0.18 }
        : null;
}
