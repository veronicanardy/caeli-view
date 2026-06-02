import { Head } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { ApproachTimeline } from '@/Components/ApproachObservatory/Charts/ApproachTimeline';
import { CompactConsoleBar } from '@/Components/ApproachObservatory/Controls/CompactConsoleBar';
import { CuratedHighlights } from '@/Components/ApproachObservatory/Lists/CuratedHighlights';
import { DailyProximityList } from '@/Components/ApproachObservatory/Lists/DailyProximityList';
import { RadarDataQualityCard } from '@/Components/ApproachObservatory/Panels/RadarDataQualityCard';
import { RangeInsightsCards } from '@/Components/ApproachObservatory/Lists/RangeInsightsCards';
import { TechnicalDataPanel } from '@/Components/ApproachObservatory/Panels/TechnicalDataPanel';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { bestDistanceKm, buildRadarObjects } from '@/lib/radarData';
import { useTranslation } from '@/i18n';
import { buildCuratedHighlights, buildRangeInsights } from '@/lib/approachInterpretation';
import { useClosestNow } from '@/hooks/useClosestNow';
import { useRadarControls } from '@/hooks/useRadarControls';
import {
    ApproachObservatoryCharts,
    ApproachObservatoryFilters,
    ApproachObservatorySummary,
    AsteroidTrajectory,
    HorizonsPositionResult,
    LunarReference,
    PageProps,
    SunDirection,
    UnifiedApproach,
} from '@/types';

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
    lunarReference: LunarReference;
    visualNote: string;
};

type Props = PageProps<{
    filters: ApproachObservatoryFilters;
    initialSunDirection: SunDirection;
}>;

export default function ApproachObservatoryIndex({ filters, initialSunDirection, errors = {} }: Props) {
    const [sortKey, setSortKey] = useState(filters.sort === '-v-rel' ? 'relativeVelocityKph' : 'nominalDistanceKm');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ObservatoryData | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
    const [trajectoryByKey, setTrajectoryByKey] = useState<Record<string, AsteroidTrajectory>>({});
    const [trajectoryLoadingKey, setTrajectoryLoadingKey] = useState<string | null>(null);
    const { locale, t } = useTranslation();
    const en = locale === 'en';
    const selectedDate = filters.date_min;

    const positionsById = useMemo<Record<string, HorizonsPositionResult>>(() => ({}), []);

    const { objectLimit, selectionMode, setObjectLimit, setSelectionMode } = useRadarControls();
    const [refreshNonce, setRefreshNonce] = useState(0);

    useEffect(() => {
        setSelectedFocusId(null);
    }, [filters.date_min, filters.date_max, filters.type]);

    const dataWindow = useMemo(() => ({ date_min: filters.date_min, date_max: filters.date_max }), [filters.date_min, filters.date_max]);

    useEffect(() => {

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
    }, [dataWindow.date_min, dataWindow.date_max, filters.type, filters.dist_max, filters.sort, filters.distance_unit, en]);

    const {
        data:    closestNowData,
        loading: closestNowLoading,
        error:   closestNowError,
    } = useClosestNow(
        filters.date_min,
        filters.date_max,
        objectLimit,
        selectionMode,
        refreshNonce,
    );


    const closestNowApproaches = useMemo<UnifiedApproach[]>(() => {
        if (!closestNowData) return [];
        return closestNowData.objects.map((object) => object.approach);
    }, [closestNowData]);

    const closestNowPositionsById = useMemo<Record<string, HorizonsPositionResult>>(() => {
        if (!closestNowData) return {};
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
                horizonsFailureKind: traj.horizonsFailureKind ?? null,
                note: traj.note ?? null,
            };
        }
        return map;
    }, [closestNowData]);

    const closestNowTrajectoriesByObjectId = useMemo<Record<string, AsteroidTrajectory>>(() => {
        if (!closestNowData) return {};
        const map: Record<string, AsteroidTrajectory> = {};
        for (const object of closestNowData.objects) {
            if (object.trajectory) map[object.approach.id] = object.trajectory;
        }
        return map;
    }, [closestNowData]);

    const approaches = data?.approaches ?? [];
    const summary = data?.summary;
    const charts = data?.charts;
    const lunarReference = data?.lunarReference ?? closestNowData?.lunarReference;
    const errorsBySource = data?.errorsBySource ?? {};

    const filtered = useMemo(() => {
        return [...approaches].sort((left, right) => compareApproaches(left, right, sortKey, positionsById));
    }, [approaches, positionsById, sortKey]);

    const radarApproaches = closestNowApproaches;
    const radarPositionsById = closestNowPositionsById;

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

    useEffect(() => {
        if (!focusApproach || !trajectoryKey || !focusApproach.approachDate || trajectoryByKey[trajectoryKey]) {
            return undefined;
        }

        if (closestNowTrajectoriesByObjectId[focusApproach.id]) {
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
    }, [focusApproach, trajectoryKey, trajectoryByKey, closestNowTrajectoriesByObjectId]);

    return (
        <AppLayout>
            <Head title={t('observatory.title')} />

            <section className="mx-auto max-w-[1800px] space-y-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
                {Object.values(errorsBySource).map((message) => <ErrorMessage key={message} message={message} />)}
                <ErrorMessage message={fetchError} />
                <ErrorMessage message={closestNowError} />

                {loading || (closestNowLoading && !closestNowData) ? (
                    <ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />
                ) : (
                    <>
                        <CompactConsoleBar
                            locale={locale}
                            objectLimit={objectLimit}
                            selectionMode={selectionMode}
                            onLimitChange={setObjectLimit}
                            onModeChange={setSelectionMode}
                            radarLoading={closestNowLoading}
                        />

                        {closestNowData && lunarReference ? (
                            <Suspense fallback={<ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />}>
                                <DailyOrbitalRadar3D
                                    closestNowObjects={closestNowData.objects}
                                    selectedId={focusApproach?.id ?? null}
                                    objectLimit={objectLimit}
                                    selectionMode={selectionMode}
                                    onLimitChange={setObjectLimit}
                                    onModeChange={setSelectionMode}
                                    radarLoading={closestNowLoading}
                                    onRefresh={() => setRefreshNonce((n) => n + 1)}
                                    onSelect={(approach) => {
                                        setSelectedFocusId(approach.id);
                                    }}
                                    onClearSelection={() => {
                                        setSelectedFocusId(null);
                                    }}
                                    onOpenFocus={(approach) => {
                                        window.location.href = approach.detailRoute;
                                    }}
                                    lunarReference={lunarReference}
                                    locale={locale}
                                    initialSunDirection={initialSunDirection}
                                />
                            </Suspense>
                        ) : (
                            <ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />
                        )}

                        {radarObjects.length ? (
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
