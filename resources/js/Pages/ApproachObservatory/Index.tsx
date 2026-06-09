import { Head } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { CompactConsoleBar } from '@/Components/Radar/Controls/CompactConsoleBar';
import { RadarDataQualityCard } from '@/Components/Radar/Panels/RadarDataQualityCard';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { buildRadarObjects, trajectoryToPositionResult } from '@/lib/radarData';
import { useTranslation } from '@/i18n';
import { useClosestNow } from '@/hooks/useClosestNow';
import { useRadarControls } from '@/hooks/useRadarControls';
import {
    ApproachObservatoryFilters,
    AsteroidTrajectory,
    HorizonsPositionResult,
    PageProps,
    SunDirection,
    UnifiedApproach,
} from '@/types';

const DailyOrbitalRadar3D = lazy(() =>
    import('@/Components/Radar/DailyOrbitalRadar3D').then((module) => ({ default: module.DailyOrbitalRadar3D })),
);

type Props = PageProps<{
    filters: ApproachObservatoryFilters;
    initialSunDirection: SunDirection;
}>;

export default function ApproachObservatoryIndex({ filters, initialSunDirection }: Props) {
    const [radarFullscreen, setRadarFullscreen] = useState(false);
    const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
    const [trajectoryByKey, setTrajectoryByKey] = useState<Record<string, AsteroidTrajectory>>({});
    const [trajectoryLoadingKey, setTrajectoryLoadingKey] = useState<string | null>(null);
    const { locale, t } = useTranslation();

    const { objectLimit, selectionMode, setObjectLimit, setSelectionMode } = useRadarControls();
    const [refreshNonce, setRefreshNonce] = useState(0);

    useEffect(() => {
        setSelectedFocusId(null);
    }, [filters.date_min, filters.date_max, filters.type]);

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
            const pos = trajectoryToPositionResult(object);
            if (pos) map[object.approach.id] = pos;
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

    const lunarReference = closestNowData?.lunarReference;

    const radarObjects = useMemo(
        () => buildRadarObjects(closestNowApproaches, closestNowPositionsById),
        [closestNowApproaches, closestNowPositionsById],
    );

    const focusApproach = useMemo(() => {
        if (!selectedFocusId) return null;
        return closestNowApproaches.find((approach) => approach.id === selectedFocusId) ?? null;
    }, [closestNowApproaches, selectedFocusId]);

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
        <AppLayout hideHeader={radarFullscreen}>
            <Head title={t('observatory.title')} />

            <section className="mx-auto max-w-[1800px] space-y-3 px-3 py-2 sm:px-6 sm:py-4 sm:space-y-4 lg:px-8">
                <ErrorMessage message={closestNowError} />

                {closestNowLoading && !closestNowData ? (
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
                                    onFullscreenChange={setRadarFullscreen}
                                    onSelect={(approach) => setSelectedFocusId(approach.id)}
                                    onClearSelection={() => setSelectedFocusId(null)}
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
                    </>
                )}
            </section>
        </AppLayout>
    );
}

function ObservatorySkeleton({ label, rows }: { label: string; rows: number }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/55">
                <span className="size-2.5 animate-pulse rounded-full bg-signal-cyan" />
                {label}
            </div>
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-white/[0.05]" />
            ))}
        </div>
    );
}
