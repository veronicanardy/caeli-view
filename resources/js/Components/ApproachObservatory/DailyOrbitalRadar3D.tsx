import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ClosestNowObject, LunarReference, ObjectLimit, SelectionMode, SunDirection, UnifiedApproach } from '@/types';
import { sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import type { SceneMode } from './Controls/Manual/manualTypes';
import { SceneToolbar } from './Controls/SceneToolbar';
import type { MobilePanelSection } from './Panels/MobilePanelControls';
import { RadarFloatingOverlays } from './Panels/RadarFloatingOverlays';
import { RadarNavigationPanel } from './Panels/RadarNavigationPanel';
import { RadarSceneCanvas } from './Scene/RadarSceneCanvas';
import { deriveActiveMode } from './Scene/sceneMode';
import { useLabelNoGoRects } from './Scene/useLabelNoGoRects';
import { useSceneEphemeris } from './Scene/useSceneEphemeris';
import { useSelectionFocusFraming } from './Scene/useSelectionFocusFraming';
import { useRadar3DFocusActions } from './useRadar3DFocusActions';
import { useRadar3DTransition } from './useRadar3DTransition';

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
 * delegada para RadarSceneCanvas, RadarNavigationPanel, SceneToolbar e
 * RadarFloatingOverlays.
 *
 * Dois modos de visualização coexistem:
 *   - 'radar'  : geocêntrico, escala logarítmica comprimida (Terra na origem).
 *   - 'orbit'  : heliocêntrico, escala linear em UA (Sol na origem).
 * A troca só ocorre quando um objeto selecionado tem elementos orbitais com época de
 * periélio válida (tpJd ≠ 0), sem isso a posição Kepleriana não é computável.
 */

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
    /**
     * Direção do Sol (eclíptica geocêntrica) para o instante atual, calculada no servidor.
     * Serve como fallback síncrono até o astronomy-engine resolver seu import lazy.
     */
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
    const [fullscreen, setFullscreen] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [planetsOpen, setPlanetsOpen] = useState(false);
    // Em mobile o painel começa colapsado para não cobrir o canvas.
    const [panelCollapsed, setPanelCollapsed] = useState(true);
    const [mobilePanelSection, setMobilePanelSection] = useState<MobilePanelSection>('objects');
    const {
        bodyCardOpen,
        cameraIntent,
        canShowOrbitPosition,
        clearPlanetTargets,
        closeFocusedObject,
        focusBody,
        focusPlanet,
        focusSun,
        orbitMode,
        pickView,
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
        mobilePanelSection,
        onClearSelection,
        onSelect,
        setMobilePanelSection,
        setPanelCollapsed,
        setPlanetsOpen,
        triggerTransition,
    });
    const view = cameraIntent.view;

    // Enquadramento derivado da intenção explícita de seleção/foco, sem reiniciar a câmera a cada tick de efeméride.
    const focusTarget = useSelectionFocusFraming(
        focusedObject,
        cameraIntent.kind === 'object' ? cameraIntent.nonce : 0,
        orbitMode,
        ephemeris?.earthHelioPositionAU ?? null,
        ephemeris?.earthScenePosition ?? null,
    );

    const activeMode: SceneMode = deriveActiveMode(orbitMode, focusedObject);
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
        panelCollapsed,
        mobilePanelSection,
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
                <div className="h-[calc(100vh-8rem)] min-h-[400px] lg:min-h-[560px] rounded-lg border border-white/5 bg-white/[0.02]" aria-hidden />
            )}
            <div
                ref={canvasContainerRef}
                className={fullscreen
                    ? 'fixed inset-0 z-50 bg-[#03060d]'
                    : 'relative h-[calc(100vh-8rem)] min-h-[400px] lg:min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-[#03060d]'}
                onContextMenu={(e) => e.preventDefault()}
            >
                <RadarSceneCanvas
                    noGoRects={noGoRects}
                    closestNowObjects={sceneObjects}
                    selectedId={selectedId}
                    orbitMode={orbitMode}
                    onSelect={selectObject}
                    cameraIntent={cameraIntent}
                    focusTarget={focusTarget}
                    sunFocusTarget={sunFocusTarget}
                    planetFocusTargets={planetFocusTargets}
                    ephemeris={ephemeris}
                    fallbackSunDirection={fallbackSunDirection}
                    locale={locale}
                    showLabels={showLabels}
                    bodyCardOpen={bodyCardOpen}
                    onBodyCardOpenChange={setBodyCardOpen}
                    onClearPlanetTargets={clearPlanetTargets}
                    onFocusSun={focusSun}
                    onFocusPlanet={focusPlanet}
                    onFocusBody={focusBody}
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
                    panelCollapsed={panelCollapsed}
                    onPanelCollapsedChange={setPanelCollapsed}
                    mobilePanelSection={mobilePanelSection}
                    onMobilePanelSectionChange={setMobilePanelSection}
                    planetsOpen={planetsOpen}
                    onPlanetsOpenChange={setPlanetsOpen}
                    bodyCardOpen={bodyCardOpen}
                    sidePanelRef={sidePanelRef}
                    planetFlyoutRef={planetFlyoutRef}
                    onShowNavigationPanel={showNavigationPanel}
                    onSelectObject={selectObject}
                    onFocusBody={focusBody}
                    onFocusPlanet={focusPlanet}
                    onFocusSun={focusSun}
                />
                <SceneToolbar
                    en={en}
                    activeMode={activeMode}
                    view={view}
                    hasVisibleFocusedObject={Boolean(visibleFocusedObject)}
                    showLabels={showLabels}
                    onShowLabelsChange={setShowLabels}
                    fullscreen={fullscreen}
                    onFullscreenChange={setFullscreen}
                    onPickView={pickView}
                    onResetView={resetView}
                />
                <RadarFloatingOverlays
                    en={en}
                    locale={locale}
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
                />
            </div>
        </section>
    );
}
