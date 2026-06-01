import * as THREE from 'three';
import type { ClosestApproachSample } from '@/lib/observatory/trajectorySampling';
import type { TrajectoryPoint } from '@/types';

export const PAST_REACH_SELECTED = 3.5;
export const FUTURE_REACH_SELECTED = 4.5;
export const PAST_REACH_OTHER = 1.8;
export const FUTURE_REACH_OTHER = 2.2;

export function getTrajectoryReach(emphasized: boolean) {
    return {
        pastReach: emphasized ? PAST_REACH_SELECTED : PAST_REACH_OTHER,
        futureReach: emphasized ? FUTURE_REACH_SELECTED : FUTURE_REACH_OTHER,
    };
}

export function isPointOnDrawnPath(
    point: ClosestApproachSample | null,
    fullPast: THREE.Vector3[],
    fullFuture: THREE.Vector3[],
) {
    if (!point) return false;

    const isOnSegment = (points: THREE.Vector3[]) =>
        points.some((candidate) => candidate.distanceToSquared(point.vec) < 0.25 * 0.25);

    return isOnSegment(fullPast) || isOnSegment(fullFuture);
}

export function getConeDirection(
    currentPoint: TrajectoryPoint | null | undefined,
    fullFuture: THREE.Vector3[],
) {
    if (currentPoint && typeof currentPoint.vx === 'number' && typeof currentPoint.vy === 'number') {
        const velocity = new THREE.Vector3(currentPoint.vx, currentPoint.vz ?? 0, -(currentPoint.vy ?? 0));
        if (velocity.lengthSq() > 1e-12) return velocity.normalize();
    }

    if (fullFuture.length >= 2) {
        const direction = fullFuture[1].clone().sub(fullFuture[0]);
        if (direction.lengthSq() > 1e-8) return direction.normalize();
    }

    return null;
}

export function getTrajectoryOpacities(emphasized: boolean, dimmed: boolean) {
    return {
        pastPeakOpacity: emphasized ? 0.55 : dimmed ? 0.12 : 0.32,
        futurePeakOpacity: emphasized ? 0.75 : dimmed ? 0.18 : 0.45,
        coneOpacity: emphasized ? 0.95 : dimmed ? 0.5 : 0.85,
    };
}
