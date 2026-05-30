import { Link } from '@inertiajs/react';
import { Target } from 'lucide-react';
import type { Translator } from '@/i18n';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactKm, compactMeters, formatNumber, lunarDistanceLabel } from '@/lib/format';
import type { LayoutNowTrajectory, LayoutObject, LayoutRing, RadarLayoutResult } from '@/lib/radarLayout';
import type { HorizonsFailureKind, HorizonsReferenceMode, UnifiedApproach } from '@/types';
import { AsteroidMarkerShape } from '../Presenters/AsteroidMarkerShape';
import { ObjectTypeBadge } from '../Presenters/ObjectTypeBadge';

// ─── Tipos locais ────────────────────────────────────────────

export type RingHoverState = { ld: number; x: number; y: number } | null;

// ─── Layers ─────────────────────────────────────────────────

export function RingsLayer({
    layout,
    hoveredRingLD,
    onRingHoverChange,
}: {
    layout: RadarLayoutResult;
    hoveredRingLD: number | null;
    onRingHoverChange?: (state: RingHoverState) => void;
}) {
    const outerRing = layout.rings.find((ring) => ring.ld === 150) ?? null;

    return (
        <g>
            {layout.rings.map((ring) => (
                <g key={ring.ld}>
                    <circle
                        cx={layout.center.x}
                        cy={layout.center.y}
                        r={ring.radiusPx}
                        fill="none"
                        stroke={ringStrokeColor(ring, hoveredRingLD === ring.ld)}
                        strokeWidth={ringStrokeWidth(ring, hoveredRingLD === ring.ld)}
                        vectorEffect="non-scaling-stroke"
                        aria-hidden="true"
                    />
                    <circle
                        cx={layout.center.x}
                        cy={layout.center.y}
                        r={ring.radiusPx}
                        fill="none"
                        stroke="rgba(0,0,0,0.001)"
                        strokeWidth={18}
                        vectorEffect="non-scaling-stroke"
                        style={{ pointerEvents: 'stroke' }}
                        onMouseEnter={(event) => {
                            const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            const x = rect ? event.clientX - rect.left : event.clientX;
                            const y = rect ? event.clientY - rect.top : event.clientY;
                            onRingHoverChange?.({ ld: ring.ld, x, y });
                        }}
                        onMouseMove={(event) => {
                            const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            const x = rect ? event.clientX - rect.left : event.clientX;
                            const y = rect ? event.clientY - rect.top : event.clientY;
                            onRingHoverChange?.({ ld: ring.ld, x, y });
                        }}
                        onMouseLeave={() => onRingHoverChange?.(null)}
                    />
                </g>
            ))}

            {outerRing ? (
                <text
                    x={layout.center.x + outerRing.radiusPx + 10}
                    y={layout.center.y - 8}
                    textAnchor="start"
                    fontSize={12}
                    fontWeight={600}
                    fill={hoveredRingLD === 150 ? 'rgba(84,214,214,0.95)' : 'rgba(255,255,255,0.92)'}
                    style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,28,0.85)', strokeWidth: 3, strokeLinejoin: 'round' }}
                    aria-hidden="true"
                >
                    150 DL
                </text>
            ) : null}
        </g>
    );
}

function ringStrokeColor(ring: LayoutRing, hovered: boolean): string {
    if (hovered) return 'rgba(84,214,214,0.62)';
    if (ring.emphasize) return 'rgba(255,255,255,0.45)';
    return 'rgba(255,255,255,0.2)';
}

function ringStrokeWidth(ring: LayoutRing, hovered: boolean): number {
    if (hovered) return 1.9;
    if (ring.emphasize) return 1.4;
    return 1.1;
}

export function EarthLayer({ layout }: { layout: RadarLayoutResult }) {
    const { x, y, radiusPx } = layout.earth;
    return (
        <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <defs>
                <radialGradient id="earth-outer-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(96,168,236,0.28)" />
                    <stop offset="55%" stopColor="rgba(96,168,236,0.10)" />
                    <stop offset="100%" stopColor="rgba(96,168,236,0)" />
                </radialGradient>
            </defs>
            <circle cx={x} cy={y} r={radiusPx * 2.4} fill="url(#earth-outer-glow)" />
            <circle cx={x} cy={y} r={radiusPx * 1.08} fill="none" stroke="rgba(124,211,255,0.18)" strokeWidth={0.6} />
        </g>
    );
}

export function MoonLayer({ layout }: { layout: RadarLayoutResult }) {
    const { x, y } = layout.moon;
    const radiusPx = visualMoonRadius(layout);
    return (
        <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <circle cx={x} cy={y} r={radiusPx * 1.8} fill="rgba(225,229,236,0.12)" />
            <circle cx={x} cy={y} r={radiusPx * 1.05} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
        </g>
    );
}

export function visualMoonRadius(layout: RadarLayoutResult): number {
    return Math.max(layout.moon.radiusPx, layout.earth.radiusPx * 0.273, 14);
}

export function SunLayer({ layout }: { layout: RadarLayoutResult }) {
    if (!layout.sun.visible) return null;
    const { x, y, radiusPx, opacity } = layout.sun;
    return (
        <g aria-hidden="true" style={{ opacity }}>
            <circle cx={x} cy={y} r={radiusPx * 1.8} fill="rgba(255,196,108,0.10)" />
            <circle cx={x} cy={y} r={radiusPx} fill="rgba(255,196,108,0.22)" stroke="rgba(255,196,108,0.6)" strokeWidth="0.9" />
            <circle cx={x} cy={y} r={radiusPx * 0.5} fill="rgba(255,206,128,0.9)" />
        </g>
    );
}

export function VectorsLayer({ layout, referenceMode }: { layout: RadarLayoutResult; referenceMode: HorizonsReferenceMode }) {
    if (layout.vectors.length === 0) return null;
    const isCurrent = referenceMode === 'current';
    const futureStroke = isCurrent ? 'rgba(118,228,181,0.85)' : 'rgba(118,228,181,0.32)';
    const futureWidth = isCurrent ? 2.2 : 1.0;
    const pastStroke = isCurrent ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.14)';
    const pastWidth = isCurrent ? 1.4 : 0.8;

    return (
        <g aria-hidden="true">
            <defs>
                <marker id="vector-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill={futureStroke} />
                </marker>
            </defs>
            {layout.vectors.map((vector) => (
                <g key={vector.objectId}>
                    <line x1={vector.past.x} y1={vector.past.y} x2={vector.current.x} y2={vector.current.y} stroke={pastStroke} strokeWidth={pastWidth} strokeLinecap="round" strokeDasharray="3 3" />
                    <line x1={vector.current.x} y1={vector.current.y} x2={vector.future.x} y2={vector.future.y} stroke={futureStroke} strokeWidth={futureWidth} strokeLinecap="round" markerEnd={isCurrent ? 'url(#vector-arrow)' : undefined} />
                </g>
            ))}
        </g>
    );
}

export function NowTrajectoriesLayer({ layout }: { layout: RadarLayoutResult }) {
    const trajectories = layout.nowTrajectories;
    if (!trajectories || trajectories.length === 0) return null;

    return (
        <g aria-hidden="true">
            <defs>
                <marker id="now-traj-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="rgba(118,228,181,0.95)" />
                </marker>
            </defs>
            {trajectories.map((traj: LayoutNowTrajectory) => (
                <g key={`now-traj-${traj.objectId}`}>
                    {traj.pastPathPx ? (
                        <path d={traj.pastPathPx} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.0} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 4" />
                    ) : null}
                    {traj.futurePathPx ? (
                        <path d={traj.futurePathPx} fill="none" stroke="rgba(118,228,181,0.9)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#now-traj-arrow)" />
                    ) : null}
                    {traj.currentPoint ? (
                        <g>
                            <circle cx={traj.currentPoint.x} cy={traj.currentPoint.y} r={5.5} fill="none" stroke="rgba(118,228,181,0.55)" strokeWidth={1.2} />
                            <circle cx={traj.currentPoint.x} cy={traj.currentPoint.y} r={2.6} fill="rgba(118,228,181,1)" />
                        </g>
                    ) : null}
                </g>
            ))}
        </g>
    );
}

export function TrajectoryLayer({ layout, referenceMode }: { layout: RadarLayoutResult; referenceMode: HorizonsReferenceMode }) {
    if (!layout.trajectory) return null;
    const closestMode = referenceMode === 'closest_approach';
    const pathOpacity = closestMode ? 0.78 : 0.45;
    const closestPoint = layout.trajectory.closestPoint;

    return (
        <g aria-hidden="true">
            <path d={layout.trajectory.pathPx} fill="none" stroke={`rgba(118,228,181,${pathOpacity})`} strokeWidth={closestMode ? 1.8 : 1.2} strokeLinecap="round" strokeLinejoin="round" />
            {closestPoint ? (
                <g>
                    <circle cx={closestPoint.x} cy={closestPoint.y} r={closestMode ? 18 : 11} fill="none" stroke="rgba(84,214,214,0.28)" strokeWidth={1.2} />
                    <circle cx={closestPoint.x} cy={closestPoint.y} r={closestMode ? 6 : 4} fill="rgba(84,214,214,1)" stroke="rgba(255,255,255,0.9)" strokeWidth={1} />
                </g>
            ) : null}
        </g>
    );
}

export function ObjectsLayer({ layout, onSelect, referenceMode, t, locale }: {
    layout: RadarLayoutResult;
    onSelect?: (approach: UnifiedApproach) => void;
    referenceMode: HorizonsReferenceMode;
    t: Translator;
    locale: 'pt-BR' | 'en';
}) {
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
                <ObjectMarker key={object.id} object={object} onSelect={onSelect} referenceMode={referenceMode} t={t} locale={locale} />
            ))}
        </g>
    );
}

function ObjectMarker({ object, onSelect, referenceMode, t, locale }: {
    object: LayoutObject;
    onSelect?: (approach: UnifiedApproach) => void;
    referenceMode: HorizonsReferenceMode;
    t: Translator;
    locale: 'pt-BR' | 'en';
}) {
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

            <foreignObject className="pointer-events-none opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} style={{ overflow: 'visible' }}>
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

export function LabelsLayer({ layout }: { layout: RadarLayoutResult }) {
    return (
        <g aria-hidden="true">
            {layout.labels.filter((label) => label.visible && label.kind !== 'ring' && label.kind !== 'ring-guide').map((label) => (
                <text
                    key={label.id}
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    fontSize={label.fontSizePx}
                    fontWeight={label.kind === 'moon' || label.kind === 'closest' ? 600 : label.kind === 'ring' ? 500 : 400}
                    fill={
                        label.kind === 'moon' ? 'rgba(255,255,255,0.92)'
                        : label.kind === 'closest' ? 'rgba(180,240,240,1)'
                        : label.kind === 'ring' ? 'rgba(255,255,255,0.75)'
                        : 'rgba(255,255,255,0.42)'
                    }
                    style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,28,0.85)', strokeWidth: 3, strokeLinejoin: 'round' }}
                >
                    {label.text}
                </text>
            ))}
        </g>
    );
}

// ─── Helpers ────────────────────────────────────────────────

function TooltipRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">{label}</dt>
            <dd className="text-right font-medium text-white/85">{children}</dd>
        </div>
    );
}

function formatDateTimeUTC(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(parsed);
}

function symbolicTooltipText(kind: HorizonsFailureKind | null, t: Translator): string {
    if (kind === 'horizons_transient') return t('observatory.radar.tooltip.symbolic.horizons_transient');
    if (kind === 'no_ephemeris') return t('observatory.radar.tooltip.symbolic.no_ephemeris');
    if (kind === 'no_orbital_data') return t('observatory.radar.tooltip.symbolic.no_orbital_data');
    return t('observatory.radar.tooltip.symbolic');
}

export function formatRingHoverLabel(ld: number): string {
    const value = ld >= 1 ? String(ld) : ld.toString().replace('.', ',');
    return `${value} DL`;
}

export function RadarGlobeLayer({ layout, zoom, canvasSize, children }: {
    layout: RadarLayoutResult;
    zoom: number;
    canvasSize: { width: number; height: number };
    moonRadius: number;
    children: (scaledX: number, scaledY: number, scaledRadius: number) => React.ReactNode;
}) {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scaledX = centerX + (layout.earth.x - centerX) * zoom;
    const scaledY = centerY + (layout.earth.y - centerY) * zoom;
    const scaledRadius = layout.earth.radiusPx * zoom * 1.12;
    if (canvasSize.width < 2 || canvasSize.height < 2 || scaledRadius * 2 < 8) return null;
    return <>{children(scaledX, scaledY, scaledRadius)}</>;
}

// Ícone de referência para legend
export { Target };
