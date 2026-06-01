/**
 * Compositor principal das camadas SVG do radar.
 *
 * Este arquivo deve permanecer pequeno e orquestrador: a montagem visual mora
 * aqui, enquanto cada subcamada cuida de uma responsabilidade isolada. Evite
 * reintroduzir calculos pesados ou regras globais neste ponto.
 */
import type { Translator } from '@/i18n';
import type { RadarLayoutResult } from '@/lib/radarLayout';
import type { HorizonsReferenceMode, UnifiedApproach } from '@/types';
import { Target } from 'lucide-react';
import { RadarSvgEarthLayer, RadarSvgGlobeLayer, RadarSvgMoonLayer, RadarSvgSunLayer } from './RadarSvgBodiesLayer';
import { RadarSvgLabelsLayer } from './RadarSvgLabelsLayer';
import { RadarSvgObjectsLayer } from './RadarSvgObjectsLayer';
import { RadarSvgRingsLayer } from './RadarSvgRingsLayer';
import { RadarSvgNowTrajectoriesLayer, RadarSvgTrajectoryLayer } from './RadarSvgTrajectoriesLayer';
import { RadarSvgVectorsLayer } from './RadarSvgVectorsLayer';
import type { RingHoverState } from './radarSvgTypes';

type RadarSvgLayersProps = {
    layout: RadarLayoutResult;
    hoveredRingLD: number | null;
    onRingHoverChange?: (state: RingHoverState) => void;
    onSelect?: (approach: UnifiedApproach) => void;
    referenceMode: HorizonsReferenceMode;
    t: Translator;
    locale: 'pt-BR' | 'en';
};

export function RadarSvgLayers({
    layout,
    hoveredRingLD,
    onRingHoverChange,
    onSelect,
    referenceMode,
    t,
    locale,
}: RadarSvgLayersProps) {
    return (
        <>
            <RadarSvgRingsLayer layout={layout} hoveredRingLD={hoveredRingLD} onRingHoverChange={onRingHoverChange} />
            <RadarSvgNowTrajectoriesLayer layout={layout} />
            <RadarSvgTrajectoryLayer layout={layout} referenceMode={referenceMode} />
            <RadarSvgVectorsLayer layout={layout} referenceMode={referenceMode} />
            <RadarSvgSunLayer layout={layout} />
            <RadarSvgEarthLayer layout={layout} />
            <RadarSvgObjectsLayer
                layout={layout}
                onSelect={onSelect}
                referenceMode={referenceMode}
                t={t}
                locale={locale}
            />
            <RadarSvgLabelsLayer layout={layout} />
        </>
    );
}

export {
    RadarSvgEarthLayer as EarthLayer,
    RadarSvgGlobeLayer as RadarGlobeLayer,
    RadarSvgLabelsLayer as LabelsLayer,
    RadarSvgMoonLayer as MoonLayer,
    RadarSvgNowTrajectoriesLayer as NowTrajectoriesLayer,
    RadarSvgObjectsLayer as ObjectsLayer,
    RadarSvgSunLayer as SunLayer,
    RadarSvgTrajectoryLayer as TrajectoryLayer,
    RadarSvgVectorsLayer as VectorsLayer,
    Target,
};

// Alias legado para consumidores antigos. Novos imports devem usar RadarSvgRingsLayer.
export { RadarSvgRingsLayer as RingsLayer };

export { formatRingHoverLabel, visualMoonRadius } from './radarSvgPresentation';
export type { RingHoverState, RadarSvgObjectInteractions } from './radarSvgTypes';
