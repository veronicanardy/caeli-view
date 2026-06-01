/**
 * Tooltip HTML dos marcadores SVG do radar.
 *
 * Ele apenas formata informacoes de um objeto ja resolvido para exibicao.
 * Nao deve escolher qual objeto aparece, nem alterar regras de hover ou selecao.
 */
import type { ReactNode } from 'react';
import { compactKm, compactMeters, formatNumber, lunarDistanceLabel } from '@/lib/format';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { ObjectTypeBadge } from '../../Presenters/ObjectTypeBadge';
import { formatDateTimeUTC, symbolicTooltipText } from './radarSvgPresentation';
import type { RadarSvgObjectMarkerProps } from './radarSvgTypes';

export function RadarSvgObjectTooltip({
    object,
    referenceMode,
    t,
    locale,
    x,
    y,
    width,
    height,
}: RadarSvgObjectMarkerProps & {
    x: number;
    y: number;
    width: number;
    height: number;
}) {
    const identity = resolveApproachIdentity(object.approach);

    return (
        <foreignObject className="pointer-events-none opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
            <div className="w-full rounded-lg border border-white/10 bg-space-950/95 p-3 text-left text-xs leading-5 text-white/75 shadow-glow">
                <p className="text-sm font-semibold text-white">{identity.displayName}</p>
                {identity.subtitle ? <p className="mt-0.5 text-[11px] text-white/55">{identity.subtitle}</p> : null}
                <div className="mt-2 flex"><ObjectTypeBadge type={object.approach.objectType} /></div>
                <p className="mt-2 text-[11px] text-white/75">
                    {object.hasHorizonsPosition
                        ? (referenceMode === 'current'
                            ? t('observatory.radar.tooltip.horizonsCurrent').replace('{time}', formatDateTimeUTC(object.source.currentPositionTime, locale))
                            : t('observatory.radar.tooltip.horizonsClosest').replace('{time}', formatDateTimeUTC(object.source.currentPositionTime, locale)))
                        : symbolicTooltipText(object.source.horizonsFailureKind, t)}
                </p>
                <dl className="mt-2 space-y-0.5 text-[11px]">
                    <TooltipRow label={t('observatory.radar.tooltip.closestTime')}>{formatDateTimeUTC(object.source.closestApproachTime, locale)}</TooltipRow>
                    <TooltipRow label={t('observatory.radar.tooltip.closestDistance')}>
                        {compactKm(object.source.distanceKm)}
                        {object.source.distanceLD !== null ? <span className="text-white/45"> · {lunarDistanceLabel(object.source.distanceLD)}</span> : null}
                    </TooltipRow>
                    {object.source.relativeVelocityKph !== null ? (
                        <TooltipRow label={locale === 'en' ? 'Velocity' : 'Velocidade'}>{formatNumber(object.source.relativeVelocityKph, 0)} km/h</TooltipRow>
                    ) : null}
                    {object.source.diameterMeters !== null ? (
                        <TooltipRow label={locale === 'en' ? 'Diameter' : 'Diametro'}>{compactMeters(object.source.diameterMeters)}</TooltipRow>
                    ) : null}
                </dl>
            </div>
        </foreignObject>
    );
}

function TooltipRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">{label}</dt>
            <dd className="text-right font-medium text-white/85">{children}</dd>
        </div>
    );
}
