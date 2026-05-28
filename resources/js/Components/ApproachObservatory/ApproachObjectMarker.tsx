import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';
import { classifyApproachAttention } from '@/lib/approachAttention';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactMeters, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { UnifiedApproach } from '@/types';
import { AsteroidMarkerShape } from './AsteroidMarkerShape';
import { DistancePresenter } from './DistancePresenter';
import { ObjectTypeBadge } from './ObjectTypeBadge';

type Props = {
    approach: UnifiedApproach;
    position: { left: number; top: number };
    isClosest?: boolean;
    closestLabel?: string;
    isSelected?: boolean;
    onSelect?: (approach: UnifiedApproach) => void;
    selectLabel?: string;
};

export function ApproachObjectMarker({
    approach,
    position,
    isClosest = false,
    closestLabel,
    isSelected = false,
    onSelect,
    selectLabel,
}: Props) {
    const comet = approach.objectType === 'comet';
    const attention = classifyApproachAttention(approach);
    const lunarDistance = lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance;
    const identity = resolveApproachIdentity(approach);
    const tooltipPlacement = tooltipPlacementClasses(position);
    const markerSizePx = {
        low: 18,
        moderate: 22,
        high: 28,
        highlight: 34,
    }[attention.level];

    const shared = {
        style: { left: `${position.left}%`, top: `${position.top}%` },
        className: 'group absolute z-50 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none hover:z-[70] focus-visible:z-[70] focus-visible:ring-2 focus-visible:ring-signal-cyan',
        'aria-label': selectLabel ? `${selectLabel}: ${identity.displayName}` : `Abrir dossiê orbital de ${identity.displayName}`,
    } as const;

    const inner: ReactNode = (
        <>
            {comet ? (
                <span
                    className="pointer-events-none absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-signal-amber/85 via-signal-amber/30 to-transparent blur-[0.5px]"
                    style={{ left: markerSizePx * 0.55, width: markerSizePx * 1.8 }}
                    aria-hidden="true"
                />
            ) : null}
            <span className="relative block transition-transform group-hover:scale-110">
                <AsteroidMarkerShape seed={approach.id} type={approach.objectType} sizePx={markerSizePx} />
                {isSelected ? <span className="pointer-events-none absolute inset-0 scale-[1.28] rounded-full border border-white/55" aria-hidden="true" /> : null}
            </span>
            {isClosest && closestLabel ? (
                <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-signal-cyan/40 bg-space-950/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal-cyan">
                    {closestLabel}
                </span>
            ) : null}
            <span className={`pointer-events-none absolute z-[80] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-space-950/95 p-4 text-left opacity-0 shadow-glow transition group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipPlacement}`}>
                <span className="block text-sm font-semibold text-white">{identity.displayName}</span>
                {identity.subtitle ? <span className="mt-1 block text-xs text-white/50">{identity.subtitle}</span> : null}
                <span className="mt-2 flex"><ObjectTypeBadge type={approach.objectType} /></span>
                <span className="mt-3 block text-xs text-white/55">{approach.approachDate ?? 'Data não informada'} · {approach.sourceLabel}</span>
                <span className="mt-3 block text-sm text-white/70">
                    <DistancePresenter distance={approach.distanceContext} compact />
                </span>
                <span className="mt-2 block text-xs text-white/55">
                    Comparação lunar: {lunarDistanceLabel(lunarDistance)}
                </span>
                <span className="mt-2 block text-xs text-white/55">
                    Velocidade: {formatNumber(approach.relativeVelocityKph, 0)} km/h
                </span>
                <span className="mt-2 block text-xs text-white/55">
                    Tamanho estimado: {sizeLabel(approach)}
                </span>
                <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                    Atenção visual: {attention.label}
                </span>
                <span className="mt-2 block text-xs leading-5 text-white/50">{attention.reason}</span>
            </span>
        </>
    );

    if (onSelect) {
        return (
            <button type="button" onClick={() => onSelect(approach)} {...shared}>
                {inner}
            </button>
        );
    }

    return (
        <Link href={approach.detailRoute} {...shared}>
            {inner}
        </Link>
    );
}

function tooltipPlacementClasses(position: { left: number; top: number }): string {
    const vertical = position.top > 66 ? 'bottom-full mb-3' : 'top-full mt-3';

    if (position.left > 68) {
        return `${vertical} right-0`;
    }

    if (position.left < 32) {
        return `${vertical} left-0`;
    }

    return `${vertical} left-1/2 -translate-x-1/2`;
}

function sizeLabel(approach: UnifiedApproach): string {
    if (approach.diameterMeters !== null) {
        return compactMeters(approach.diameterMeters);
    }

    if (approach.estimatedDiameterMinMeters !== null || approach.estimatedDiameterMaxMeters !== null) {
        return `${compactMeters(approach.estimatedDiameterMinMeters)} a ${compactMeters(approach.estimatedDiameterMaxMeters)}`;
    }

    return 'Indisponível';
}
