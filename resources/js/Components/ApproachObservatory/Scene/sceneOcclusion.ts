/**
 * Oclusores geométricos da cena 3D.
 *
 * Responsabilidade: montar volumes simples usados para esconder labels atrás de
 * corpos visuais. A função recebe posições já resolvidas e não calcula efeméride
 * nem decide foco, seleção ou modo orbital.
 */

import * as THREE from 'three';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { JUPITER, MARS, MERCURY, NEPTUNE, SATURN, URANUS, VENUS } from '@/lib/observatory/planetData';
import type { SceneObjectOccluder } from '../Overlays/SceneLabels';
import { SUN_RADIUS_SCENE } from './sceneBodyConstants';
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
