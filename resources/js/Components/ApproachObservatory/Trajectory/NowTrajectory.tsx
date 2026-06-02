/**
 * Compositor da trajetória geocêntrica atual.
 *
 * Responsabilidade: montar linha, cone de direção, ticks temporais e marcador de
 * máxima aproximação a partir de dados de apresentação já derivados por hook local.
 */

import type { AsteroidTrajectory } from '@/types';
import type { Palette } from '@/lib/observatory/palette';
import { DirectionCone } from './DirectionCone';
import { GradientTrajectoryLine } from './GradientTrajectoryLine';
import { ClosestApproachMarker, TimeTick } from './TrajectoryMarkers';
import { useNowTrajectoryPresentation } from './useNowTrajectoryPresentation';

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
    const {
        fullPast,
        closestApproach,
        closestApproachOnPath,
        directionMarker,
        timeTicks,
        pastPeakOpacity,
        coneOpacity,
    } = useNowTrajectoryPresentation({ trajectory, emphasized, dimmed });

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
