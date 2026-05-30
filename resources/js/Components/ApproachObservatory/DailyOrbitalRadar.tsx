import { Minus, Plus, RotateCcw, SatelliteDish, Sun, Target } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Translator } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { buildRadarObjects, RadarObject, radarQualityCounts } from '@/lib/radarData';
import { buildRadarLayout, NowTrajectoryInput, RadarLayoutResult, TrajectoryInput } from '@/lib/radarLayout';
import { AsteroidTrajectory, HomeEarthImage, HorizonsPositionResult, HorizonsReferenceMode, LunarReference, RadarMode, SunDirection, UnifiedApproach } from '@/types';
import { EarthGlobe } from '@/Components/Nasa/EarthGlobe';
import { Moon3D } from './Bodies/Moon/Moon3D';
import { RadarFilters } from './Controls/RadarFilters';
import {
    EarthLayer, LabelsLayer, MoonLayer, NowTrajectoriesLayer, ObjectsLayer,
    RingsLayer, SunLayer, TrajectoryLayer, VectorsLayer,
    formatRingHoverLabel, visualMoonRadius,
    type RingHoverState,
} from './Overlays/RadarSvgLayers';

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

function formatSelectedDay(value: string, locale: 'pt-BR' | 'en'): string {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

function EarthGlobeLayer({ layout, zoom, canvasSize }: { layout: RadarLayoutResult; zoom: number; canvasSize: { width: number; height: number } }) {
    const { x, y, radiusPx } = layout.earth;
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scaledX = centerX + (x - centerX) * zoom;
    const scaledY = centerY + (y - centerY) * zoom;
    const scaledRadius = radiusPx * zoom * 1.12;
    const diameter = scaledRadius * 2;
    if (canvasSize.width < 2 || canvasSize.height < 2 || diameter < 8) return null;
    return (
        <div className="pointer-events-none absolute" aria-hidden="true" style={{ left: scaledX - scaledRadius, top: scaledY - scaledRadius, width: diameter, height: diameter, transition: 'left 220ms ease-out, top 220ms ease-out, width 220ms ease-out, height 220ms ease-out', zIndex: 5 }}>
            <EarthGlobe autoRotate pointOfViewAltitude={1.6} className="size-full" />
        </div>
    );
}

function MoonGlobeLayer({ layout, zoom, canvasSize }: { layout: RadarLayoutResult; zoom: number; canvasSize: { width: number; height: number } }) {
    const { x, y } = layout.moon;
    const visualRadiusPx = visualMoonRadius(layout);
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scaledX = centerX + (x - centerX) * zoom;
    const scaledY = centerY + (y - centerY) * zoom;
    const scaledRadius = visualRadiusPx * zoom;
    const diameter = scaledRadius * 2;
    if (canvasSize.width < 2 || canvasSize.height < 2 || diameter < 8) return null;
    return (
        <div className="pointer-events-none absolute" aria-hidden="true" style={{ left: scaledX - scaledRadius, top: scaledY - scaledRadius, width: diameter, height: diameter, transition: 'left 220ms ease-out, top 220ms ease-out, width 220ms ease-out, height 220ms ease-out', zIndex: 12 }}>
            <Moon3D sizePx={diameter} autoRotate autoRotateSpeed={0.45 / 27.32} label="Lua 3D" />
        </div>
    );
}
