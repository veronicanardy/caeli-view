import * as THREE from 'three';
import type { ClosestApproachSample } from '@/lib/observatory/trajectorySampling';
import type { TrajectoryPoint } from '@/types';

export function isPointOnDrawnPath(
    point: ClosestApproachSample | null,
    fullPast: THREE.Vector3[],
) {
    if (!point) return false;

    return fullPast.some((candidate) => candidate.distanceToSquared(point.vec) < 0.25 * 0.25);
}

export function getConeDirection(
    currentPoint: TrajectoryPoint | null | undefined,
    fullPast: THREE.Vector3[],
) {
    if (currentPoint && typeof currentPoint.vx === 'number' && typeof currentPoint.vy === 'number') {
        const velocity = new THREE.Vector3(currentPoint.vx, currentPoint.vz ?? 0, -(currentPoint.vy ?? 0));
        if (velocity.lengthSq() > 1e-12) return velocity.normalize();
    }

    if (fullPast.length >= 2) {
        const direction = fullPast[fullPast.length - 1].clone().sub(fullPast[fullPast.length - 2]);
        if (direction.lengthSq() > 1e-8) return direction.normalize();
    }

    return null;
}

export function getTrajectoryOpacities(emphasized: boolean, dimmed: boolean) {
    return {
        pastPeakOpacity: emphasized ? 0.55 : dimmed ? 0.12 : 0.32,
        coneOpacity: emphasized ? 0.95 : dimmed ? 0.5 : 0.85,
    };
}
