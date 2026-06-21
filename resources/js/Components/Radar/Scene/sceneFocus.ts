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
import { LINEAR_AU_SCALE } from '@/lib/sceneEphemeris';
import { knownCometById, knownCometScenePosition } from '../Bodies/Comet/knownComets';
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
 * em que os NEOs são desenhados (currentPositionInHelioScene). Alimenta o occluder de labels e o alvo
 * da câmera, que precisam do centro do corpo no espaço-mundo.
 *
 * Fallback Kepler: quando o objeto é um cometa famoso SEM posição do Horizons (ex.: Halley, hoje a ~36 UA
 * no afélio, que o feed não resolve), usa a posição calculada pela órbita local (knownCometScenePosition),
 * a MESMA que o KnownCometsLayer desenha. Sem isso o cometa aparecia na cena mas a câmera não tinha alvo
 * (ficava "indisponível"/inalcançável) por depender só do ponto do Horizons.
 */
export function focusedObjectScenePosition(
    focusedObject: ClosestNowObject | null,
    earthHelioAU: EarthHelioAU | null,
): SceneVector | null {
    if (!focusedObject) return null;
    if (earthHelioAU) {
        const helioPoint = currentPositionInHelioScene(focusedObject, earthHelioAU);
        if (helioPoint) return helioPoint;
    }
    // Sem ponto do Horizons: se for cometa famoso, cai na posição Kepler local (régua dos planetas).
    const comet = knownCometById(focusedObject.approach.id);
    if (comet) {
        return knownCometScenePosition(comet, new Date(), LINEAR_AU_SCALE);
    }
    return null;
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
