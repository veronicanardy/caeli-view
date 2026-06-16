/**
 * Compositor da trilha de trajetória atual no modo radar.
 *
 * Responsabilidade: montar linha, cone de direção, ticks temporais e marcador de
 * máxima aproximação a partir de dados de apresentação já derivados por hook local.
 */

import type * as THREE from 'three';
import type { AsteroidTrajectory } from '@/types';
import type { PointProjector } from '@/lib/radar/trajectorySampling';
import type { Palette } from '@/lib/radar/palette';
import { DirectionCone } from './DirectionCone';
import { GradientTrajectoryLine } from './GradientTrajectoryLine';
import { ClosestApproachMarker, TimeTickGroup } from './TrajectoryMarkers';
import { useNowTrajectoryPresentation } from './useNowTrajectoryPresentation';
import { ASTEROID_TRAIL_END_RADIUS } from './trajectoryConstants';

type NowTrajectoryProps = {
    trajectory: AsteroidTrajectory;
    palette: Palette;
    emphasized: boolean;
    dimmed: boolean;
    /** Quando `true`, renderiza apenas o cone de direção, sem linhas de trajetória. */
    coneOnly?: boolean;
    onFocusPoint?: (vec: THREE.Vector3) => void;
    /** Projetor dos pontos para a cena. Default: régua log. No linear, projeção heliocêntrica. */
    project?: PointProjector;
};

export function NowTrajectory({ trajectory, palette, emphasized, dimmed, coneOnly = false, onFocusPoint, project }: NowTrajectoryProps) {
    const {
        fullPast,
        closestApproach,
        closestApproachOnPath,
        directionMarker,
        timeTicks,
        pastPeakOpacity,
        coneOpacity,
    } = useNowTrajectoryPresentation({ trajectory, emphasized, dimmed, project });

    return (
        <group>
            {/* Mantém apenas o cone de direção quando a cena precisa reduzir ruído visual. */}
            {!coneOnly && fullPast.length >= 2 ? (
                <GradientTrajectoryLine
                    points={fullPast}
                    color={palette.past}
                    peakOpacity={pastPeakOpacity}
                    peakAtEnd
                    exclusionRadius={ASTEROID_TRAIL_END_RADIUS}
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

            {!coneOnly && emphasized && timeTicks.length > 0 ? (
                <TimeTickGroup ticks={timeTicks} color={palette.future} onFocusPoint={onFocusPoint} />
            ) : null}

            {!coneOnly && closestApproach && closestApproachOnPath ? (
                <ClosestApproachMarker
                    point={closestApproach}
                    emphasized={emphasized}
                    showLabel={false}
                />
            ) : null}
        </group>
    );
}
