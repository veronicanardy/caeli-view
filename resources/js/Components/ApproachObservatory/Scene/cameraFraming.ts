/**
 * Helpers puros de enquadramento de câmera.
 *
 * Responsabilidade: calcular posição e alvo para foco em corpos, overview e
 * objetos selecionados. Não toca OrbitControls nem executa transições.
 */

import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { buildHeliocentricOrbit, helioAUToSunCenteredScene, ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { currentPositionInScene } from '@/lib/observatory/trajectorySampling';
import type { EarthHelioAU } from '@/lib/observatory/trajectorySampling';
import { CAMERA_FOV_DEG, CAMERA_VIEWS, MAX_CAMERA_DISTANCE } from './cameraConstants';

/**
 * Helpers puros de enquadramento para câmera, sem tocar nos controles da cena.
 */
export type FocusFraming = {
    /** Ponto para onde a câmera deve olhar. */
    target: THREE.Vector3;
    /** Posição onde a câmera deve ficar. */
    position: THREE.Vector3;
    /** Sugere ao rig como transitar até o enquadramento. */
    transition?: 'default' | 'preserve_heading';
};

/**
 * Monta um enquadramento de câmera centrado em um corpo celeste (Terra ou Lua) na posição de
 * cena `center` com raio visual `radius`. Usado pelo atalho de clique na Terra/Lua. Recua ao
 * longo de um ângulo 3/4 suave longe o suficiente para ver o corpo confortavelmente sem cortá-lo.
 */
export function framingForBody(center: THREE.Vector3, radius: number): FocusFraming {
    const dir = new THREE.Vector3(0.4, 0.45, 0.8).normalize();
    const distance = Math.max(radius * 20, 0.2);
    return { target: center.clone(), position: center.clone().add(dir.multiplyScalar(distance)), transition: 'default' };
}

export function framingForOverview(): FocusFraming {
    return { target: new THREE.Vector3(0, 0, 0), position: CAMERA_VIEWS.perspective.clone(), transition: 'default' };
}

/**
 * Enquadramento de câmera para um asteroide selecionado.
 *   - orbitMode = false: close-up geocêntrico na rocha, cena de radar com escala logarítmica.
 *   - orbitMode = true: enquadra a órbita Kepleriana completa ao redor do Sol na cena heliocêntrica.
 */
export function computeFocusFraming(
    object: ClosestNowObject,
    orbitMode = false,
    earthHelioPositionAU: EarthHelioAU | null = null,
    earthScenePosition: [number, number, number] = [0, 0, 0],
): FocusFraming | null {
    if (orbitMode && object.trajectory?.orbitalElements) {
        const elements = object.trajectory.orbitalElements;
        const orbitPoints = buildHeliocentricOrbit(elements, 256);
        if (orbitPoints) {
            const box = new THREE.Box3();
            for (let i = 0; i < orbitPoints.length; i += 3) {
                box.expandByPoint(new THREE.Vector3(orbitPoints[i], orbitPoints[i + 1], orbitPoints[i + 2]));
            }

            // Sol (origem) e Terra (~1 UA) são âncoras de cena na camada heliocêntrica.
            box.expandByPoint(new THREE.Vector3(0, 0, 0));
            if (earthHelioPositionAU) {
                const earth = helioAUToSunCenteredScene(earthHelioPositionAU);
                box.expandByPoint(new THREE.Vector3(earth[0], earth[1], earth[2]));
            }
            // Posição atual do asteroide: normalmente já está sobre a elipse, mas é incluída
            // explicitamente para que o enquadramento não a perca em elementos degenerados.
            const asteroidHelio = heliocentricPositionAU(elements, new Date());
            if (asteroidHelio) {
                const a = helioAUToSunCenteredScene(asteroidHelio);
                box.expandByPoint(new THREE.Vector3(a[0], a[1], a[2]));
            }

            const sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV_DEG);
            const distance = THREE.MathUtils.clamp(
                (sphere.radius / Math.sin(fovRad * 0.5)) * 1.12,
                ORBIT_AU_SCALE * 1.2,
                MAX_CAMERA_DISTANCE,
            );
            const dir = new THREE.Vector3(0.32, 0.72, 0.62).normalize();
            return { target: sphere.center, position: sphere.center.clone().add(dir.multiplyScalar(distance)), transition: 'default' };
        }

        // Elementos rejeitados pelo construtor de órbita. Cai para o close-up para mostrar algo.
    }

    // Close-up na rocha: posição geocêntrica log-comprimida offsetada pela Terra na cena.
    const geoPos = currentPositionInScene(object);
    if (!geoPos) return null;
    const target = new THREE.Vector3(
        earthScenePosition[0] + geoPos[0],
        earthScenePosition[1] + geoPos[1],
        earthScenePosition[2] + geoPos[2],
    );
    const distance = 2.1;
    const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
    const position = target.clone().add(dir.multiplyScalar(distance));
    return { target, position, transition: 'preserve_heading' };
}
