import { Head, router } from '@inertiajs/react';
import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { ApproachTimeline } from '@/Components/ApproachObservatory/Charts/ApproachTimeline';
import { CompactConsoleBar } from '@/Components/ApproachObservatory/Controls/CompactConsoleBar';
import { CuratedHighlights } from '@/Components/ApproachObservatory/Lists/CuratedHighlights';
import { DailyProximityList } from '@/Components/ApproachObservatory/Lists/DailyProximityList';
import { ObservatoryDetailOverlay } from '@/Components/ApproachObservatory/Panels/ObservatoryDetailOverlay';
import { ObservatoryFocusPanel } from '@/Components/ApproachObservatory/Panels/ObservatoryFocusPanel';
import { RadarDataQualityCard } from '@/Components/ApproachObservatory/Panels/RadarDataQualityCard';
import { RangeInsightsCards } from '@/Components/ApproachObservatory/Lists/RangeInsightsCards';
import { TechnicalDataPanel } from '@/Components/ApproachObservatory/Panels/TechnicalDataPanel';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { bestDistanceKm, buildRadarObjects } from '@/lib/radarData';
import type { Translator } from '@/i18n';
import { useTranslation } from '@/i18n';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { buildCuratedHighlights, buildRangeInsights } from '@/lib/approachInterpretation';
import {
    ApproachObservatoryCharts,
    ApproachObservatoryFilters,
    ApproachObservatorySummary,
    AsteroidModelMetadata,
    AsteroidTrajectory,
    ClosestNowResponse,
    HomeEarthImage,
    HorizonsPositionResult,
    HorizonsPositionsResponse,
    HorizonsReferenceMode,
    LunarReference,
    PageProps,
    RadarMode,
    SunDirection,
    UnifiedApproach,
} from '@/types';

const DailyOrbitalRadar = lazy(() =>
    import('@/Components/ApproachObservatory/DailyOrbitalRadar').then((module) => ({ default: module.DailyOrbitalRadar })),
);
const DailyOrbitalRadar3D = lazy(() =>
    import('@/Components/ApproachObservatory/DailyOrbitalRadar3D').then((module) => ({ default: module.DailyOrbitalRadar3D })),
);
const UnifiedApproachTable = lazy(() =>
    import('@/Components/ApproachObservatory/Lists/UnifiedApproachTable').then((module) => ({ default: module.UnifiedApproachTable })),
);

type ObservatoryData = {
    approaches: UnifiedApproach[];
    summary: ApproachObservatorySummary;
    charts: ApproachObservatoryCharts;
    errorsBySource: Record<string, string>;
    earthImage: HomeEarthImage | null;
    lunarReference: LunarReference;
    visualNote: string;
};

type Props = PageProps<{
    filters: ApproachObservatoryFilters;
    initialSunDirection: SunDirection;
}>;

type ObservatoryForm = {
    date: string;
    type: ApproachObservatoryFilters['type'];
};

export default function ApproachObservatoryIndex({ filters, initialSunDirection, errors = {} }: Props) {
    const [form, setForm] = useState<ObservatoryForm>({
        date: filters.date_min,
        type: filters.type,
    });
    const [query, setQuery] = useState('');
    const [sortKey, setSortKey] = useState(filters.sort === '-v-rel' ? 'relativeVelocityKph' : 'nominalDistanceKm');
    const [isUpdating, setIsUpdating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ObservatoryData | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
    const [trajectoryByKey, setTrajectoryByKey] = useState<Record<string, AsteroidTrajectory>>({});
    const [trajectoryLoadingKey, setTrajectoryLoadingKey] = useState<string | null>(null);
    const [modelByKey, setModelByKey] = useState<Record<string, AsteroidModelMetadata>>({});
    const [modelLoadingKey, setModelLoadingKey] = useState<string | null>(null);
    const [activePanel, setActivePanel] = useState<'scale' | 'trajectory' | null>(null);
    const { locale, t } = useTranslation();
    const en = locale === 'en';
    const selectedDate = filters.date_min;

    const [referenceMode, setReferenceMode] = useState<HorizonsReferenceMode>(() => defaultReferenceMode(filters.date_min));
    const [positionsById, setPositionsById] = useState<Record<string, HorizonsPositionResult>>({});
    const [sunDirection, setSunDirection] = useState<SunDirection | null>(null);
    const [positionsLoading, setPositionsLoading] = useState(false);
    const [radarMode, setRadarMode] = useState<RadarMode>('closest-5-now');
    const [closestNowData, setClosestNowData] = useState<ClosestNowResponse | null>(null);
    const [closestNowLoading, setClosestNowLoading] = useState(false);
    const [use3DPrototype, setUse3DPrototype] = useState(true);

    // Reset reference mode to the date-appropriate default whenever the selected date changes.
    useEffect(() => {
        setReferenceMode(defaultReferenceMode(filters.date_min));
        setPositionsById({});
        setClosestNowData(null);
    }, [filters.date_min]);

    useEffect(() => {
        setSelectedFocusId(null);
        setActivePanel(null);
        setForm({ date: filters.date_min, type: filters.type });
    }, [filters.date_min, filters.date_max, filters.type]);

    useEffect(() => {
        setActivePanel(null);
    }, [selectedFocusId]);

    // Resolve the effective date window for the bulk /radar/data fetch based on the radar mode.
    // - closest-5-now: same as `today` (we still want the supporting sections — timeline, table —
    //   to reflect the day. But this effect is skipped entirely in that mode below.)
    // - today: just the selected day.
    // - next-7d: selected day + 6 more days.
    // - pha / all: full selected window (defaults to a single day; the user can widen via filters).
    const dataWindow = useMemo(() => {
        if (radarMode === 'next-7d') {
            const end = addDaysIso(filters.date_min, 6);
            return { date_min: filters.date_min, date_max: end };
        }
        return { date_min: filters.date_min, date_max: filters.date_max };
    }, [radarMode, filters.date_min, filters.date_max]);

    useEffect(() => {
        // closest-5-now ships its own approaches list via /radar/closest-now, so don't
        // double-fetch the bulk data feed in that mode.
        if (radarMode === 'closest-5-now') {
            setLoading(false);
            return undefined;
        }

        const controller = new AbortController();
        setLoading(true);
        setFetchError(null);

        const params = new URLSearchParams({
            date_min: dataWindow.date_min,
            date_max: dataWindow.date_max,
            type: filters.type,
            dist_max: filters.dist_max ?? '0.2',
            sort: filters.sort ?? 'dist',
            distance_unit: filters.distance_unit ?? 'km',
        });

        fetch(`/radar/data?${params.toString()}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Observatory unavailable.');
                return response.json() as Promise<ObservatoryData>;
            })
            .then((payload) => {
                setData(payload);
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setFetchError(en ? 'Could not load observatory data right now.' : 'Não foi possível carregar os dados do observatório agora.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [dataWindow.date_min, dataWindow.date_max, filters.type, filters.dist_max, filters.sort, filters.distance_unit, en, radarMode]);

    // closest-5-now mode: hits the dedicated endpoint that ranks candidates and returns the 5
    // objects actually closest to Earth right now, with real past/current/future trajectories.
    useEffect(() => {
        if (radarMode !== 'closest-5-now') return undefined;

        const controller = new AbortController();
        setClosestNowLoading(true);

        const params = new URLSearchParams({
            date_min: filters.date_min,
            date_max: filters.date_max,
            limit: '5',
        });

        fetch(`/radar/closest-now?${params.toString()}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Closest-now unavailable.');
                return response.json() as Promise<ClosestNowResponse>;
            })
            .then((payload) => {
                setClosestNowData(payload);
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setClosestNowData(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setClosestNowLoading(false);
            });

        return () => controller.abort();
    }, [filters.date_min, filters.date_max, radarMode]);

    useEffect(() => {
        // Skip positions fetch in closest-5-now mode — trajectories carry the positional data.
        if (radarMode === 'closest-5-now') return undefined;

        const controller = new AbortController();
        setPositionsLoading(true);

        const params = new URLSearchParams({
            date_min: dataWindow.date_min,
            date_max: dataWindow.date_max,
            type: filters.type,
            dist_max: filters.dist_max ?? '0.2',
            sort: filters.sort ?? 'dist',
            distance_unit: filters.distance_unit ?? 'km',
            reference_mode: referenceMode,
        });

        fetch(`/radar/positions?${params.toString()}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Positions unavailable.');
                return response.json() as Promise<HorizonsPositionsResponse>;
            })
            .then((payload) => {
                setPositionsById(payload.positions ?? {});
                setSunDirection(payload.sunDirection ?? null);
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setPositionsById({});
                setSunDirection(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setPositionsLoading(false);
            });

        return () => controller.abort();
    }, [dataWindow.date_min, dataWindow.date_max, filters.type, filters.dist_max, filters.sort, filters.distance_unit, referenceMode, radarMode]);

    // When the radar is in closest-5-now mode, the approaches list that feeds the radar comes from
    // /radar/closest-now (already ranked and limited), not the bulk /radar/data feed.
    // Approaches for the supporting sections (proximity list, timeline, table) still come from data.
    const closestNowApproaches = useMemo<UnifiedApproach[]>(() => {
        if (radarMode !== 'closest-5-now' || !closestNowData) return [];
        return closestNowData.objects.map((object) => object.approach);
    }, [radarMode, closestNowData]);

    const closestNowPositionsById = useMemo<Record<string, HorizonsPositionResult>>(() => {
        if (radarMode !== 'closest-5-now' || !closestNowData) return {};
        const map: Record<string, HorizonsPositionResult> = {};
        for (const object of closestNowData.objects) {
            const traj = object.trajectory;
            if (!traj || traj.status !== 'available' || !traj.currentPoint) continue;
            const current = traj.currentPoint;
            map[object.approach.id] = {
                id: object.approach.id,
                status: 'available',
                positionKind: 'horizons_current',
                x: current.x,
                y: current.y,
                z: typeof current.z === 'number' ? current.z : null,
                vx: typeof current.vx === 'number' ? current.vx : null,
                vy: typeof current.vy === 'number' ? current.vy : null,
                vz: typeof current.vz === 'number' ? current.vz : null,
                currentPositionTime: current.timestamp ?? traj.anchorTime ?? null,
                closestApproachTime: traj.closestApproachTime ?? object.approach.approachDate ?? null,
                closestApproachDistanceKm: object.currentDistanceKm,
                closestApproachDistanceLD: object.currentDistanceLD,
                distanceSource: 'JPL Horizons',
                positionSource: 'JPL Horizons',
                failureReason: null,
                note: traj.note ?? null,
            };
        }
        return map;
    }, [radarMode, closestNowData]);

    const closestNowTrajectoriesByObjectId = useMemo<Record<string, AsteroidTrajectory>>(() => {
        if (radarMode !== 'closest-5-now' || !closestNowData) return {};
        const map: Record<string, AsteroidTrajectory> = {};
        for (const object of closestNowData.objects) {
            if (object.trajectory) map[object.approach.id] = object.trajectory;
        }
        return map;
    }, [radarMode, closestNowData]);

    const approaches = data?.approaches ?? [];
    const summary = data?.summary;
    const charts = data?.charts;
    const earthImage = data?.earthImage ?? null;
    // lunarReference may come from /data OR /closest-now — whichever finished first. The shape
    // is identical, so either is fine for the radar's "1 DL = …" footer.
    const lunarReference = data?.lunarReference ?? closestNowData?.lunarReference;
    const errorsBySource = data?.errorsBySource ?? {};

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return approaches
            .filter((approach) => {
                if (!needle) return true;
                const identity = resolveApproachIdentity(approach);
                return [identity.displayName, identity.subtitle, identity.rawName, ...identity.aliases, approach.designation, approach.detailIdentifier, approach.sourceLabel]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(needle));
            })
            .sort((left, right) => compareApproaches(left, right, sortKey, positionsById));
    }, [approaches, positionsById, query, sortKey]);

    // The list that actually feeds the radar depends on the mode.
    // - closest-5-now: only the 5 objects the backend selected.
    // - pha: filter the bulk feed down to flagged objects.
    // - other modes: the full filtered feed.
    const radarApproaches = useMemo<UnifiedApproach[]>(() => {
        if (radarMode === 'closest-5-now') return closestNowApproaches;
        if (radarMode === 'pha') return filtered.filter((approach) => approach.hazardFlag);
        return filtered;
    }, [radarMode, closestNowApproaches, filtered]);

    const radarPositionsById = radarMode === 'closest-5-now' ? closestNowPositionsById : positionsById;

    const radarObjects = useMemo(() => buildRadarObjects(radarApproaches, radarPositionsById), [radarApproaches, radarPositionsById]);

    const focusApproach = useMemo(() => {
        if (!selectedFocusId) return null;
        // Search the list that's actually being shown on the radar — that includes the
        // closest-5-now objects (which never reach `filtered` because they bypass /data).
        const inRadar = radarApproaches.find((approach) => approach.id === selectedFocusId);
        if (inRadar) return inRadar;
        return filtered.find((approach) => approach.id === selectedFocusId) ?? null;
    }, [radarApproaches, filtered, selectedFocusId]);

    const curatedHighlights = useMemo(() => {
        const all = buildCuratedHighlights(filtered, locale);
        if (!focusApproach) return all;
        return all.filter((highlight) => highlight.approach.id !== focusApproach.id);
    }, [filtered, locale, focusApproach]);

    const rangeInsights = useMemo(() => {
        if (!summary || !charts) return [];
        return buildRangeInsights(summary, charts, filtered, locale);
    }, [summary, charts, filtered, locale]);

    const trajectoryKey = focusApproach ? `${focusApproach.id}:${focusApproach.approachDate ?? ''}` : null;
    const focusTrajectory = trajectoryKey ? trajectoryByKey[trajectoryKey] ?? null : null;
    const trajectoryLoading = trajectoryKey !== null && trajectoryLoadingKey === trajectoryKey;
    const modelKey = focusApproach ? focusApproach.id : null;
    const focusModel = modelKey ? modelByKey[modelKey] ?? null : null;
    const modelLoading = modelKey !== null && modelLoadingKey === modelKey;

    useEffect(() => {
        if (!focusApproach || !trajectoryKey || !focusApproach.approachDate || trajectoryByKey[trajectoryKey]) {
            return undefined;
        }

        // In closest-5-now mode we already have the better (now-anchored) trajectory inside
        // closestNowTrajectoriesByObjectId. Hitting /radar/trajectory here would just
        // overlay a second ±2-day-around-closest-approach polyline on top of the already-drawn
        // past/current/future arrows — visually noisy and slower.
        if (radarMode === 'closest-5-now' && closestNowTrajectoriesByObjectId[focusApproach.id]) {
            return undefined;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            id: focusApproach.id,
            name: focusApproach.name,
            displayName: focusApproach.displayName ?? focusApproach.name,
            rawName: focusApproach.rawName ?? focusApproach.name,
            designation: focusApproach.provisionalDesignation ?? focusApproach.designation ?? '',
            detailIdentifier: focusApproach.detailIdentifier,
            spkId: focusApproach.spkId ?? '',
            approachTime: focusApproach.approachDate,
        });

        setTrajectoryLoadingKey(trajectoryKey);

        fetch(`/radar/trajectory?${params.toString()}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Trajectory unavailable.');
                return response.json() as Promise<AsteroidTrajectory>;
            })
            .then((trajectory) => {
                setTrajectoryByKey((current) => ({ ...current, [trajectoryKey]: trajectory }));
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setTrajectoryByKey((current) => ({
                    ...current,
                    [trajectoryKey]: {
                        objectId: focusApproach.id,
                        objectName: focusApproach.displayName ?? focusApproach.name,
                        source: 'JPL Horizons',
                        center: 'Earth',
                        projection: '2D simplified',
                        closestApproachTime: focusApproach.approachDate ?? '',
                        points: [],
                        referencePoint: null,
                        motionState: 'unknown',
                        status: 'fallback',
                        note: 'Não foi possível calcular a posição atual deste objeto; mantendo dados de aproximação.',
                    },
                }));
            })
            .finally(() => {
                if (!controller.signal.aborted) setTrajectoryLoadingKey(null);
            });

        return () => controller.abort();
    }, [focusApproach, trajectoryKey, trajectoryByKey, radarMode, closestNowTrajectoriesByObjectId]);

    useEffect(() => {
        if (!focusApproach || !modelKey || modelByKey[modelKey]) {
            return undefined;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            id: focusApproach.id,
            name: focusApproach.name,
            displayName: focusApproach.displayName ?? focusApproach.name,
            designation: focusApproach.provisionalDesignation ?? focusApproach.designation ?? '',
            detailIdentifier: focusApproach.detailIdentifier,
            spkId: focusApproach.spkId ?? '',
            objectType: focusApproach.objectType,
        });

        appendNumeric(params, 'diameterMeters', focusApproach.diameterMeters);
        appendNumeric(params, 'diameterMinMeters', focusApproach.estimatedDiameterMinMeters);
        appendNumeric(params, 'diameterMaxMeters', focusApproach.estimatedDiameterMaxMeters);
        appendNumeric(params, 'absoluteMagnitude', focusApproach.absoluteMagnitude);

        setModelLoadingKey(modelKey);

        fetch(`/radar/asteroid-model?${params.toString()}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Asteroid model unavailable.');
                return response.json() as Promise<AsteroidModelMetadata>;
            })
            .then((model) => {
                setModelByKey((current) => ({ ...current, [modelKey]: model }));
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
            })
            .finally(() => {
                if (!controller.signal.aborted) setModelLoadingKey(null);
            });

        return () => controller.abort();
    }, [focusApproach, modelByKey, modelKey]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsUpdating(true);
        router.get('/radar', {
            date_min: form.date,
            date_max: form.date,
            type: form.type,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onFinish: () => setIsUpdating(false),
        });
    }

    function quickSelectDate(date: string) {
        setForm((current) => ({ ...current, date }));
        setIsUpdating(true);
        router.get('/radar', {
            date_min: date,
            date_max: date,
            type: form.type,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onFinish: () => setIsUpdating(false),
        });
    }

    return (
        <AppLayout>
            <Head title={t('observatory.title')} />

            <section className="mx-auto max-w-[1800px] space-y-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
                {Object.values(errorsBySource).map((message) => <ErrorMessage key={message} message={message} />)}
                <ErrorMessage message={fetchError} />

                {loading && radarMode !== 'closest-5-now' ? (
                    <ObservatoryLoadingSkeleton t={t} />
                ) : closestNowLoading && radarMode === 'closest-5-now' && !closestNowData ? (
                    <ObservatoryLoadingSkeleton t={t} />
                ) : (
                    <>
                        {/* Prototype toggle: only available in closest-5-now mode (it's the only mode the 3D
                            prototype knows how to render). The SVG radar remains the default and only path
                            for every other mode. */}
                        {radarMode === 'closest-5-now' && closestNowData ? (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setUse3DPrototype((v) => !v)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-100 transition outline-none hover:border-emerald-300/60 hover:bg-emerald-500/15 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                >
                                    {use3DPrototype
                                        ? (en ? 'Switch to 2D radar' : 'Mudar para radar 2D')
                                        : (en ? '← Back to 3D radar' : '← Voltar ao radar 3D')}
                                </button>
                            </div>
                        ) : null}

                        {use3DPrototype && radarMode === 'closest-5-now' && closestNowData && lunarReference ? (
                            <Suspense fallback={<ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />}>
                                <DailyOrbitalRadar3D
                                    closestNowObjects={closestNowData.objects}
                                    selectedId={focusApproach?.id ?? null}
                                    onSelect={(approach) => {
                                        // Click toggles selection — clicking the same object again deselects.
                                        setSelectedFocusId((current) => (current === approach.id ? null : approach.id));
                                        setActivePanel(null);
                                    }}
                                    onClearSelection={() => {
                                        setSelectedFocusId(null);
                                        setActivePanel(null);
                                    }}
                                    onOpenFocus={(approach) => {
                                        // The dossier is a regular Inertia route — same destination the SVG radar
                                        // points at via the asteroid marker link.
                                        window.location.href = approach.detailRoute;
                                    }}
                                    lunarReference={lunarReference}
                                    locale={locale}
                                    initialSunDirection={initialSunDirection}
                                />
                            </Suspense>
                        ) : (
                        <Suspense fallback={<ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />}>
                            {lunarReference && (
                                <DailyOrbitalRadar
                                    approaches={radarApproaches}
                                    positionsById={radarPositionsById}
                                    sunDirection={sunDirection}
                                    positionsLoading={radarMode === 'closest-5-now' ? closestNowLoading : positionsLoading}
                                    referenceMode={referenceMode}
                                    onReferenceModeChange={setReferenceMode}
                                    earthImage={earthImage}
                                    lunarReference={lunarReference}
                                    locale={locale}
                                    t={t}
                                    selectedDate={selectedDate}
                                    selectedId={focusApproach?.id ?? null}
                                    trajectory={radarMode === 'closest-5-now' ? null : focusTrajectory}
                                    trajectoryLoading={radarMode === 'closest-5-now' ? false : trajectoryLoading}
                                    radarMode={radarMode}
                                    onRadarModeChange={setRadarMode}
                                    nowTrajectoriesByObjectId={closestNowTrajectoriesByObjectId}
                                    onSelect={(approach) => {
                                        setSelectedFocusId(approach.id);
                                        setActivePanel(null);
                                    }}
                                    onClearSelection={() => {
                                        setSelectedFocusId(null);
                                        setActivePanel(null);
                                    }}
                                    emptyMessage={!radarApproaches.length
                                        ? emptyMessageForMode(radarMode, en)
                                        : null}
                                    controls={(
                                        <CompactConsoleBar
                                            form={form}
                                            onFormChange={setForm}
                                            onSubmit={submit}
                                            onPresetDateSelect={quickSelectDate}
                                            query={query}
                                            onQueryChange={setQuery}
                                            isUpdating={isUpdating}
                                            errors={errors}
                                            t={t}
                                        />
                                    )}
                                    sidePanel={renderRadarSidePanel({
                                        activePanel,
                                        focusApproach,
                                        focusTrajectory,
                                        trajectoryLoading,
                                        focusModel,
                                        modelLoading,
                                        locale,
                                        t,
                                        onClose: () => setActivePanel(null),
                                        onOpenScale: () => focusApproach && setActivePanel('scale'),
                                        onOpenTrajectory: () => focusApproach && setActivePanel('trajectory'),
                                    })}
                                />
                            )}
                        </Suspense>
                        )}

                        {filtered.length ? (
                            <RadarDataQualityCard
                                objects={radarObjects}
                                locale={locale}
                                t={t}
                            />
                        ) : null}

                        {filtered.length ? (
                            <section className="section-slide space-y-3">
                                <SectionHeading title={t('observatory.dailyWhy.title')} description={t('observatory.dailyWhy.description')} />
                                <DailyProximityList
                                    approaches={filtered}
                                    positionsById={positionsById}
                                    focusId={focusApproach?.id ?? null}
                                    selectedDate={selectedDate}
                                    locale={locale}
                                    trajectoryByKey={trajectoryByKey}
                                    trajectoryLoadingKey={trajectoryLoadingKey}
                                />
                            </section>
                        ) : null}

                        {filtered.length ? (
                            <section className="section-slide space-y-3">
                                <SectionHeading title={t('observatory.timeline.title')} description={t('observatory.timeline.description')} />
                                <ApproachTimeline approaches={filtered} locale={locale} t={t} />
                            </section>
                        ) : null}

                        {filtered.length && curatedHighlights.length ? (
                            <section className="section-slide space-y-3">
                                <SectionHeading title={t('observatory.highlights.title')} description={t('observatory.highlights.description')} />
                                <CuratedHighlights highlights={curatedHighlights} t={t} />
                            </section>
                        ) : null}

                        {filtered.length ? (
                            <section className="section-slide space-y-3">
                            <SectionHeading title={t('observatory.insights.title')} description={t('observatory.insights.description')} />
                            <RangeInsightsCards insights={rangeInsights} />
                            </section>
                        ) : null}

                        {filtered.length ? (
                            <TechnicalDataPanel
                            title={t('observatory.technical.title')}
                            description={t('observatory.technical.description')}
                            openLabel={t('observatory.technical.open')}
                            closeLabel={t('observatory.technical.close')}
                            count={filtered.length}
                        >
                            <Suspense fallback={<ObservatorySkeleton label={t('observatory.loading.table')} rows={6} />}>
                                <UnifiedApproachTable approaches={filtered} sortKey={sortKey} onSort={setSortKey} />
                            </Suspense>
                            </TechnicalDataPanel>
                        ) : null}

                        {lunarReference && (
                            <section className="section-slide rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-white/60">
                                <h2 className="text-base font-semibold text-white">{t('observatory.near.title')}</h2>
                                <p className="mt-2">
                                    {en
                                        ? `The Moon is, on average, ${new Intl.NumberFormat('en').format(lunarReference.distanceKm)} km from Earth. A "near" object in astronomy can still be hundreds of thousands or millions of kilometers away. The visual attention level only highlights proximity, speed, and estimated size; it does not claim impact risk.`
                                        : `A Lua está, em média, a ${new Intl.NumberFormat('pt-BR').format(lunarReference.distanceKm)} km da Terra. Um objeto "próximo" em astronomia ainda pode estar a centenas de milhares ou milhões de quilômetros. O nível de atenção visual é apenas uma forma de destacar proximidade, velocidade e tamanho estimado; ele não afirma risco de impacto.`}
                                </p>
                            </section>
                        )}
                    </>
                )}
            </section>
        </AppLayout>
    );
}

function SectionHeading({ title, description, muted = false }: { title: string; description: string; muted?: boolean }) {
    return (
        <div>
            <h2 className={`font-semibold text-white ${muted ? 'text-base' : 'text-lg'}`}>{title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-white/55">{description}</p>
        </div>
    );
}

function ObservatoryLoadingSkeleton({ t }: { t: Translator }) {
    return (
        <div className="space-y-6">
            <ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />
            <ObservatorySkeleton label={t('observatory.loading.cards')} rows={3} compact />
            <ObservatorySkeleton label={t('observatory.loading.table')} rows={5} />
        </div>
    );
}

function ObservatorySkeleton({ label, rows, compact = false }: { label: string; rows: number; compact?: boolean }) {
    return (
        <div className={`rounded-lg border border-white/10 bg-white/[0.035] p-4 ${compact ? 'grid gap-3 md:grid-cols-3' : 'space-y-3'}`}>
            <div className="col-span-full flex items-center gap-3 text-sm text-white/55">
                <span className="size-2.5 animate-pulse rounded-full bg-signal-cyan" />
                {label}
            </div>
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-white/[0.05]" />
            ))}
        </div>
    );
}

function renderRadarSidePanel({
    activePanel,
    focusApproach,
    focusTrajectory,
    trajectoryLoading,
    focusModel,
    modelLoading,
    locale,
    t,
    onClose,
    onOpenScale,
    onOpenTrajectory,
}: {
    activePanel: 'scale' | 'trajectory' | null;
    focusApproach: UnifiedApproach | null;
    focusTrajectory: AsteroidTrajectory | null;
    trajectoryLoading: boolean;
    focusModel: AsteroidModelMetadata | null;
    modelLoading: boolean;
    locale: 'pt-BR' | 'en';
    t: Translator;
    onClose: () => void;
    onOpenScale: () => void;
    onOpenTrajectory: () => void;
}): ReactNode {
    if (!focusApproach) {
        return null;
    }

    if (activePanel && focusApproach) {
        return (
            <ObservatoryDetailOverlay
                activePanel={activePanel}
                approach={focusApproach}
                trajectory={focusTrajectory}
                trajectoryLoading={trajectoryLoading}
                model={focusModel}
                modelLoading={modelLoading}
                locale={locale}
                t={t}
                onClose={onClose}
            />
        );
    }

    return (
        <ObservatoryFocusPanel
            approach={focusApproach ?? null}
            locale={locale}
            t={t}
            onOpenScale={onOpenScale}
            onOpenTrajectory={onOpenTrajectory}
            trajectoryLoading={trajectoryLoading}
            hasTrajectory={Boolean(focusTrajectory && focusTrajectory.status === 'available' && focusTrajectory.points.length >= 2)}
            model={focusModel}
            modelLoading={modelLoading}
        />
    );
}

function defaultReferenceMode(selectedDate: string): HorizonsReferenceMode {
    return selectedDate === localDateIso(new Date()) ? 'current' : 'closest_approach';
}

function compareApproaches(
    left: UnifiedApproach,
    right: UnifiedApproach,
    key: string,
    positionsById: Record<string, HorizonsPositionResult>,
): number {
    if (key === 'nominalDistanceKm') {
        return (bestDistanceKm(left, positionsById[left.id]) ?? Number.POSITIVE_INFINITY)
            - (bestDistanceKm(right, positionsById[right.id]) ?? Number.POSITIVE_INFINITY);
    }

    const leftValue = left[key as keyof UnifiedApproach];
    const rightValue = right[key as keyof UnifiedApproach];

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
        return (leftValue as number | null ?? Number.POSITIVE_INFINITY) - (rightValue as number | null ?? Number.POSITIVE_INFINITY);
    }

    return String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
}

function appendNumeric(params: URLSearchParams, key: string, value: number | null): void {
    if (value !== null && Number.isFinite(value)) {
        params.set(key, String(value));
    }
}

function localDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return iso;
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function emptyMessageForMode(mode: RadarMode, en: boolean): string {
    if (mode === 'closest-5-now') {
        return en
            ? 'No nearby objects found right now.'
            : 'Nenhum objeto próximo encontrado agora.';
    }
    if (mode === 'pha') {
        return en
            ? 'No potentially hazardous objects flagged for this window.'
            : 'Nenhum objeto potencialmente perigoso sinalizado para esta janela.';
    }
    if (mode === 'next-7d') {
        return en
            ? 'No close approaches in the next 7 days for the current filters.'
            : 'Nenhuma aproximação nos próximos 7 dias com os filtros atuais.';
    }
    return en
        ? 'No close approach found for this day with the current filters. Try another date or type to continue.'
        : 'Nenhuma aproximação encontrada para este dia com os filtros atuais. Tente outra data ou tipo para continuar.';
}
