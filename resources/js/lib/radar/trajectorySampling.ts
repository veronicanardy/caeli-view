/**
 * Helpers puros para amostrar e recortar trajetórias geocêntricas antes de entregá-las para a
 * cena. Tudo aqui opera sobre dados simples + THREE.Vector3, sem R3F nem React.
 */

import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, TrajectoryPoint } from '@/types';
import { KM_PER_LD } from '@/lib/sceneEphemeris';
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

/** Converte um ponto de trajetória (km, geocêntrico eclíptico) para THREE.Vector3 na cena. */
export function toVec3(point: { x: number; y: number; z?: number | null }): THREE.Vector3 {
    const [x, y, z] = horizonsToScene(point.x, point.y, point.z ?? 0);
    return new THREE.Vector3(x, y, z);
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

export function findClosestApproachPoint(trajectory: AsteroidTrajectory): ClosestApproachSample | null {
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
        vec: toVec3(best),
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
 * Escolhe as amostras de trajetória mais próximas de agora-24h, agora-7d e agora-30d e retorna
 * suas posições na cena com rótulos curtos. O "agora" é o timestamp do currentPoint, isto é,
 * o instante ao qual o Horizons ancorou a trajetória. Só emitimos marcadores quando existe uma
 * amostra real dentro de ~6h do instante alvo.
 */
export function collectTimeTicks(trajectory: AsteroidTrajectory): Array<{ vec: THREE.Vector3; label: string; zOrder: number }> {
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
        { deltaH: -168, label: '-7d', zOrder: 3 },
        { deltaH: -720, label: '-30d', zOrder: 4 },
    ];

    const ticks: Array<{ vec: THREE.Vector3; label: string; zOrder: number }> = [];
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
            ticks.push({ vec: toVec3(best), label, zOrder });
        }
    }
    return ticks;
}
