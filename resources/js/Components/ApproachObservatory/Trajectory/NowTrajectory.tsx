import { useMemo } from 'react';
import type { AsteroidTrajectory } from '@/types';
import type { Palette } from '@/lib/observatory/palette';
import { collectTimeTicks, findClosestApproachPoint, toVec3 } from '@/lib/observatory/trajectorySampling';
import { DirectionCone } from './DirectionCone';
import { GradientTrajectoryLine } from './GradientTrajectoryLine';
import {
    getMovementDirection,
    getTrajectoryOpacities,
    isPointOnDrawnPath,
} from './nowTrajectoryPresentation';
import { ClosestApproachMarker, TimeTick } from './TrajectoryMarkers';

type NowTrajectoryProps = {
    trajectory: AsteroidTrajectory;
    palette: Palette;
    emphasized: boolean;
    dimmed: boolean;
    locale: 'pt-BR' | 'en';
    /** Quando `true`, renderiza apenas o cone de direção, sem linhas de trajetória. */
    coneOnly?: boolean;
};

export function NowTrajectory({ trajectory, palette, emphasized, dimmed, locale, coneOnly = false }: NowTrajectoryProps) {
    const pastVecs = useMemo(
        () => (trajectory.pastPoints ?? []).map((point) => toVec3(point)),
        [trajectory.pastPoints],
    );
    const currentVec = useMemo(
        () => (trajectory.currentPoint ? toVec3(trajectory.currentPoint) : null),
        [trajectory.currentPoint],
    );

    const closestApproach = useMemo(() => findClosestApproachPoint(trajectory), [trajectory]);

    const fullPast = useMemo(() => {
        if (currentVec && pastVecs.length > 0) return [...pastVecs, currentVec];
        if (currentVec) return [currentVec];
        return pastVecs;
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

        return collectTimeTicks(trajectory).filter((tick) =>
            fullPast.some((point) => point.distanceToSquared(tick.vec) < 0.35 * 0.35),
        );
    }, [emphasized, trajectory, fullPast]);

    const { pastPeakOpacity, coneOpacity } = getTrajectoryOpacities(emphasized, dimmed);

    return (
        <group>
            {/* Mantém apenas o cone de direção quando a cena precisa reduzir ruído visual. */}
            {!coneOnly && fullPast.length >= 2 ? (
                <GradientTrajectoryLine
                    points={fullPast}
                    color={palette.past}
                    peakOpacity={pastPeakOpacity}
                    peakAtEnd
                />
            ) : null}

            {directionMarker ? (
                <DirectionCone
                    tip={directionMarker.tip}
                    direction={directionMarker.movementDirection}
                    color={palette.future}
                    opacity={coneOpacity}
                />
            ) : null}

            {!coneOnly && emphasized
                ? timeTicks.map((tick) => (
                      <TimeTick key={tick.label} vec={tick.vec} label={tick.label} color={palette.future} />
                  ))
                : null}

            {!coneOnly && closestApproach && closestApproachOnPath ? (
                <ClosestApproachMarker
                    point={closestApproach}
                    color={palette.current}
                    emphasized={emphasized}
                    dimmed={dimmed}
                    locale={locale}
                    showLabel={false}
                />
            ) : null}
        </group>
    );
}
