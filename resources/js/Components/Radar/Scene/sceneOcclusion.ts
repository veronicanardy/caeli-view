/**
 * Oclusores geométricos da cena 3D.
 *
 * Responsabilidade: montar volumes simples usados para esconder labels atrás de
 * corpos visuais. A função recebe posições já resolvidas e não calcula efeméride
 * nem decide foco, seleção ou modo orbital.
 */

import * as THREE from 'three';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { JUPITER, MARS, MERCURY, NEPTUNE, SATURN, URANUS, VENUS } from '@/lib/radar/planetData';
import type { SceneObjectOccluder } from '../Overlays/SceneLabels';
import { SUN_RADIUS_SCENE } from '../Bodies/bodyRenderConstants';
import type { PlanetScenePositions, SceneVector } from './scenePositions';

type SceneObjectOccluderInput = {
    useHelioScene: boolean;
    earthPos: SceneVector;
    moonPos: SceneVector;
    planetPositions: PlanetScenePositions;
};

const PLANET_OCCLUDER_RADII = {
    mercuryPos: MERCURY.visualRadiusDl,
    venusPos: VENUS.visualRadiusDl,
    marsPos: MARS.visualRadiusDl,
    jupiterPos: JUPITER.visualRadiusDl,
    // 2.3× cobre o raio EXTERNO dos anéis de Saturno, que se estendem bem além do disco e também
    // ocultam corpos atrás deles. O raio do disco sozinho subestimaria a área de oclusão real.
    saturnPos: SATURN.visualRadiusDl * 2.3,
    uranusPos: URANUS.visualRadiusDl,
    neptunePos: NEPTUNE.visualRadiusDl,
} as const satisfies Record<keyof PlanetScenePositions, number>;

export function computeSceneObjectOccluders({
    useHelioScene,
    earthPos,
    moonPos,
    planetPositions,
}: SceneObjectOccluderInput): SceneObjectOccluder[] {
    const sunOccluder = { center: new THREE.Vector3(0, 0, 0), radius: SUN_RADIUS_SCENE };

    if (useHelioScene) {
        return [sunOccluder];
    }

    const planetOccluders = Object.entries(planetPositions)
        .flatMap(([key, position]) => {
            if (!position) return [];

            return [{
                center: new THREE.Vector3(...position),
                radius: PLANET_OCCLUDER_RADII[key as keyof PlanetScenePositions],
            }];
        });

    return [
        sunOccluder,
        { center: new THREE.Vector3(...earthPos), radius: EARTH_RADIUS_DL },
        { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL },
        ...planetOccluders,
    ];
}

/** Retângulo em pixels de tela (origem no canto superior esquerdo). */
export type RectPx = { left: number; top: number; right: number; bottom: number };

/**
 * Decide se um corpo projetado (círculo de raio `radiusPx` centrado em `cx,cy`) sobrepõe o
 * retângulo de um label, com folga `paddingPx`.
 *
 * É o núcleo geométrico do teste de oclusão por corpos rodado por frame em SceneLabels: encontra
 * o ponto do retângulo mais próximo do centro do círculo e compara a distância com `radiusPx +
 * paddingPx`. Mantido puro aqui (sem câmera, sem DOM) para ser testável e reutilizável. Corpos com
 * raio projetado abaixo de `minRadiusPx` são pequenos demais para esconder um label e não ocluem.
 */
export function circleOverlapsRect(
    cx: number,
    cy: number,
    radiusPx: number,
    rect: RectPx,
    paddingPx: number,
    minRadiusPx: number,
): boolean {
    if (radiusPx < minRadiusPx) return false;
    const nearestX = Math.max(rect.left, Math.min(cx, rect.right));
    const nearestY = Math.max(rect.top, Math.min(cy, rect.bottom));
    return Math.hypot(cx - nearestX, cy - nearestY) < radiusPx + paddingPx;
}

/**
 * Decide se um label deve sumir por estar dentro da silhueta projetada do corpo em foco.
 *
 * O raio de esconder cresce com o corpo (`bodyRadiusPx + bodyPaddingPx`) mas nunca cai abaixo de
 * `minRadiusPx`, garantindo uma zona limpa mesmo quando o corpo é pequeno na tela. Puro: recebe
 * pixels já projetados, sem câmera nem DOM.
 */
export function labelHiddenByFocusCircle(
    labelX: number,
    labelY: number,
    centerX: number,
    centerY: number,
    bodyRadiusPx: number,
    minRadiusPx: number,
    bodyPaddingPx: number,
): boolean {
    const hideRadiusPx = Math.max(minRadiusPx, bodyRadiusPx + bodyPaddingPx);
    return Math.hypot(labelX - centerX, labelY - centerY) < hideRadiusPx;
}
