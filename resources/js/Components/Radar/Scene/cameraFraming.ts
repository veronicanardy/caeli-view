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
import { currentPositionInHelioScene, currentPositionInScene } from '@/lib/radar/trajectorySampling';
import type { EarthHelioAU } from '@/lib/radar/trajectorySampling';
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
 * Monta um enquadramento de câmera centrado em um corpo celeste na posição de cena `center`
 * com raio visual `radius`. Aceita:
 * - `preferredDir`: direção preferencial de câmera (ex: Terra→Sol para focar o lado diurno).
 * - `distanceMultiplier`: substitui o multiplicador padrão (20×) — útil para afastar mais
 *   a câmera de corpos que dominam demais o campo de visão (ex: Sol no mobile).
 */
export function framingForBody(
    center: THREE.Vector3,
    radius: number,
    preferredDir?: THREE.Vector3,
    distanceMultiplier?: number,
): FocusFraming {
    const dir = preferredDir
        ? preferredDir.clone().normalize()
        : new THREE.Vector3(0.4, 0.45, 0.8).normalize();
    const multiplier = distanceMultiplier ?? 20;
    const distance = Math.max(radius * multiplier, 0.2);
    return { target: center.clone(), position: center.clone().add(dir.multiplyScalar(distance)), transition: 'default' };
}

export function framingForOverview(): FocusFraming {
    return { target: new THREE.Vector3(0, 0, 0), position: CAMERA_VIEWS.perspective.clone(), transition: 'default' };
}

/** Quanto a seta de direção avança além da rocha (comprimento do cone + folga). */
const TRAJECTORY_ARROW_LEAD = 0.3;

/** Viés do alvo na direção da rocha: 0 = centro geométrico, 1 = a própria rocha. */
const TRAJECTORY_TARGET_ROCK_BIAS = 0.3;

/**
 * Enquadramento do zoom out de trajetória: encaixa confortavelmente o trecho da
 * seta de direção até o marcador −72h no campo de visão visível.
 *
 * Decisões:
 *  - o alvo é o centro do trecho puxado em direção à rocha (a protagonista
 *    continua perto do centro sem perder as pontas do quadro);
 *  - a direção de câmera parte do heading atual, mas é corrigida quando está
 *    quase paralela à trajetória — vista de topo a linha viraria um ponto;
 *  - a distância encaixa a esfera envolvente no menor ângulo visível do frustum,
 *    descontando a área coberta por painéis (frações visíveis < 1).
 */
export function framingForTrajectorySegment({
    points,
    rockPosition,
    currentCameraPosition,
    fovDeg = CAMERA_FOV_DEG,
    aspect = 1,
    visibleWidthFraction = 1,
    visibleHeightFraction = 1,
}: {
    /** Pontos absolutos (cena) do trecho a enquadrar; a rocha pode ou não estar incluída. */
    points: THREE.Vector3[];
    rockPosition: THREE.Vector3;
    currentCameraPosition: THREE.Vector3;
    fovDeg?: number;
    /** Largura/altura do canvas. */
    aspect?: number;
    /** Fração da largura livre de painéis (1 − biasX). */
    visibleWidthFraction?: number;
    /** Fração da altura livre de painéis (1 − biasY). */
    visibleHeightFraction?: number;
}): FocusFraming {
    // Sem trecho útil: recuo simples mantendo o heading, centrado na rocha.
    if (points.length < 2) {
        const dir = currentCameraPosition.clone().sub(rockPosition);
        const fallbackDir = dir.lengthSq() > 1e-8 ? dir.normalize() : new THREE.Vector3(0.4, 0.45, 0.8).normalize();
        return {
            target: rockPosition.clone(),
            position: rockPosition.clone().add(fallbackDir.multiplyScalar(3)),
            transition: 'default',
        };
    }

    // A seta de direção se projeta além da rocha: estende o trecho na direção do movimento.
    const framed = [...points, rockPosition];
    const lastBeforeRock = points[points.length - 1];
    const motion = rockPosition.clone().sub(lastBeforeRock);
    if (motion.lengthSq() > 1e-10) {
        framed.push(rockPosition.clone().add(motion.normalize().multiplyScalar(TRAJECTORY_ARROW_LEAD)));
    }

    // Corda principal do trecho: da rocha ao ponto mais distante dela.
    let farthest = framed[0];
    let farthestDistSq = 0;
    for (const point of framed) {
        const d = point.distanceToSquared(rockPosition);
        if (d > farthestDistSq) { farthestDistSq = d; farthest = point; }
    }
    const chordDir = rockPosition.clone().sub(farthest);
    if (chordDir.lengthSq() > 1e-10) chordDir.normalize();

    // Alvo: centro envolvente puxado em direção à rocha.
    const box = new THREE.Box3().setFromPoints(framed);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const target = sphere.center.clone().lerp(rockPosition, TRAJECTORY_TARGET_ROCK_BIAS);
    let radius = 0;
    for (const point of framed) radius = Math.max(radius, point.distanceTo(target));

    // Direção de câmera: heading atual, corrigido se quase paralelo à corda.
    let viewDir = currentCameraPosition.clone().sub(target);
    if (viewDir.lengthSq() < 1e-8) viewDir = new THREE.Vector3(0.4, 0.45, 0.8);
    viewDir.normalize();
    const perpendicular = viewDir.clone().addScaledVector(chordDir, -viewDir.dot(chordDir));
    if (perpendicular.length() < 0.35) {
        // Vista de topo da linha: cai para uma perpendicular estável, do lado mais
        // próximo do heading atual para a câmera girar o mínimo possível.
        const fallback = new THREE.Vector3().crossVectors(chordDir, new THREE.Vector3(0, 1, 0));
        if (fallback.lengthSq() < 1e-6) fallback.crossVectors(chordDir, new THREE.Vector3(1, 0, 0));
        fallback.normalize();
        if (fallback.dot(viewDir) < 0) fallback.negate();
        perpendicular.copy(fallback);
    } else {
        perpendicular.normalize();
    }
    // Elevação leve: trajetórias vivem perto do plano eclíptico; um pouco de
    // altura evita ler a linha rente ao horizonte da cena.
    const finalDir = perpendicular.add(new THREE.Vector3(0, 0.3, 0)).normalize();

    // Distância: encaixa a esfera no menor semiângulo visível (largura × altura),
    // descontando painéis. Margem de 12% espelha o enquadramento do modo órbita.
    const halfFovRad = THREE.MathUtils.degToRad(fovDeg) * 0.5;
    const safeWidthFraction = THREE.MathUtils.clamp(visibleWidthFraction, 0.3, 1);
    const safeHeightFraction = THREE.MathUtils.clamp(visibleHeightFraction, 0.3, 1);
    const tanVisible = Math.min(
        Math.tan(halfFovRad) * safeHeightFraction,
        Math.tan(halfFovRad) * aspect * safeWidthFraction,
    );
    const halfVisibleRad = Math.atan(tanVisible);
    const distance = THREE.MathUtils.clamp(
        (radius / Math.sin(halfVisibleRad)) * 1.12,
        0.8,
        MAX_CAMERA_DISTANCE,
    );

    return { target, position: target.clone().add(finalDir.multiplyScalar(distance)), transition: 'default' };
}

/**
 * Enquadramento de câmera para um asteroide selecionado.
 *   - orbitMode = false: close-up no asteroide, modo radar com escala logarítmica.
 *   - orbitMode = true: enquadra a órbita Kepleriana completa ao redor do Sol na cena heliocêntrica.
 */
export function computeFocusFraming(
    object: ClosestNowObject,
    orbitMode = false,
    earthHelioPositionAU: EarthHelioAU | null = null,
    earthScenePosition: [number, number, number] = [0, 0, 0],
    linearScale: number | null = null,
): FocusFraming | null {
    // Modo linear: o objeto vive na régua heliocêntrica (Sol na origem), não offsetado pela Terra.
    // Mira a posição heliocêntrica absoluta; distância de câmera proporcional à escala da régua.
    if (linearScale != null && earthHelioPositionAU && !orbitMode) {
        const helioPos = currentPositionInHelioScene(object, earthHelioPositionAU);
        if (helioPos) {
            const target = new THREE.Vector3(...helioPos);
            const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
            // ~0,02 AU de afastamento na escala da régua: enquadra o NEO de perto sem colar.
            const distance = Math.max(0.02 * linearScale, 0.3);
            return { target, position: target.clone().add(dir.multiplyScalar(distance)), transition: 'preserve_heading' };
        }
    }
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

    // Close-up na rocha: vetor Horizons log-comprimido, offsetado pela Terra na cena.
    const geoPos = currentPositionInScene(object);
    if (!geoPos) return null;
    const target = new THREE.Vector3(
        earthScenePosition[0] + geoPos[0],
        earthScenePosition[1] + geoPos[1],
        earthScenePosition[2] + geoPos[2],
    );
    const distance = 0.1;
    const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
    const position = target.clone().add(dir.multiplyScalar(distance));
    return { target, position, transition: 'preserve_heading' };
}
