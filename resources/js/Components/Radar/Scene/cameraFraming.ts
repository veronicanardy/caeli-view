/**
 * Helpers puros de enquadramento de câmera.
 *
 * Responsabilidade: calcular posição e alvo para foco em corpos, overview e
 * objetos selecionados. Não toca OrbitControls nem executa transições.
 */

import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { LINEAR_AU_SCALE, buildHeliocentricOrbit, helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { currentPositionInHelioScene } from '@/lib/radar/trajectorySampling';
import type { EarthHelioAU } from '@/lib/radar/trajectorySampling';
import { estimateAsteroidDiameterMeters, symbolicRockRadiusFromDiameter } from '@/lib/radar/asteroidScale';
import { knownCometById, knownCometScenePosition } from '../Bodies/Comet/knownComets';
import { BODY_FOCUS_MULTIPLIER, CAMERA_FOV_DEG, CAMERA_VIEWS, MAX_CAMERA_DISTANCE, resolveMinZoomDistance } from './cameraConstants';

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
    /** Duração específica do voo em segundos. Quando ausente, usa o padrão do CameraRig. */
    durationSeconds?: number;
};

/**
 * Monta um enquadramento de câmera centrado em um corpo celeste na posição de cena `center`
 * com raio visual `radius`. A câmera fica a `radius × BODY_FOCUS_MULTIPLIER`, de modo que TODO corpo
 * ocupe a MESMA fração da tela (ver BODY_FOCUS_MULTIPLIER). Aceita:
 * - `preferredDir`: direção preferencial de câmera (ex: Terra→Sol para focar o lado diurno).
 * - `distanceMultiplier`: substitui o multiplicador único. Reservado às DUAS exceções nomeadas
 *   (panorama dos famosos e Juno); o foco comum de corpo NUNCA passa este parâmetro.
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
    const multiplier = distanceMultiplier ?? BODY_FOCUS_MULTIPLIER;
    const distance = Math.max(radius * multiplier, 0.2);
    return { target: center.clone(), position: center.clone().add(dir.multiplyScalar(distance)), transition: 'default' };
}

/**
 * Guarda anti-bug: um enquadramento só é seguro se posição e alvo forem totalmente finitos. Um raio
 * degenerado (ex.: efeméride não resolvida, NaN propagado) produziria um destino com NaN/Infinity que,
 * interpolado pelo CameraRig, jogaria a câmera para o infinito (o bug clássico "a câmera some"). O rig
 * checa isto antes de iniciar qualquer voo e simplesmente NÃO voa quando o destino é inseguro.
 */
export function isFiniteFraming(framing: FocusFraming | null | undefined): framing is FocusFraming {
    if (!framing) return false;
    const finite = (v: THREE.Vector3) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
    return finite(framing.position) && finite(framing.target);
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
 * Distância de câmera para o close-up de uma rocha/cometa selecionado. Usa A MESMA regra de TODO corpo
 * (raio × BODY_FOCUS_MULTIPLIER), então a rocha ocupa a MESMA fração da tela que um planeta ou a Lua —
 * é o "tudo igual" pedido pela Verônica, agora unificado com o foco dos demais corpos.
 *
 * Os clamps são APENAS de SEGURANÇA, não estéticos:
 *  - piso resolveMinZoomDistance(raio): a distância mais colada que os OrbitControls permitem com ESTA
 *    rocha selecionada. O piso conta o raio do corpo (`near + raio + folga`), então o foco nunca mira mais
 *    perto que o zoom manual permite, e a FACE da rocha nunca fura o near plane (o piso fixo antigo deixava
 *    a rocha grande/desconhecida recortar). Calculado com o MESMO raio que dimensiona a rocha.
 *  - teto MAX_CAMERA_DISTANCE: impede um raio absurdo de mandar a câmera além do far plane.
 * Fora desses extremos a fração é idêntica à dos planetas. A faixa da lupa (ZoomHint.tsx) acompanha
 * esta regra; ao mexer no multiplicador, confira SHOW_MIN/SHOW_MAX lá.
 */
function closeUpDistance(object: ClosestNowObject): number {
    const radius = symbolicRockRadiusFromDiameter(estimateAsteroidDiameterMeters(object.approach));
    return THREE.MathUtils.clamp(radius * BODY_FOCUS_MULTIPLIER, resolveMinZoomDistance(radius), MAX_CAMERA_DISTANCE);
}

/**
 * Enquadramento de câmera para um asteroide selecionado, na régua heliocêntrica única (Sol na origem).
 *   - orbitMode = false: close-up na rocha, mirando a posição heliocêntrica absoluta.
 *   - orbitMode = true: enquadra a órbita Kepleriana completa ao redor do Sol.
 *
 * Retorna null quando não há posição utilizável (efeméride da Terra ainda não resolvida); a câmera
 * só reenquadra no tick seguinte, quando a posição chega.
 */
export function computeFocusFraming(
    object: ClosestNowObject,
    orbitMode = false,
    earthHelioPositionAU: EarthHelioAU | null = null,
): FocusFraming | null {
    // Close-up: o objeto vive na régua heliocêntrica (Sol na origem), não offsetado pela Terra.
    // Mira a posição heliocêntrica absoluta da rocha. A distância vem de closeUpDistance (proporcional
    // ao raio visual da rocha, ~2 raios), então toda rocha preenche a MESMA fração da tela, e cai na
    // faixa em que a lupa de "ver trajetória" aparece.
    if (earthHelioPositionAU && !orbitMode) {
        const helioPos = currentPositionInHelioScene(object, earthHelioPositionAU);
        if (helioPos) {
            const target = new THREE.Vector3(...helioPos);
            const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
            const distance = closeUpDistance(object);
            return { target, position: target.clone().add(dir.multiplyScalar(distance)), transition: 'preserve_heading' };
        }
    }
    // Elementos do Horizons OU do catálogo local (cometa famoso sem feed, ex.: Halley).
    const orbitElements = object.trajectory?.orbitalElements ?? knownCometById(object.approach.id)?.elements ?? null;
    if (orbitMode && orbitElements) {
        const elements = orbitElements;
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
                LINEAR_AU_SCALE * 1.2,
                MAX_CAMERA_DISTANCE,
            );
            const dir = new THREE.Vector3(0.32, 0.72, 0.62).normalize();
            return { target: sphere.center, position: sphere.center.clone().add(dir.multiplyScalar(distance)), transition: 'default' };
        }

        // Elementos rejeitados pelo construtor de órbita. Cai para o close-up para mostrar algo.
    }

    // Fallback de close-up (modo órbita sem elipse utilizável): mira a posição heliocêntrica absoluta.
    const helioPos = earthHelioPositionAU ? currentPositionInHelioScene(object, earthHelioPositionAU) : null;
    if (helioPos) {
        const target = new THREE.Vector3(...helioPos);
        const distance = closeUpDistance(object);
        const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
        const position = target.clone().add(dir.multiplyScalar(distance));
        return { target, position, transition: 'preserve_heading' };
    }

    // Sem ponto do Horizons: cometa famoso distante (ex.: Halley a ~36 UA no afélio) é enquadrado pela
    // posição Kepler local, a MESMA que o KnownCometsLayer desenha. CLOSE-UP no núcleo: a distância é
    // relativa ao MODELO (que tem tamanho visual fixo, independente de onde o corpo está na régua), não à
    // distância do corpo à origem — assim chega perto do Halley igual aos outros, em vez de parar longe.
    const cometTarget = knownCometFocusTarget(object);
    if (cometTarget) {
        // closeUpDistance é função do TAMANHO estimado do corpo, não da posição: posição-independente
        // por construção. Assim chega perto do Halley (a ~36 UA no afélio) igual aos outros, na mesma
        // fração de tela, sem parar longe por causa da distância à origem.
        const distance = closeUpDistance(object);
        const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
        return { target: cometTarget, position: cometTarget.clone().add(dir.multiplyScalar(distance)), transition: 'default' };
    }

    return null;
}

/** Posição de cena (Vector3) de um cometa famoso via órbita Kepler local, ou null se não for cometa. */
function knownCometFocusTarget(object: ClosestNowObject): THREE.Vector3 | null {
    const comet = knownCometById(object.approach.id);
    if (!comet) return null;
    const pos = knownCometScenePosition(comet, new Date(), LINEAR_AU_SCALE);
    return pos ? new THREE.Vector3(pos[0], pos[1], pos[2]) : null;
}
