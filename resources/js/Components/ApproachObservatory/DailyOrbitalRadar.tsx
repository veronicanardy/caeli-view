import { Link } from '@inertiajs/react';
import { Minus, Plus, RotateCcw, SatelliteDish, Sun, Target } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Translator } from '@/i18n';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactKm, compactMeters, formatNumber, lunarDistanceLabel } from '@/lib/format';
import {
    buildRadarObjects,
    RadarObject,
    radarQualityCounts,
} from '@/lib/radarData';
import {
    buildRadarLayout,
    LayoutObject,
    LayoutRing,
    LayoutNowTrajectory,
    NowTrajectoryInput,
    RadarLayoutResult,
    TrajectoryInput,
} from '@/lib/radarLayout';
import {
    AsteroidTrajectory,
    HomeEarthImage,
    HorizonsPositionResult,
    HorizonsReferenceMode,
    LunarReference,
    RadarMode,
    SunDirection,
    UnifiedApproach,
} from '@/types';
import { EarthGlobe } from '@/Components/Nasa/EarthGlobe';
import { Moon3D } from './Bodies/Moon/Moon3D';
import { AsteroidMarkerShape } from './Presenters/AsteroidMarkerShape';
import { ObjectTypeBadge } from './Presenters/ObjectTypeBadge';
import { RadarFilters } from './Controls/RadarFilters';

type Props = {
    approaches: UnifiedApproach[];
    positionsById: Record<string, HorizonsPositionResult>;
    sunDirection: SunDirection | null;
    positionsLoading: boolean;
    referenceMode: HorizonsReferenceMode;
    onReferenceModeChange: (mode: HorizonsReferenceMode) => void;
    earthImage: HomeEarthImage | null;
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    t: Translator;
    selectedDate: string;
    selectedId?: string | null;
    trajectory?: AsteroidTrajectory | null;
    trajectoryLoading?: boolean;
    onSelect?: (approach: UnifiedApproach) => void;
    onClearSelection?: () => void;
    emptyMessage?: string | null;
    controls?: ReactNode;
    sidePanel?: ReactNode;
    /** Which view of the data is being shown. Controls header copy and the trajectory layer. */
    radarMode: RadarMode;
    onRadarModeChange: (mode: RadarMode) => void;
    /** When the parent already supplies real Horizons trajectories per object (closest-5-now mode),
     * the radar draws those as past/current/future polylines instead of the synthetic ±30min
     * tangent vectors. */
    nowTrajectoriesByObjectId?: Record<string, AsteroidTrajectory>;
};

type RingHoverState = {
    ld: number;
    x: number;
    y: number;
} | null;

const RINGS_LD = [0.5, 1, 5, 20, 50, 100, 150];

export function DailyOrbitalRadar({
    approaches,
    positionsById,
    sunDirection,
    positionsLoading,
    referenceMode,
    onReferenceModeChange,
    earthImage: _earthImage,
    lunarReference,
    locale,
    t,
    selectedDate,
    selectedId = null,
    trajectory = null,
    trajectoryLoading = false,
    onSelect,
    onClearSelection,
    emptyMessage = null,
    controls = null,
    sidePanel = null,
    radarMode,
    onRadarModeChange,
    nowTrajectoriesByObjectId,
}: Props) {
    const en = locale === 'en';
    const [zoom, setZoom] = useState(0.85);
    const [hoveredRing, setHoveredRing] = useState<RingHoverState>(null);

    const radarObjects = useMemo(
        () => buildRadarObjects(approaches, positionsById),
        [approaches, positionsById],
    );

    // The mode counts what the parent decided to fetch, not a client-side filter — so each
    // mode's count is just the size of what's currently in `approaches`.
    const counts = useMemo<Partial<Record<RadarMode, number>>>(() => ({
        [radarMode]: radarObjects.length,
    }), [radarMode, radarObjects.length]);

    const visibleObjects = radarObjects;

    // ----- Canvas measurement via ResizeObserver -----
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 960, height: 820 });

    useLayoutEffect(() => {
        if (!canvasRef.current) return;
        const element = canvasRef.current;
        const update = () => {
            const rect = element.getBoundingClientRect();
            setSize({ width: rect.width, height: rect.height });
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // ----- Trajectory adapter -----
    const trajectoryInput = useMemo<TrajectoryInput | null>(() => {
        if (!trajectory || trajectory.status !== 'available' || trajectory.points.length < 2) return null;
        return {
            objectId: trajectory.objectId,
            closestApproachTime: trajectory.closestApproachTime ?? null,
            points: trajectory.points.map((point) => ({
                x: point.x,
                y: point.y,
                z: point.z ?? null,
                distanceKm: point.distanceKm,
                timestamp: point.timestamp,
            })),
        };
    }, [trajectory]);

    // Real Horizons trajectories segmented around "now" — one per visible object — for the
    // closest-5-now mode. Past/current/future are drawn from real ephemerides instead of the
    // synthetic ±30min tangent.
    const nowTrajectoryInputs = useMemo<NowTrajectoryInput[]>(() => {
        if (!nowTrajectoriesByObjectId) return [];
        const inputs: NowTrajectoryInput[] = [];
        for (const object of visibleObjects) {
            const trajectory = nowTrajectoriesByObjectId[object.approach.id];
            if (!trajectory || trajectory.status !== 'available') continue;
            const past = trajectory.pastPoints ?? [];
            const future = trajectory.futurePoints ?? [];
            const current = trajectory.currentPoint ?? null;
            if (past.length === 0 && future.length === 0 && !current) continue;
            inputs.push({
                objectId: object.approach.id,
                past: past.map((p) => ({ x: p.x, y: p.y, z: p.z ?? null, distanceKm: p.distanceKm, timestamp: p.timestamp })),
                future: future.map((p) => ({ x: p.x, y: p.y, z: p.z ?? null, distanceKm: p.distanceKm, timestamp: p.timestamp })),
                current: current
                    ? { x: current.x, y: current.y, z: current.z ?? null, distanceKm: current.distanceKm, timestamp: current.timestamp }
                    : null,
            });
        }
        return inputs;
    }, [nowTrajectoriesByObjectId, visibleObjects]);

    // ----- Layout (pure) -----
    const layout = useMemo<RadarLayoutResult>(() => buildRadarLayout({
        width: size.width,
        height: size.height,
        mode: referenceMode,
        zoom,
        objects: visibleObjects,
        selectedId,
        sun: sunDirection,
        ringsLD: RINGS_LD,
        closestApproachTrajectory: trajectoryInput,
        nowTrajectories: nowTrajectoryInputs,
    }), [size.width, size.height, referenceMode, zoom, visibleObjects, selectedId, sunDirection, trajectoryInput, nowTrajectoryInputs]);

    const zoomIn = () => setZoom((value) => Math.min(1.65, Number((value + 0.15).toFixed(2))));
    const zoomOut = () => setZoom((value) => Math.max(0.75, Number((value - 0.15).toFixed(2))));
    const resetZoom = () => setZoom(0.85);

    return (
        <section className="space-y-4 transition-all duration-500 ease-out">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-glow transition-all duration-500 ease-out sm:p-5">
                {/* Header */}
                <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h2 className="text-xl font-semibold text-white">{t('observatory.radar.title')}</h2>
                            <ModeBadge referenceMode={referenceMode} t={t} />
                        </div>
                        <PositionStatusLine
                            positionsLoading={positionsLoading}
                            objects={radarObjects}
                            referenceMode={referenceMode}
                            radarMode={radarMode}
                            t={t}
                        />
                    </div>
                    <ReferenceModeToggle value={referenceMode} onChange={onReferenceModeChange} t={t} />
                </header>

                {/* Support row */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/8 pt-3">
                    <RadarFilters activeId={radarMode} onChange={onRadarModeChange} counts={counts} t={t} />
                    <RadarLegendChips t={t} />
                </div>

                {/* Canvas — given generous space so the Earth can breathe */}
                <div
                    ref={canvasRef}
                    className="space-grid relative mt-4 h-[72vh] min-h-[640px] overflow-hidden rounded-lg border border-white/10 bg-space-950/82 transition-all duration-500 ease-out sm:h-[78vh] sm:min-h-[760px] lg:h-[82vh] lg:min-h-[860px]"
                >
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="star-field absolute inset-0 opacity-30" aria-hidden="true" />
                    </div>

                    {controls ? (
                        <div
                            className="absolute left-3 top-3 z-50 w-[min(760px,calc(100%-6.5rem))] lg:w-[min(760px,calc(100%-4rem))]"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            {controls}
                        </div>
                    ) : null}

                    {sidePanel ? (
                        <div
                            className="absolute bottom-3 left-3 top-20 z-40 hidden w-[min(24rem,36%)] min-w-[21rem] overflow-auto rounded-xl border border-white/10 bg-space-950/78 shadow-glow backdrop-blur-xl lg:block"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            {sidePanel}
                        </div>
                    ) : null}

                    {emptyMessage ? (
                        <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl border border-red-400/55 bg-red-950/75 px-5 py-3 text-sm font-medium text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.25)] backdrop-blur">
                            {emptyMessage}
                        </div>
                    ) : null}

                    {/* 3D Earth globe layer — sits behind the SVG so vectors/rings/asteroids overlay it.
                        pointer-events: none keeps asteroid clicks/hover working through it. */}
                    <EarthGlobeLayer layout={layout} zoom={zoom} canvasSize={size} />
                    <div className="absolute right-3 top-3 z-40 flex items-center gap-1 rounded-full border border-white/10 bg-space-950/85 p-1 shadow-glow backdrop-blur">
                        <ZoomButton label={en ? 'Zoom in' : 'Aproximar'} onClick={zoomIn} icon={Plus} />
                        <ZoomButton label={en ? 'Zoom out' : 'Afastar'} onClick={zoomOut} icon={Minus} />
                        <ZoomButton label={en ? 'Reset' : 'Resetar'} onClick={resetZoom} icon={RotateCcw} />
                        <span className="px-2 text-[10px] tabular-nums text-white/55">{Math.round(zoom * 100)}%</span>
                    </div>

                    {/* The whole radar lives in a single SVG */}
                    <svg
                        className="absolute inset-0 size-full"
                        viewBox={`0 0 ${size.width} ${size.height}`}
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label={t('observatory.radar.title')}
                        onClick={() => onClearSelection?.()}
                    >
                        <g style={{ transform: `scale(${zoom})`, transformOrigin: `${size.width / 2}px ${size.height / 2}px`, transition: 'transform 220ms ease-out' }}>
                            <RingsLayer layout={layout} hoveredRingLD={hoveredRing?.ld ?? null} onRingHoverChange={setHoveredRing} />
                            <NowTrajectoriesLayer layout={layout} />
                            <TrajectoryLayer layout={layout} referenceMode={referenceMode} />
                            <VectorsLayer layout={layout} referenceMode={referenceMode} />
                            <SunLayer layout={layout} />
                            <EarthLayer layout={layout} />
                            <MoonGlobeLayer layout={layout} zoom={zoom} canvasSize={size} />
                            <MoonLayer layout={layout} />
                            <ObjectsLayer
                                layout={layout}
                                onSelect={onSelect}
                                referenceMode={referenceMode}
                                t={t}
                                locale={locale}
                            />
                            <LabelsLayer layout={layout} />
                        </g>
                    </svg>

                    <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex flex-col items-start gap-1">
                        <div className="rounded-full border border-white/10 bg-space-950/82 px-3 py-1 text-[11px] text-white/65 backdrop-blur">
                            1 DL = {formatNumber(lunarReference.distanceKm, 0)} km
                        </div>
                        {layout.scaleCompressed ? (
                            <div className="rounded-full border border-white/10 bg-space-950/82 px-3 py-1 text-[10px] text-white/55 backdrop-blur">
                                {t('observatory.radar.scale.compressed')}
                            </div>
                        ) : null}
                    </div>

                    {trajectoryLoading ? (
                        <div className="absolute right-3 bottom-3 z-30 rounded-full border border-white/10 bg-space-950/85 px-3 py-1 text-[11px] text-white/65 backdrop-blur">
                            {en ? 'Loading focused trajectory...' : 'Carregando trajetória do objeto em foco...'}
                        </div>
                    ) : null}

                    {hoveredRing !== null ? (
                        <div
                            className="pointer-events-none absolute z-40 rounded-full border border-signal-cyan/30 bg-space-950/92 px-3 py-1 text-[11px] text-signal-cyan/80 backdrop-blur"
                            style={{ left: hoveredRing.x + 14, top: hoveredRing.y - 12 }}
                        >
                            {formatRingHoverLabel(hoveredRing.ld)}
                        </div>
                    ) : null}
                </div>
            </div>

            <p className="rounded-lg border border-white/8 bg-white/[0.025] px-4 py-2.5 text-[11px] leading-5 text-white/55">
                <strong className="font-semibold text-white/80">{en ? 'How to read' : 'Como ler'}:</strong>{' '}
                {t('observatory.radar.scale.hint')} {t('observatory.radar.scale.hintSecondary')}
            </p>

            <SelectedDateLine selectedDate={selectedDate} radarObjectsCount={radarObjects.length} t={t} locale={locale} />
        </section>
    );
}

// ============================================================
// SVG layers
// ============================================================

function RingsLayer({
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


function EarthLayer({ layout }: { layout: RadarLayoutResult }) {
    // The Earth *disk* is rendered by the 3D <EarthGlobeLayer/> behind the SVG.
    // Here we only paint the SVG-side embellishments: outer glow, atmosphere halo, and a faint
    // outer ring. These need to live in the SVG so they composite correctly with the rings/vectors.
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

            {/* Far outer glow — sits beyond the globe's atmosphere for depth */}
            <circle cx={x} cy={y} r={radiusPx * 2.4} fill="url(#earth-outer-glow)" />
            {/* Faint sealing ring just outside the globe */}
            <circle cx={x} cy={y} r={radiusPx * 1.08} fill="none" stroke="rgba(124,211,255,0.18)" strokeWidth={0.6} />
        </g>
    );
}

function EarthGlobeLayer({ layout, zoom, canvasSize }: {
    layout: RadarLayoutResult;
    zoom: number;
    canvasSize: { width: number; height: number };
}) {
    const { x, y, radiusPx } = layout.earth;
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scaledX = centerX + (x - centerX) * zoom;
    const scaledY = centerY + (y - centerY) * zoom;
    const scaledRadius = radiusPx * zoom * 1.12;
    const diameter = scaledRadius * 2;

    if (canvasSize.width < 2 || canvasSize.height < 2 || diameter < 8) return null;

    return (
        <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
                left: scaledX - scaledRadius,
                top: scaledY - scaledRadius,
                width: diameter,
                height: diameter,
                transition: 'left 220ms ease-out, top 220ms ease-out, width 220ms ease-out, height 220ms ease-out',
                zIndex: 5,
            }}
        >
            <EarthGlobe autoRotate pointOfViewAltitude={1.6} className="size-full" />
        </div>
    );
}

function MoonLayer({ layout }: { layout: RadarLayoutResult }) {
    const { x, y } = layout.moon;
    const radiusPx = visualMoonRadius(layout);
    return (
        <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <circle cx={x} cy={y} r={radiusPx * 1.8} fill="rgba(225,229,236,0.12)" />
            <circle cx={x} cy={y} r={radiusPx * 1.05} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
        </g>
    );
}

function MoonGlobeLayer({ layout, zoom, canvasSize }: {
    layout: RadarLayoutResult;
    zoom: number;
    canvasSize: { width: number; height: number };
}) {
    const { x, y } = layout.moon;
    const visualRadiusPx = visualMoonRadius(layout);
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scaledX = centerX + (x - centerX) * zoom;
    const scaledY = centerY + (y - centerY) * zoom;
    const scaledRadius = visualRadiusPx * zoom;
    const diameter = scaledRadius * 2;
    if (canvasSize.width < 2 || canvasSize.height < 2 || diameter < 8) return null;

    // EarthGlobe uses OrbitControls autoRotateSpeed=0.45. Moon uses ~1/27.32 of that.
    const moonRotationSpeed = 0.45 / 27.32;

    return (
        <div
            className="pointer-events-none absolute"
            aria-hidden="true"
            style={{
                left: scaledX - scaledRadius,
                top: scaledY - scaledRadius,
                width: diameter,
                height: diameter,
                transition: 'left 220ms ease-out, top 220ms ease-out, width 220ms ease-out, height 220ms ease-out',
                zIndex: 12,
            }}
        >
            <Moon3D sizePx={diameter} autoRotate autoRotateSpeed={moonRotationSpeed} label="Lua 3D" />
        </div>
    );
}

function visualMoonRadius(layout: RadarLayoutResult): number {
    // Physical proportion: Moon radius ~27.3% of Earth's radius.
    // Keep a minimum for readability on smaller canvases.
    return Math.max(layout.moon.radiusPx, layout.earth.radiusPx * 0.273, 14);
}

function SunLayer({ layout }: { layout: RadarLayoutResult }) {
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

function VectorsLayer({ layout, referenceMode }: { layout: RadarLayoutResult; referenceMode: HorizonsReferenceMode }) {
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
                    <line
                        x1={vector.past.x}
                        y1={vector.past.y}
                        x2={vector.current.x}
                        y2={vector.current.y}
                        stroke={pastStroke}
                        strokeWidth={pastWidth}
                        strokeLinecap="round"
                        strokeDasharray="3 3"
                    />
                    <line
                        x1={vector.current.x}
                        y1={vector.current.y}
                        x2={vector.future.x}
                        y2={vector.future.y}
                        stroke={futureStroke}
                        strokeWidth={futureWidth}
                        strokeLinecap="round"
                        markerEnd={isCurrent ? 'url(#vector-arrow)' : undefined}
                    />
                </g>
            ))}
        </g>
    );
}

function NowTrajectoriesLayer({ layout }: { layout: RadarLayoutResult }) {
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
                        <path
                            d={traj.pastPathPx}
                            fill="none"
                            stroke="rgba(255,255,255,0.35)"
                            strokeWidth={1.0}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="3 4"
                        />
                    ) : null}
                    {traj.futurePathPx ? (
                        <path
                            d={traj.futurePathPx}
                            fill="none"
                            stroke="rgba(118,228,181,0.9)"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            markerEnd="url(#now-traj-arrow)"
                        />
                    ) : null}
                    {traj.currentPoint ? (
                        <g>
                            <circle
                                cx={traj.currentPoint.x}
                                cy={traj.currentPoint.y}
                                r={5.5}
                                fill="none"
                                stroke="rgba(118,228,181,0.55)"
                                strokeWidth={1.2}
                            />
                            <circle
                                cx={traj.currentPoint.x}
                                cy={traj.currentPoint.y}
                                r={2.6}
                                fill="rgba(118,228,181,1)"
                            />
                        </g>
                    ) : null}
                </g>
            ))}
        </g>
    );
}

function TrajectoryLayer({ layout, referenceMode }: { layout: RadarLayoutResult; referenceMode: HorizonsReferenceMode }) {
    if (!layout.trajectory) return null;
    const closestMode = referenceMode === 'closest_approach';
    const pathOpacity = closestMode ? 0.78 : 0.45;
    const closestHaloR = closestMode ? 18 : 11;
    const closestCoreR = closestMode ? 6 : 4;
    const closestPoint = layout.trajectory.closestPoint;

    return (
        <g aria-hidden="true">
            <path
                d={layout.trajectory.pathPx}
                fill="none"
                stroke={`rgba(118,228,181,${pathOpacity})`}
                strokeWidth={closestMode ? 1.8 : 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {closestPoint ? (
                <g>
                    <circle cx={closestPoint.x} cy={closestPoint.y} r={closestHaloR} fill="none" stroke="rgba(84,214,214,0.28)" strokeWidth={1.2} />
                    <circle cx={closestPoint.x} cy={closestPoint.y} r={closestCoreR} fill="rgba(84,214,214,1)" stroke="rgba(255,255,255,0.9)" strokeWidth={1} />
                </g>
            ) : null}
        </g>
    );
}

function ObjectsLayer({ layout, onSelect, referenceMode, t, locale }: {
    layout: RadarLayoutResult;
    onSelect?: (approach: UnifiedApproach) => void;
    referenceMode: HorizonsReferenceMode;
    t: Translator;
    locale: 'pt-BR' | 'en';
}) {
    return (
        <g>
            {/* Secondary DL rings — drawn first so markers sit on top of them. Only for objects with a real distance. */}
            <g aria-hidden="true">
                {layout.objects.map((object) => (
                    object.isSelected && object.secondaryRingLD !== null ? (
                        <circle
                            key={`secondary-ring-${object.id}`}
                            cx={layout.center.x}
                            cy={layout.center.y}
                            r={object.orbitRadiusPx}
                            fill="none"
                            stroke="rgba(84,214,214,0.58)"
                            strokeWidth={1}
                            strokeDasharray="2 6"
                        />
                    ) : null
                ))}
            </g>

            {layout.objects.map((object) => (
                <ObjectMarker
                    key={object.id}
                    object={object}
                    onSelect={onSelect}
                    referenceMode={referenceMode}
                    t={t}
                    locale={locale}
                />
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
            {object.isClosest ? (
                <circle cx={object.x} cy={object.y} r={r * 1.9} fill="none" stroke="rgba(84,214,214,0.5)" strokeWidth={1.2} />
            ) : null}
            {object.isSelected ? (
                <circle cx={object.x} cy={object.y} r={r * 1.55} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} />
            ) : null}

            {/* Marker shape via foreignObject so the existing AsteroidMarkerShape stays reusable */}
            <foreignObject x={object.x - r} y={object.y - r} width={r * 2} height={r * 2}>
                <div style={{ width: r * 2, height: r * 2 }}>
                    {object.hasHorizonsPosition ? (
                        <AsteroidMarkerShape seed={object.id} type={object.approach.objectType} sizePx={r * 2} />
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                border: '1.5px dashed rgba(255,255,255,0.6)',
                                background: 'rgba(255,255,255,0.04)',
                            }}
                        />
                    )}
                </div>
            </foreignObject>

            {/* Tooltip on hover via foreignObject */}
            <foreignObject
                className="pointer-events-none opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                style={{ overflow: 'visible' }}
            >
                <div className="w-full rounded-lg border border-white/10 bg-space-950/95 p-3 text-left text-xs leading-5 text-white/75 shadow-glow">
                    <p className="text-sm font-semibold text-white">{identity.displayName}</p>
                    {identity.subtitle ? <p className="mt-0.5 text-[11px] text-white/55">{identity.subtitle}</p> : null}
                    <div className="mt-2 flex"><ObjectTypeBadge type={object.approach.objectType} /></div>
                    <p className="mt-2 text-[11px] text-white/75">
                        {object.hasHorizonsPosition
                            ? (referenceMode === 'current'
                                ? t('observatory.radar.tooltip.horizonsCurrent').replace('{time}', formatDateTimeUTC(object.source.currentPositionTime, locale))
                                : t('observatory.radar.tooltip.horizonsClosest').replace('{time}', formatDateTimeUTC(object.source.currentPositionTime, locale)))
                            : t('observatory.radar.tooltip.symbolic')}
                    </p>
                    <dl className="mt-2 space-y-0.5 text-[11px]">
                        <Row label={t('observatory.radar.tooltip.closestTime')}>{formatDateTimeUTC(object.source.closestApproachTime, locale)}</Row>
                        <Row label={t('observatory.radar.tooltip.closestDistance')}>
                            {compactKm(object.source.distanceKm)}
                            {object.source.distanceLD !== null ? <span className="text-white/45"> · {lunarDistanceLabel(object.source.distanceLD)}</span> : null}
                        </Row>
                        {object.source.relativeVelocityKph !== null ? (
                            <Row label={locale === 'en' ? 'Velocity' : 'Velocidade'}>
                                {formatNumber(object.source.relativeVelocityKph, 0)} km/h
                            </Row>
                        ) : null}
                        {object.source.diameterMeters !== null ? (
                            <Row label={locale === 'en' ? 'Diameter' : 'Diametro'}>{compactMeters(object.source.diameterMeters)}</Row>
                        ) : null}
                    </dl>
                </div>
            </foreignObject>
        </g>
    );

    if (onSelect) {
        return (
            <g
                aria-label={identity.displayName}
                onClick={(event) => {
                    event.stopPropagation();
                    onSelect(object.approach);
                }}
            >
                {inner}
            </g>
        );
    }

    return (
        <Link href={object.approach.detailRoute} aria-label={identity.displayName}>
            {inner}
        </Link>
    );
}

function LabelsLayer({ layout }: { layout: RadarLayoutResult }) {
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
                        label.kind === 'moon'
                            ? 'rgba(255,255,255,0.92)'
                            : label.kind === 'closest'
                                ? 'rgba(180,240,240,1)'
                                : label.kind === 'ring'
                                    ? 'rgba(255,255,255,0.75)'
                                    : 'rgba(255,255,255,0.42)' // ring-guide
                    }
                    style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,28,0.85)', strokeWidth: 3, strokeLinejoin: 'round' }}
                >
                    {label.text}
                </text>
            ))}
        </g>
    );
}

// ============================================================
// Helpers
// ============================================================

function ModeBadge({ referenceMode, t }: { referenceMode: HorizonsReferenceMode; t: Translator }) {
    if (referenceMode === 'current') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/45 bg-signal-cyan/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-cyan">
                <SatelliteDish className="size-3" aria-hidden="true" />
                {t('observatory.radar.modeBadge.current')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-signal-mint/45 bg-signal-mint/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-mint">
            <Target className="size-3" aria-hidden="true" />
            {t('observatory.radar.modeBadge.closestApproach')}
        </span>
    );
}

function ReferenceModeToggle({ value, onChange, t }: { value: HorizonsReferenceMode; onChange: (mode: HorizonsReferenceMode) => void; t: Translator }) {
    return (
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-space-950/65 p-1 text-[11px]" role="tablist" aria-label={t('observatory.radar.toggle.aria')}>
            <ToggleButton active={value === 'current'} onClick={() => onChange('current')} label={t('observatory.radar.toggle.current')} />
            <ToggleButton active={value === 'closest_approach'} onClick={() => onChange('closest_approach')} label={t('observatory.radar.toggle.closestApproach')} />
        </div>
    );
}

function ZoomButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Plus; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="inline-flex size-7 items-center justify-center rounded-full text-white/75 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
        >
            <Icon className="size-3.5" aria-hidden="true" />
        </button>
    );
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={[
                'rounded-full px-3 py-1 font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white',
            ].join(' ')}
        >
            {label}
        </button>
    );
}

function PositionStatusLine({ positionsLoading, objects, referenceMode, radarMode, t }: { positionsLoading: boolean; objects: RadarObject[]; referenceMode: HorizonsReferenceMode; radarMode: RadarMode; t: Translator }) {
    const counts = radarQualityCounts(objects);

    if (positionsLoading && counts.withHorizons === 0) {
        const loadingKey = radarMode === 'closest-5-now'
            ? 'observatory.radar.status.loadingClosestNow'
            : referenceMode === 'current'
                ? 'observatory.radar.status.loadingCurrent'
                : 'observatory.radar.status.loadingClosest';
        return (
            <p className="mt-1 flex items-center gap-2 text-xs text-white/55">
                <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan" aria-hidden="true" />
                {t(loadingKey)}
            </p>
        );
    }

    if (radarMode === 'closest-5-now') {
        return (
            <p className="mt-1 text-xs text-white/60">
                {t('observatory.radar.status.closestNow').replace('{count}', String(counts.total))}
            </p>
        );
    }

    return (
        <p className="mt-1 text-xs text-white/60">
            {t('observatory.radar.status.summary')
                .replace('{total}', String(counts.total))
                .replace('{horizons}', String(counts.withHorizons))
                .replace('{symbolic}', String(counts.symbolic))}
        </p>
    );
}

function RadarLegendChips({ t }: { t: Translator }) {
    return (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
            <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-signal-cyan" aria-hidden="true" />
                {t('observatory.radar.legend.horizons')}
            </li>
            <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full border border-dashed border-white/70 bg-transparent" aria-hidden="true" />
                {t('observatory.radar.legend.symbolic')}
            </li>
            <li className="inline-flex items-center gap-1.5">
                <Target className="size-3 text-signal-cyan" aria-hidden="true" />
                {t('observatory.radar.legend.closest')}
            </li>
            <li className="inline-flex items-center gap-1.5 text-signal-amber/85" title={t('observatory.radar.sun.description')}>
                <Sun className="size-3" aria-hidden="true" />
                {t('observatory.radar.sun.title')}
            </li>
        </ul>
    );
}

function SelectedDateLine({ selectedDate, radarObjectsCount, t, locale }: { selectedDate: string; radarObjectsCount: number; t: Translator; locale: 'pt-BR' | 'en' }) {
    const dateLabel = formatSelectedDay(selectedDate, locale);
    return (
        <p className="text-xs text-white/45">
            {t('observatory.radar.footer')
                .replace('{count}', String(radarObjectsCount))
                .replace('{date}', dateLabel)}
        </p>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(parsed);
}

function formatSelectedDay(value: string, locale: 'pt-BR' | 'en'): string {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

function formatRingHoverLabel(ld: number): string {
    const value = ld >= 1 ? String(ld) : ld.toString().replace('.', ',');
    return `${value} DL`;
}
