/**
 * Helpers puros para amostrar e recortar pontos de trajetória do Horizons antes de entregá-los para a
 * cena. Tudo aqui opera sobre dados simples + THREE.Vector3, sem R3F nem React.
 */

import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, OrbitalElements, TrajectoryPoint } from '@/types';
import {
    KM_PER_LD,
    LINEAR_AU_SCALE,
    ORBIT_ELLIPSE_SEGMENTS,
    helioAUToSunCenteredScene,
    orbitGeometryFromElements,
    sampleHeliocentricEllipseAtNu,
} from '@/lib/sceneEphemeris';
import { trueAnomalyNow } from '@/lib/keplerOrbit';
import { KM_PER_AU } from '@/lib/physicalConstants';
import { horizonsToScene } from './coordinates';

export type EarthHelioAU = { x: number; y: number; z: number };

/** Limite de snap (em unidades de cena) usado por closestApproachNearPosition. */
export const CLOSEST_APPROACH_MERGE_DISTANCE_SCENE = 0.45;
const CLOSEST_APPROACH_MERGE_DISTANCE_SQ = CLOSEST_APPROACH_MERGE_DISTANCE_SCENE * CLOSEST_APPROACH_MERGE_DISTANCE_SCENE;

// NEOs podem chegar a algo perto de ~5 UA geocêntricas.
// Acima de 750 milhões de km, o vetor do Horizons quase certamente está incorreto
// (descentramento no baricentro ou confusão de unidade), então descartamos o ponto
// em vez de posicionar o objeto em um lugar sem sentido.
const MAX_GEOCENTRIC_KM = 750_000_000;

export function currentPositionInScene(object: ClosestNowObject): [number, number, number] | null {
    const point = object.trajectory?.currentPoint;
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return null;
    const distKm = Math.hypot(point.x, point.y, point.z ?? 0);
    if (distKm > MAX_GEOCENTRIC_KM) return null;
    return horizonsToScene(point.x, point.y, point.z ?? 0);
}

/**
 * [Modo linear] Posição de cena de um objeto do feed na régua HELIOCÊNTRICA linear em UA (Sol na
 * origem), igual aos planetas/conhecidos — em vez da régua log geocêntrica.
 *
 * O ponto do Horizons é geocêntrico (km, eclíptico, Terra como origem). A posição heliocêntrica é
 * earthHelioAU + (ponto / KM_PER_AU), depois passada por helioAUToSunCenteredScene. Resultado é
 * ABSOLUTO (Sol na origem), então deve ser desenhado SEM o offset da Terra.
 */
export function currentPositionInHelioScene(
    object: ClosestNowObject,
    earthHelioAU: EarthHelioAU,
): [number, number, number] | null {
    const point = object.trajectory?.currentPoint;
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return null;
    const distKm = Math.hypot(point.x, point.y, point.z ?? 0);
    if (distKm > MAX_GEOCENTRIC_KM) return null;
    const helio = {
        x: earthHelioAU.x + point.x / KM_PER_AU,
        y: earthHelioAU.y + point.y / KM_PER_AU,
        z: earthHelioAU.z + (point.z ?? 0) / KM_PER_AU,
    };
    // Escala própria do modo linear (LINEAR_AU_SCALE): fonte única para calibrar todos os corpos
    // do modo num lugar só.
    return helioAUToSunCenteredScene(helio, LINEAR_AU_SCALE);
}

/**
 * [Modo linear] Posição do NEO focado AMOSTRADA NA PRÓPRIA ELIPSE Kepleriana desenhada, no ν de
 * agora — a mesma estratégia dos planetas (sampleHeliocentricEllipseAtNu) e do modo órbita
 * (HeliocentricScene). Quando a órbita do objeto está sendo desenhada, a rocha DEVE vir desta
 * polilinha (não do ponto Horizons de currentPositionInHelioScene), senão fica deslocada da linha:
 * a linha é a elipse de dois corpos e o Horizons inclui perturbações, então as fontes divergem.
 *
 * IMPORTANTE: o resultado está em ORBIT_AU_SCALE (embutido em ellipseVertexAtNu), igual à órbita
 * construída por buildHeliocentricOrbit. Quem renderiza deve aplicar o MESMO LINEAR_SCALE_FACTOR
 * (via <group scale>) à linha e a este ponto, para que ambos caiam juntos na régua linear.
 * Retorna null quando os elementos não permitem ancorar o ν (sem época de periélio, hiperbólico).
 */
export function focusedOrbitSamplePosition(
    elements: OrbitalElements,
    date: Date = new Date(),
): [number, number, number] | null {
    const g = orbitGeometryFromElements(elements);
    const nu = trueAnomalyNow(elements, date);
    if (!g || nu === null) return null;
    return sampleHeliocentricEllipseAtNu(g, nu, ORBIT_ELLIPSE_SEGMENTS);
}

/** Converte um ponto de trajetória (km, eclíptico J2000, Terra como origem de medição) para THREE.Vector3 na cena. */
export function toVec3(point: { x: number; y: number; z?: number | null }): THREE.Vector3 {
    const [x, y, z] = horizonsToScene(point.x, point.y, point.z ?? 0);
    return new THREE.Vector3(x, y, z);
}

/**
 * [Modo linear] Versão de toVec3 para a régua HELIOCÊNTRICA linear em UA: o ponto geocêntrico do
 * Horizons (km) é levado a heliocêntrico (earthHelioAU + ponto/KM_PER_AU) e projetado por
 * helioAUToSunCenteredScene na LINEAR_AU_SCALE. Resultado ABSOLUTO (Sol na origem), igual à rocha em
 * currentPositionInHelioScene — então a trajetória curta cai exatamente onde o corpo está, fiel à
 * escala (e por isso fisicamente pequena: é o movimento geocêntrico de poucos dias, sem esticar).
 *
 * Devolve um projetor pronto para um ponto, casando com a assinatura de toVec3 (point) usada pelo
 * hook de apresentação. earthHelioAU é fixo para a trajetória inteira (a Terra mal se move no intervalo).
 */
export function makeHelioLinearProjector(
    earthHelioAU: EarthHelioAU,
): (point: { x: number; y: number; z?: number | null }) => THREE.Vector3 {
    return (point) => {
        const helio = {
            x: earthHelioAU.x + point.x / KM_PER_AU,
            y: earthHelioAU.y + point.y / KM_PER_AU,
            z: earthHelioAU.z + (point.z ?? 0) / KM_PER_AU,
        };
        const [x, y, z] = helioAUToSunCenteredScene(helio, LINEAR_AU_SCALE);
        return new THREE.Vector3(x, y, z);
    };
}

/**
 * Percorre uma polilinha a partir do PRIMEIRO ponto e mantém amostras até que o comprimento
 * acumulado atinja `maxLengthDL`, inserindo um ponto final interpolado exatamente nesse limite.
 * Serve para recortar a trajetória visível a um trecho legível em torno do "agora", sem
 * distorcer sua forma: o trecho mantido continua sendo o caminho real, apenas mais curto.
 * Retorna pelo menos os dois primeiros pontos quando possível.
 */
export function clipPolylineByLength(points: THREE.Vector3[], maxLengthDL: number): THREE.Vector3[] {
    if (points.length <= 1) return points;
    const kept: THREE.Vector3[] = [points[0]];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
        const seg = points[i].clone().sub(points[i - 1]);
        const segLen = seg.length();
        if (segLen < 1e-9) continue;
        if (total + segLen <= maxLengthDL) {
            kept.push(points[i]);
            total += segLen;
            continue;
        }
        const remaining = maxLengthDL - total;
        kept.push(points[i - 1].clone().add(seg.multiplyScalar(remaining / segLen)));
        break;
    }
    return kept;
}

export type ClosestApproachSample = {
    vec: THREE.Vector3;
    distanceKm: number;
    distanceLD: number | null;
    timestamp: string;
};

/** Projetor de um ponto de trajetória para a cena. Default: régua log (toVec3). */
export type PointProjector = (point: { x: number; y: number; z?: number | null }) => THREE.Vector3;

export function findClosestApproachPoint(
    trajectory: AsteroidTrajectory,
    project: PointProjector = toVec3,
): ClosestApproachSample | null {
    const candidates: TrajectoryPoint[] = [
        ...(trajectory.pastPoints ?? []),
        ...(trajectory.futurePoints ?? []),
    ];
    if (trajectory.currentPoint) candidates.push(trajectory.currentPoint);
    if (candidates.length === 0) return null;

    let best: TrajectoryPoint | null = null;
    let bestKm = Number.POSITIVE_INFINITY;
    for (const point of candidates) {
        const km = typeof point.distanceKm === 'number'
            ? point.distanceKm
            : Math.hypot(point.x, point.y, point.z ?? 0);
        if (km < bestKm) {
            bestKm = km;
            best = point;
        }
    }
    if (!best) return null;

    return {
        vec: project(best),
        distanceKm: bestKm,
        distanceLD: typeof best.distanceLunar === 'number' ? best.distanceLunar : bestKm / KM_PER_LD,
        timestamp: best.timestamp,
    };
}

export function closestApproachNearPosition(
    trajectory: AsteroidTrajectory | null | undefined,
    position: THREE.Vector3 | null,
): ClosestApproachSample | null {
    if (!trajectory || !position) return null;
    const closest = findClosestApproachPoint(trajectory);
    if (!closest) return null;

    return closest.vec.distanceToSquared(position) <= CLOSEST_APPROACH_MERGE_DISTANCE_SQ
        ? closest
        : null;
}

/**
 * Trecho da trajetória que o zoom out de trajetória deve enquadrar: as amostras
 * do passado até `maxAgeHours` atrás (cobre o marcador −72h com a mesma
 * tolerância de 6h dos ticks) mais o ponto atual. Pontos sem timestamp legível
 * entram no trecho — descartá-los esconderia trajetória real.
 * Retorna posições na cena (relativas à Terra), em ordem cronológica.
 */
export function trajectoryFramePoints(
    trajectory: AsteroidTrajectory,
    maxAgeHours = 78,
    project: PointProjector = toVec3,
): THREE.Vector3[] {
    const now = trajectory.currentPoint?.timestamp ? new Date(trajectory.currentPoint.timestamp).getTime() : NaN;
    const cutoff = Number.isNaN(now) ? null : now - maxAgeHours * 3_600_000;

    const kept = (trajectory.pastPoints ?? []).filter((point) => {
        if (cutoff === null) return true;
        const stamp = new Date(point.timestamp).getTime();
        return Number.isNaN(stamp) || stamp >= cutoff;
    });

    const points = kept.map((point) => project(point));
    if (trajectory.currentPoint) points.push(project(trajectory.currentPoint));
    return points;
}

/**
 * Escolhe as amostras de trajetória mais próximas de agora-24h, agora-7d e agora-30d e retorna
 * suas posições na cena com rótulos curtos. O "agora" é o timestamp do currentPoint, isto é,
 * o instante ao qual o Horizons ancorou a trajetória. Só emitimos marcadores quando existe uma
 * amostra real dentro de ~6h do instante alvo.
 */
export function collectTimeTicks(
    trajectory: AsteroidTrajectory,
    project: PointProjector = toVec3,
): Array<{ vec: THREE.Vector3; label: string; tooltip: string; zOrder: number }> {
    const now = trajectory.currentPoint?.timestamp ? new Date(trajectory.currentPoint.timestamp).getTime() : NaN;
    if (Number.isNaN(now)) return [];

    const all: TrajectoryPoint[] = [
        ...(trajectory.pastPoints ?? []),
        ...(trajectory.currentPoint ? [trajectory.currentPoint] : []),
        ...(trajectory.futurePoints ?? []),
    ];
    if (all.length === 0) return [];

    const HOUR = 3_600_000;
    const targets: Array<{ deltaH: number; label: string; zOrder: number }> = [
        { deltaH: -24, label: '-24h', zOrder: 0 },
        { deltaH: -48, label: '-48h', zOrder: 1 },
        { deltaH: -72, label: '-72h', zOrder: 2 },
    ];

    const ticks: Array<{ vec: THREE.Vector3; label: string; tooltip: string; zOrder: number }> = [];
    for (const { deltaH, label, zOrder } of targets) {
        const targetTime = now + deltaH * HOUR;
        let best: TrajectoryPoint | null = null;
        let bestDelta = Number.POSITIVE_INFINITY;
        for (const point of all) {
            const stamp = new Date(point.timestamp).getTime();
            if (Number.isNaN(stamp)) continue;
            const delta = Math.abs(stamp - targetTime);
            if (delta < bestDelta) { bestDelta = delta; best = point; }
        }
        // Só mostra o marcador quando realmente existe uma amostra dentro de 6h do alvo.
        if (best && bestDelta <= 6 * HOUR) {
            const hoursAgo = Math.abs(deltaH);
            const distKm = best.distanceKm != null
                ? new Intl.NumberFormat('pt-BR').format(Math.round(best.distanceKm))
                : null;
            const tooltip = `O asteroide estava aqui há ${hoursAgo}h${distKm ? `|${distKm} km da Terra` : ''}`;
            ticks.push({ vec: project(best), label, tooltip, zOrder });
        }
    }
    return ticks;
}
