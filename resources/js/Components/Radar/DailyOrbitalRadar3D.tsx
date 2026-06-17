/**
 * Centro de orquestração do radar orbital 3D.
 *
 * Por que existe: o radar SVG projeta o plano eclíptico ortograficamente, colapsando
 * o eixo Z. Asteroides com alta inclinação orbital (ex.: 2018 CX, i ≈ 25°) aparecem
 * mal posicionados: sua distância 3D real é 60 DL, mas a projeção (x, y) cai entre
 * 1 e 5 DL. Esta cena preserva os eixos X/Y/Z reais para que a profundidade seja honesta.
 *
 * Este componente mantém a intenção global da experiência: seleção, foco de corpos,
 * modo órbita, fullscreen, overlays e critérios de lista. A renderização pesada fica
 * delegada para RadarSceneCanvas, RadarNavigationPanel, SceneToolbar,
 * MobileActionBar e RadarFloatingOverlays.
 *
 * Mobile (abaixo de lg:): a interface usa bottom sheets em vez de painéis
 * flutuantes. `mobileSheet` controla qual sheet de navegação está aberto
 * (objetos/filtros) e a MobileActionBar é a porta de entrada; o card de foco
 * vira sheet com snaps dentro do PanelShell.
 *
 * Toda a cena usa UMA escala linear em UA (LINEAR_AU_SCALE): asteroides, Lua, planetas e Sol
 * ficam nas distâncias relativas reais, sem compressão. A aproximação (minúscula perto do vão
 * Terra-Sol) é revelada por ZOOM de câmera na Terra, não esticando a régua. A régua log
 * geocêntrica antiga sobrevive apenas como rede de comparação por trás de `?log` (ver linearMode.ts).
 *
 * Dois recortes da MESMA cena coexistem:
 *   - 'radar'  : vizinhança da Terra em foco; aproximação, direção e trilha do objeto.
 *   - 'orbit'  : revela a elipse Kepleriana completa do objeto ao redor do Sol (sob demanda).
 * O recorte 'orbit' só fica disponível quando o objeto selecionado tem elementos orbitais com
 * época de periélio válida (tpJd ≠ 0), sem isso a posição Kepleriana não é computável.
 */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { usePanelBias } from './Scene/usePanelBias';
import type { ClosestNowObject, LunarReference, ObjectLimit, SelectionMode, SunDirection, UnifiedApproach } from '@/types';
import { sunDirectionFromIncoming } from '@/lib/radar/coordinates';
import type { SceneMode } from './Controls/Manual/manualTypes';
import { MobileActionBar } from './Controls/MobileActionBar';
import { SceneToolbar } from './Controls/SceneToolbar';
import { RadarFloatingOverlays } from './Panels/RadarFloatingOverlays';
import { RadarNavigationPanel } from './Panels/RadarNavigationPanel';
import type { MobileSheetSection } from './Panels/radarNavigationTypes';
import { RadarSceneCanvas } from './Scene/RadarSceneCanvas';
import { LINEAR_AU_SCALE } from '@/lib/sceneEphemeris';
import { deriveActiveMode } from './Scene/sceneMode';
import { useLabelNoGoRects } from './Scene/useLabelNoGoRects';
import { useSceneEphemeris } from './Scene/useSceneEphemeris';
import { useSelectionFocusFraming } from './Scene/useSelectionFocusFraming';
import type { FocusFraming } from './Scene/cameraFraming';
import { useRadar3DFocusActions } from './useRadar3DFocusActions';
import { useRadar3DTransition } from './useRadar3DTransition';

type Props = {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    onSelect: (approach: UnifiedApproach) => void;
    onClearSelection?: () => void;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    radarLoading?: boolean;
    onRefresh?: () => void;
    onFullscreenChange?: (fullscreen: boolean) => void;
    initialSunDirection: SunDirection;
};

export function DailyOrbitalRadar3D({
    closestNowObjects,
    selectedId,
    onSelect,
    onClearSelection,
    onOpenFocus,
    lunarReference,
    locale,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading = false,
    onRefresh,
    onFullscreenChange,
    initialSunDirection,
}: Props) {
    const en = locale === 'en';

    // Adia a atualização dos objetos na cena 3D enquanto `radarLoading` está ativo.
    // Isso garante que o overlay "Carregando..." pinte no browser antes de o Three.js
    // instanciar novos meshes (o que congela o thread principal por ~100 ms).
    const deferredObjects = useDeferredValue(closestNowObjects);
    const sceneObjects = radarLoading ? deferredObjects : closestNowObjects;

    // Fallback síncrono para a direção do Sol: o servidor já conhece a longitude solar atual
    // (Meeus, SunDirectionCalculator) e a envia pelo Inertia. Até o astronomy-engine resolver
    // seu import lazy, a cena ilumina a partir deste vetor, nunca de um cardinal arbitrário.
    const fallbackSunDirection = useMemo<[number, number, number]>(
        () => sunDirectionFromIncoming(initialSunDirection),
        [initialSunDirection],
    );

    // Efeméride calculada localmente com astronomy-engine (direção do Sol + posição da Lua).
    // Null até a biblioteca (carregada de forma lazy) resolver. A cena usa o fallback do servidor
    // até então. Recalculada a cada 10 s para que dia/noite e a Lua derivem realisticamente.
    const ephemeris = useSceneEphemeris();

    const focusedObject = useMemo(
        () => closestNowObjects.find((o) => o.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );
    const { sceneTransitioning, triggerTransition } = useRadar3DTransition();

    const [manualOpen, setManualOpen] = useState(false);
    const [fullscreen, setFullscreenState] = useState(false);
    const setFullscreen = (value: boolean) => { setFullscreenState(value); onFullscreenChange?.(value); };
    const [showLabels, setShowLabels] = useState(true);
    const [planetsOpen, setPlanetsOpen] = useState(false);
    // Sheet mobile aberto (objetos ou filtros). Null = nenhum, cena livre.
    const [mobileSheet, setMobileSheet] = useState<MobileSheetSection | null>(null);
    // Desktop: painel de navegação recolhido em pill (modo explorar). O card
    // do trilho esquerdo sobe junto via desktopRailClasses no UnifiedFocusCard.
    const [desktopPanelCollapsed, setDesktopPanelCollapsed] = useState(false);
    const {
        bodyCardOpen,
        cameraIntent,
        canShowOrbitPosition,
        clearPlanetTargets,
        closeFocusedObject,
        focusBody,
        focusPlanet,
        focusSun,
        frameFamousBelt,
        knownFocusTarget,
        orbitMode,
        planetFocusTargets,
        resetView,
        selectObject,
        setBodyCardOpen,
        showCloseUp,
        showNavigationPanel,
        showOrbit,
        sunFocusTarget,
        visibleFocusedObject,
    } = useRadar3DFocusActions({
        closestNowObjects,
        focusedObject,
        ephemeris,
        onClearSelection,
        onSelect,
        setMobileSheet,
        setPlanetsOpen,
        triggerTransition,
    });
    // Enquadramento derivado da intenção explícita de seleção/foco, sem reiniciar a câmera a cada tick de efeméride.
    const focusTarget = useSelectionFocusFraming(
        focusedObject,
        cameraIntent.kind === 'object' ? cameraIntent.nonce : 0,
        orbitMode,
        ephemeris?.earthHelioPositionAU ?? null,
        ephemeris?.earthScenePosition ?? null,
        LINEAR_AU_SCALE,
    );

    const [trajectoryPointFocus, setTrajectoryPointFocus] = useState<FocusFraming | null>(null);

    // Limpa o foco de trajetória quando o usuário interage com outra coisa.
    useEffect(() => { setTrajectoryPointFocus(null); }, [focusTarget, bodyCardOpen]);

    // Ao entrar no critério "Asteroides famosos", recua a câmera para enquadrar a régua dos planetas,
    // onde os conhecidos vivem (a ~100–270 unidades do Sol). Sem isso, eles ficam fora do quadro
    // inicial e o usuário precisaria dar zoom out manual para achá-los.
    useEffect(() => {
        if (selectionMode === 'famous') frameFamousBelt();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectionMode]);

    const activeMode: SceneMode = deriveActiveMode(orbitMode, focusedObject);
    // Famosos (Ceres, Bennu, etc.) só aparecem no critério dedicado "Asteroides famosos", em qualquer
    // régua. Fora dele, a cena mostra apenas o feed de aproximações, sem misturar os dois conjuntos.
    const showKnownAsteroidsInScene = selectionMode === 'famous';
    const sidePanelRef = useRef<HTMLDivElement>(null);
    const planetFlyoutRef = useRef<HTMLDivElement>(null);
    const focusCardRef = useRef<HTMLDivElement>(null);
    const bodyCardRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const noGoRects = useLabelNoGoRects({
        canvasContainerRef,
        sidePanelRef,
        planetFlyoutRef,
        focusCardRef,
        bodyCardRef,
        fullscreen,
        planetsOpen,
        focusedObjectId: focusedObject?.approach.id ?? null,
        bodyCardOpen,
        mobileSheet,
    });

    const { biasX: panelBiasX, biasY: panelBiasY } = usePanelBias({
        canvasContainerRef,
        sidePanelRef,
        focusCardRef,
        bodyCardRef,
        activeCardVisible: Boolean(visibleFocusedObject || bodyCardOpen),
    });

    useEffect(() => {
        if (!fullscreen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [fullscreen]);

    return (
        <section>
            {fullscreen && (
                <div className="h-[calc(100dvh-7rem)] min-h-[360px] sm:h-[calc(100vh-8rem)] sm:min-h-[400px] lg:min-h-[560px] rounded-lg border border-white/5 bg-white/[0.02]" aria-hidden />
            )}
            <div
                ref={canvasContainerRef}
                data-tutorial="radar-canvas"
                /* Sinaliza o modo tela cheia para o tutorial: com ele ativo, ESC sai
                   do fullscreen (handler acima) e não deve encerrar o tutorial junto. */
                data-fullscreen={fullscreen ? 'true' : undefined}
                /* Gradiente radial: ponto focal levemente acima do centro cria profundidade
                   atmosférica sem competir com os objetos científicos da cena. */
                className={fullscreen
                    ? 'fixed inset-0 z-50 bg-[#03060d] [background-image:radial-gradient(ellipse_70%_55%_at_50%_40%,#071420_0%,#03060d_70%)] lg:cursor-grab lg:active:cursor-grabbing touch-none'
                    : 'relative h-[calc(100dvh-7rem)] min-h-[360px] sm:h-[calc(100vh-8rem)] sm:min-h-[400px] lg:min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-[#03060d] [background-image:radial-gradient(ellipse_70%_55%_at_50%_40%,#071420_0%,#03060d_70%)] lg:cursor-grab lg:active:cursor-grabbing touch-none'}
                onContextMenu={(e) => e.preventDefault()}
            >
                <RadarSceneCanvas
                    noGoRects={noGoRects}
                    panelBiasX={panelBiasX}
                    panelBiasY={panelBiasY}
                    closestNowObjects={sceneObjects}
                    selectedId={selectedId}
                    orbitMode={orbitMode}
                    onSelect={selectObject}
                    cameraIntent={cameraIntent}
                    focusTarget={trajectoryPointFocus ?? focusTarget}
                    sunFocusTarget={sunFocusTarget}
                    knownFocusTarget={knownFocusTarget}
                    planetFocusTargets={planetFocusTargets}
                    ephemeris={ephemeris}
                    fallbackSunDirection={fallbackSunDirection}
                    locale={locale}
                    showLabels={showLabels}
                    showKnownAsteroids={showKnownAsteroidsInScene}
                    bodyCardOpen={bodyCardOpen}
                    onBodyCardOpenChange={setBodyCardOpen}
                    onClearPlanetTargets={clearPlanetTargets}
                    onFocusSun={focusSun}
                    onFocusPlanet={focusPlanet}
                    onFocusBody={focusBody}
                    onFocusTrajectoryPoint={setTrajectoryPointFocus}
                />
                <RadarNavigationPanel
                    en={en}
                    locale={locale}
                    orbitMode={orbitMode}
                    closestNowObjects={closestNowObjects}
                    selectedId={selectedId}
                    objectLimit={objectLimit}
                    selectionMode={selectionMode}
                    onLimitChange={onLimitChange}
                    onModeChange={onModeChange}
                    radarLoading={radarLoading}
                    onRefresh={onRefresh}
                    mobileSheet={mobileSheet}
                    onMobileSheetChange={setMobileSheet}
                    desktopCollapsed={desktopPanelCollapsed}
                    onDesktopCollapsedChange={setDesktopPanelCollapsed}
                    planetsOpen={planetsOpen}
                    onPlanetsOpenChange={setPlanetsOpen}
                    bodyCardOpen={bodyCardOpen}
                    sidePanelRef={sidePanelRef}
                    planetFlyoutRef={planetFlyoutRef}
                    onSelectObject={selectObject}
                    onFocusBody={focusBody}
                    onFocusPlanet={focusPlanet}
                    onFocusSun={focusSun}
                />
                {/* Barra de ações mobile: some enquanto um sheet ou card ocupa o rodapé. */}
                <MobileActionBar
                    en={en}
                    hidden={mobileSheet !== null || Boolean(visibleFocusedObject) || Boolean(bodyCardOpen)}
                    onOpenObjects={showNavigationPanel}
                    onOpenFilters={() => setMobileSheet('filters')}
                    onOpenGuide={() => setManualOpen(true)}
                />
                <SceneToolbar
                    en={en}
                    activeMode={activeMode}
                    showLabels={showLabels}
                    onShowLabelsChange={setShowLabels}
                    fullscreen={fullscreen}
                    onFullscreenChange={(v) => setFullscreen(typeof v === 'function' ? v(fullscreen) : v)}
                    onResetView={resetView}
                />
                <RadarFloatingOverlays
                    en={en}
                    locale={locale}
                    desktopPanelCollapsed={desktopPanelCollapsed}
                    visibleFocusedObject={visibleFocusedObject}
                    onOpenFocus={onOpenFocus}
                    onCloseFocusedObject={closeFocusedObject}
                    orbitMode={orbitMode}
                    canShowOrbitPosition={canShowOrbitPosition}
                    onShowOrbit={showOrbit}
                    onShowCloseUp={showCloseUp}
                    onShowNavigationPanel={showNavigationPanel}
                    focusCardRef={focusCardRef}
                    bodyCardOpen={bodyCardOpen}
                    onBodyCardOpenChange={setBodyCardOpen}
                    bodyCardRef={bodyCardRef}
                    sceneTransitioning={sceneTransitioning}
                    radarLoading={radarLoading}
                    activeMode={activeMode}
                    manualOpen={manualOpen}
                    onManualOpenChange={setManualOpen}
                    lunarReference={lunarReference}
                    ephemerisAvailable={ephemeris !== null}
                />
            </div>
        </section>
    );
}
