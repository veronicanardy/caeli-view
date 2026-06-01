import { useMemo } from 'react';
import type { AsteroidTrajectory } from '@/types';
import type { Palette } from '@/lib/observatory/palette';
import { clipPolylineByLength, collectTimeTicks, findClosestApproachPoint, toVec3 } from '@/lib/observatory/trajectorySampling';
import { DirectionCone } from './DirectionCone';
import { GradientTrajectoryLine } from './GradientTrajectoryLine';
import {
    getConeDirection,
    getTrajectoryOpacities,
    getTrajectoryReach,
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
    const futureVecs = useMemo(
        () => (trajectory.futurePoints ?? []).map((point) => toVec3(point)),
        [trajectory.futurePoints],
    );
    const currentVec = useMemo(
        () => (trajectory.currentPoint ? toVec3(trajectory.currentPoint) : null),
        [trajectory.currentPoint],
    );

    const closestApproach = useMemo(() => findClosestApproachPoint(trajectory), [trajectory]);
    const { pastReach, futureReach } = getTrajectoryReach(emphasized);

    const fullPast = useMemo(() => {
        const joined = currentVec && pastVecs.length > 0 ? [...pastVecs, currentVec] : pastVecs;
        return clipPolylineByLength([...joined].reverse(), pastReach).reverse();
    }, [pastVecs, currentVec, pastReach]);

    const fullFuture = useMemo(() => {
        const joined = currentVec && futureVecs.length > 0 ? [currentVec, ...futureVecs] : futureVecs;
        return clipPolylineByLength(joined, futureReach);
    }, [futureVecs, currentVec, futureReach]);

    const closestApproachOnPath = useMemo(
        () => isPointOnDrawnPath(closestApproach, fullPast, fullFuture),
        [closestApproach, fullPast, fullFuture],
    );

    const endArrow = useMemo(() => {
        if (!currentVec) return null;

        const direction = getConeDirection(trajectory.currentPoint, fullFuture);
        if (!direction) return null;

        return { tip: currentVec.clone(), direction };
    }, [currentVec, trajectory.currentPoint, fullFuture]);

    const timeTicks = useMemo(() => {
        if (!emphasized) return [];

        const drawn = [...fullPast, ...fullFuture];
        return collectTimeTicks(trajectory).filter((tick) =>
            drawn.some((point) => point.distanceToSquared(tick.vec) < 0.35 * 0.35),
        );
    }, [emphasized, trajectory, fullPast, fullFuture]);

    const { pastPeakOpacity, futurePeakOpacity, coneOpacity } = getTrajectoryOpacities(emphasized, dimmed);

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

            {!coneOnly && fullFuture.length >= 2 ? (
                <GradientTrajectoryLine
                    points={fullFuture}
                    color={palette.future}
                    peakOpacity={futurePeakOpacity}
                    peakAtEnd={false}
                />
            ) : null}

            {endArrow ? (
                <DirectionCone
                    tip={endArrow.tip}
                    direction={endArrow.direction}
                    color={palette.future}
                    opacity={coneOpacity}
                />
            ) : null}

            {!coneOnly && emphasized
                ? timeTicks.map((tick) => (
                      <TimeTick key={tick.label} vec={tick.vec} label={tick.label} color={palette.future} />
                  ))
                : null}

            {!coneOnly && closestApproach && (emphasized || closestApproachOnPath) ? (
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
