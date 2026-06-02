/**
 * Hook de apresentação da trajetória geocêntrica atual.
 *
 * Responsabilidade: derivar vetores, marcador de direção, ticks temporais,
 * máxima aproximação e opacidades para `NowTrajectory`. Não busca dados externos,
 * não decide seleção global e não calcula nova mecânica orbital.
 */

import { useMemo } from 'react';
import type { AsteroidTrajectory } from '@/types';
import { collectTimeTicks, findClosestApproachPoint, toVec3 } from '@/lib/observatory/trajectorySampling';
import {
    getMovementDirection,
    getTrajectoryOpacities,
    isPointOnDrawnPath,
    isTimeTickOnDrawnPath,
} from './nowTrajectoryPresentation';
import { ASTEROID_TRAIL_END_RADIUS } from './trajectoryConstants';

export function useNowTrajectoryPresentation({
    trajectory,
    emphasized,
    dimmed,
}: {
    trajectory: AsteroidTrajectory;
    emphasized: boolean;
    dimmed: boolean;
}) {
    const pastVecs = useMemo(
        () => (trajectory.pastPoints ?? []).map((point) => toVec3(point)),
        [trajectory.pastPoints],
    );
    const currentVec = useMemo(
        () => (trajectory.currentPoint ? toVec3(trajectory.currentPoint) : null),
        [trajectory.currentPoint],
    );

    const closestApproach = useMemo(() => findClosestApproachPoint(trajectory), [trajectory]);

    // fullPast termina na borda do marcador (não no centro) para a linha não atravessar o modelo.
    const fullPast = useMemo(() => {
        if (!currentVec) return pastVecs;

        const points = pastVecs.length > 0 ? [...pastVecs, currentVec] : [currentVec];

        if (points.length >= 2) {
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            const dir = last.clone().sub(prev).normalize();
            // fazendo a linha parar na borda do marcador em vez de no centro.
            const trimmed = last.clone().sub(dir.multiplyScalar(ASTEROID_TRAIL_END_RADIUS));
            return [...points.slice(0, -1), trimmed];
        }

        return points;
    }, [pastVecs, currentVec]);

    const closestApproachOnPath = useMemo(
        () => isPointOnDrawnPath(closestApproach, fullPast),
        [closestApproach, fullPast],
    );

    const directionMarker = useMemo(() => {
        if (!currentVec) return null;

        const movementDirection = getMovementDirection(trajectory.currentPoint, fullPast);
        if (!movementDirection) return null;

        return { tip: currentVec.clone(), movementDirection };
    }, [currentVec, trajectory.currentPoint, fullPast]);

    const timeTicks = useMemo(() => {
        if (!emphasized) return [];

        return collectTimeTicks(trajectory)
            .filter((tick) => isTimeTickOnDrawnPath(tick.vec, fullPast));
    }, [emphasized, trajectory, fullPast]);

    return {
        fullPast,
        closestApproach,
        closestApproachOnPath,
        directionMarker,
        timeTicks,
        ...getTrajectoryOpacities(emphasized, dimmed),
    };
}
