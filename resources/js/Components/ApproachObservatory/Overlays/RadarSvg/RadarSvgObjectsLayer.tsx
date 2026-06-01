/**
 * Marcadores SVG dos objetos proximos no radar.
 *
 * Este arquivo recebe coordenadas, estados de selecao e metadados ja prontos.
 * Nao deve calcular ranking, posicao real ou fallback Horizons/CAD.
 */
import { Link } from '@inertiajs/react';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { AsteroidMarkerShape } from '../../Presenters/AsteroidMarkerShape';
import { RadarSvgObjectTooltip } from './RadarSvgTooltip';
import type { RadarSvgLayoutProps, RadarSvgObjectInteractions, RadarSvgObjectMarkerProps } from './radarSvgTypes';

export function RadarSvgObjectsLayer({
    layout,
    onSelect,
    referenceMode,
    t,
    locale,
}: RadarSvgLayoutProps & RadarSvgObjectInteractions) {
    return (
        <g>
            <g aria-hidden="true">
                {layout.objects.map((object) => (
                    object.isSelected && object.secondaryRingLD !== null ? (
                        <circle key={`secondary-ring-${object.id}`} cx={layout.center.x} cy={layout.center.y} r={object.orbitRadiusPx} fill="none" stroke="rgba(84,214,214,0.58)" strokeWidth={1} strokeDasharray="2 6" />
                    ) : null
                ))}
            </g>
            {layout.objects.map((object) => (
                <RadarSvgObjectMarker key={object.id} object={object} onSelect={onSelect} referenceMode={referenceMode} t={t} locale={locale} />
            ))}
        </g>
    );
}

function RadarSvgObjectMarker({ object, onSelect, referenceMode, t, locale }: RadarSvgObjectMarkerProps) {
    const identity = resolveApproachIdentity(object.approach);
    const r = object.radiusPx;
    const tooltipWidth = 280;
    const tooltipHeight = 220;
    const tooltipX = object.x > 0 ? Math.max(8, Math.min(object.x - tooltipWidth / 2, object.x + r + 10)) : object.x;
    const tooltipY = object.y + r + 10;

    const inner = (
        <g className="radar-marker group" style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            {object.isClosest ? <circle cx={object.x} cy={object.y} r={r * 1.9} fill="none" stroke="rgba(84,214,214,0.5)" strokeWidth={1.2} /> : null}
            {object.isSelected ? <circle cx={object.x} cy={object.y} r={r * 1.55} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} /> : null}

            <foreignObject x={object.x - r} y={object.y - r} width={r * 2} height={r * 2}>
                <div style={{ width: r * 2, height: r * 2 }}>
                    {object.hasHorizonsPosition ? (
                        <AsteroidMarkerShape seed={object.id} type={object.approach.objectType} sizePx={r * 2} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)' }} />
                    )}
                </div>
            </foreignObject>

            <RadarSvgObjectTooltip
                object={object}
                referenceMode={referenceMode}
                t={t}
                locale={locale}
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
            />
        </g>
    );

    if (onSelect) {
        return (
            <g aria-label={identity.displayName} onClick={(event) => { event.stopPropagation(); onSelect(object.approach); }}>
                {inner}
            </g>
        );
    }
    return <Link href={object.approach.detailRoute} aria-label={identity.displayName}>{inner}</Link>;
}
