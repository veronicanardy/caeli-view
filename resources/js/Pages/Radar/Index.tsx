import { Head, router } from '@inertiajs/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppLayoutOptions } from '@/Components/AppLayout';
import { CompactConsoleBar } from '@/Components/Radar/Controls/CompactConsoleBar';
import { RadarTutorialProvider } from '@/Components/Radar/Tutorial/RadarTutorialProvider';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { useTranslation } from '@/i18n';
import { useClosestNow } from '@/hooks/useClosestNow';
import { useKnownAsteroidDetail } from '@/hooks/useKnownAsteroidDetail';
import { useRadarControls } from '@/hooks/useRadarControls';
import { isKnownAsteroidId } from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { tutorialLiveFactsFromTopObject } from '@/Components/Radar/Lists/radarSceneObjectPresentation';
import {
    ApproachObservatoryFilters,
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
    const { locale, t } = useTranslation();
    useAppLayoutOptions({ hideHeader: radarFullscreen, hideFooter: true });

    const { objectLimit, selectionMode, setObjectLimit, setSelectionMode, resetControls } = useRadarControls();
    const [refreshNonce, setRefreshNonce] = useState(0);

    const resetRadarForTutorial = useCallback(() => {
        resetControls();
        setSelectedFocusId(null);
    }, [resetControls]);

    useEffect(() => {
        setSelectedFocusId(null);
    }, [filters.date_min, filters.date_max, filters.type, selectionMode]);

    const {
        data:    fetchedData,
        loading: fetchLoading,
        error:   fetchError,
    } = useClosestNow(
        filters.date_min,
        filters.date_max,
        objectLimit,
        selectionMode,
        refreshNonce,
    );

    // O critério "famosos" também vem do backend agora (endpoint /radar/famous, via useClosestNow),
    // com posição e trilha curta do Horizons. Tudo a jusante consome `closestNowData` indistintamente.
    // `isFamous` segue só para o detalhe SBDB progressivo do famoso em foco.
    const isFamous = selectionMode === 'famous';
    const closestNowData = fetchedData;
    const closestNowLoading = fetchLoading;
    const closestNowError = fetchError;

    const closestNowApproaches = useMemo<UnifiedApproach[]>(() => {
        if (!closestNowData) return [];
        return closestNowData.objects.map((object) => object.approach);
    }, [closestNowData]);

    const lunarReference = closestNowData?.lunarReference;

    // Fatos reais da rocha do topo da lista, para personalizar o passo de seleção
    // do tutorial. A métrica respeita o critério ativo (distância agora ou data).
    const tutorialLiveFacts = useMemo(() => {
        const top = closestNowData?.objects[0];
        if (!top) return null;
        return tutorialLiveFactsFromTopObject(
            top.approach.displayName ?? top.approach.name,
            selectionMode,
            top.approach.approachDate,
            top.currentDistanceKm,
            locale,
        );
    }, [closestNowData, selectionMode, locale]);

    const focusApproach = useMemo(() => {
        if (!selectedFocusId) return null;
        return closestNowApproaches.find((approach) => approach.id === selectedFocusId) ?? null;
    }, [closestNowApproaches, selectedFocusId]);

    // Detalhe SBDB do conhecido selecionado (carregamento progressivo): só busca quando o objeto em
    // foco é um asteroide famoso. O número de catálogo (permanentNumber) é o identificador da consulta.
    const knownDetailIdentifier = isFamous && focusApproach && isKnownAsteroidId(focusApproach.id)
        ? focusApproach.permanentNumber ?? null
        : null;
    const { detail: knownDetail } = useKnownAsteroidDetail(knownDetailIdentifier);

    // Mescla os campos vivos do SBDB sobre o objeto sintético do conhecido em foco. A base já está
    // visível; quando o detalhe chega, o card ganha classe orbital, albedo, rotação, etc.
    const sceneData = useMemo(() => {
        if (!closestNowData) return closestNowData;
        if (!isFamous || !knownDetail || !focusApproach) return closestNowData;
        const refinedDiameterM = knownDetail.diameterKm != null ? Math.round(knownDetail.diameterKm * 1000) : null;
        return {
            ...closestNowData,
            objects: closestNowData.objects.map((object) => {
                if (object.approach.id !== focusApproach.id) return object;
                return {
                    ...object,
                    approach: {
                        ...object.approach,
                        absoluteMagnitude: knownDetail.absoluteMagnitude ?? object.approach.absoluteMagnitude,
                        diameterMeters: refinedDiameterM ?? object.approach.diameterMeters,
                        estimatedDiameterMinMeters: refinedDiameterM ?? object.approach.estimatedDiameterMinMeters,
                        estimatedDiameterMaxMeters: refinedDiameterM ?? object.approach.estimatedDiameterMaxMeters,
                        orbitClass: knownDetail.orbitClass,
                        orbitClassDescription: knownDetail.orbitClassDescription,
                        albedo: knownDetail.albedo,
                        rotationPeriodHours: knownDetail.rotationPeriodHours,
                    },
                };
            }),
        };
    }, [closestNowData, isFamous, knownDetail, focusApproach]);

    return (
        <>
            <Head title={t('observatory.title')} />

            {/* Tutorial interativo de primeira visita: observa critério, limite e
                seleção por props; o restante das interações é detectado via DOM. */}
            <RadarTutorialProvider
                locale={locale}
                selectionMode={selectionMode}
                objectLimit={objectLimit}
                selectedId={focusApproach?.id ?? null}
                liveFacts={tutorialLiveFacts}
                radarReady={Boolean(closestNowData && lunarReference && !closestNowLoading)}
                radarLoading={closestNowLoading}
                onResetRadarState={resetRadarForTutorial}
            >
            {/* Coluna que preenche a viewport abaixo do header: a barra de filtros fica no topo e o
                radar 3D consome todo o resto via flex-1, sem nunca gerar scroll na página. */}
            <section className="mx-auto flex h-full min-h-0 max-w-[1800px] flex-col gap-3 px-3 py-2 sm:px-6 sm:py-3 sm:gap-4 lg:px-8">
                <ErrorMessage message={closestNowError} />

                {closestNowLoading && !closestNowData ? (
                    <ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />
                ) : (
                    <>
                        {/* Filtros do topo: só no desktop. No mobile vivem no bottom sheet
                            aberto pela barra de ações da cena (DailyOrbitalRadar3D). */}
                        <div className="hidden shrink-0 lg:block">
                            <CompactConsoleBar
                                locale={locale}
                                objectLimit={objectLimit}
                                selectionMode={selectionMode}
                                onLimitChange={setObjectLimit}
                                onModeChange={setSelectionMode}
                                radarLoading={closestNowLoading}
                            />
                        </div>

                        {sceneData && lunarReference ? (
                            <Suspense fallback={<ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />}>
                                <DailyOrbitalRadar3D
                                    closestNowObjects={sceneData.objects}
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
                                        router.visit(approach.detailRoute);
                                    }}
                                    lunarReference={lunarReference}
                                    locale={locale}
                                    initialSunDirection={initialSunDirection}
                                />
                            </Suspense>
                        ) : (
                            <ObservatorySkeleton label={t('observatory.loading.map')} rows={6} />
                        )}
                    </>
                )}
            </section>
            </RadarTutorialProvider>
        </>
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
