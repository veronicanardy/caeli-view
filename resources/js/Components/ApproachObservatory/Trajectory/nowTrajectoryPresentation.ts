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

/**
 * Retorna a direção real para onde o objeto está se movendo agora.
 *
 * Ordem de prioridade:
 * - vetor de velocidade vindo do Horizons/JPL, já no sentido futuro;
 * - fallback geométrico entre os dois últimos pontos desenhados.
 *
 * O resultado sempre aponta para frente no deslocamento, nunca para trás.
 */
export function getMovementDirection(
    currentPoint: TrajectoryPoint | null | undefined,
    fullPast: THREE.Vector3[],
) {
    if (currentPoint && typeof currentPoint.vx === 'number' && typeof currentPoint.vy === 'number') {
        const velocityDirection = new THREE.Vector3(
            currentPoint.vx,
            currentPoint.vz ?? 0,
            -(currentPoint.vy ?? 0),
        );

        if (velocityDirection.lengthSq() > 1e-12) {
            return velocityDirection.normalize();
        }
    }

    if (fullPast.length >= 2) {
        const forwardDirection = fullPast[fullPast.length - 1]
            .clone()
            .sub(fullPast[fullPast.length - 2]);

        if (forwardDirection.lengthSq() > 1e-8) {
            return forwardDirection.normalize();
        }
    }

    return null;
}

export function getTrajectoryOpacities(emphasized: boolean, dimmed: boolean) {
    return {
        pastPeakOpacity: emphasized ? 0.55 : dimmed ? 0.12 : 0.32,
        coneOpacity: emphasized ? 1.0 : dimmed ? 0.58 : 0.92,
    };
}
