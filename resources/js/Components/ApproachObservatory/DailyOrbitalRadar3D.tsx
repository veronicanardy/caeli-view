import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, LunarReference, ObjectLimit, SelectionMode, SunDirection, UnifiedApproach } from '@/types';
import { sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import type { SceneMode } from './Controls/MapManualModal';
import { SceneToolbar } from './Controls/SceneToolbar';
import type { MobilePanelSection } from './Panels/MobilePanelControls';
import { RadarFloatingOverlays } from './Panels/RadarFloatingOverlays';
import { RadarNavigationPanel } from './Panels/RadarNavigationPanel';
import {
    framingForBody,
    type CameraViewKey,
    type FocusFraming,
} from './Scene/CameraRig';
import { nextCameraNonce, type CameraIntent } from './Scene/cameraIntent';
import { PLANET_CONFIG, type PlanetId } from './Scene/planetConfig';
import { RadarSceneCanvas } from './Scene/RadarSceneCanvas';
import { deriveActiveMode } from './Scene/sceneMode';
import { useLabelNoGoRects } from './Scene/useLabelNoGoRects';
import { useSceneEphemeris } from './Scene/useSceneEphemeris';
import { useSelectionFocusFraming } from './Scene/useSelectionFocusFraming';

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
    // Isso garante que o overlay "Carregando…" pinte no browser antes de o Three.js
    // instanciar novos meshes (o que congela o thread principal por ~100 ms).
    const deferredObjects = useDeferredValue(closestNowObjects);
    const sceneObjects = radarLoading ? deferredObjects : closestNowObjects;

    // Fallback síncrono para a direção do Sol: o servidor já conhece a longitude solar atual
    // (Meeus, SunDirectionCalculator) e a envia pelo Inertia. Até o astronomy-engine resolver
    // seu import lazy, a cena ilumina a partir deste vetor — nunca de um cardinal arbitrário.
    const fallbackSunDirection = useMemo<[number, number, number]>(
        () => sunDirectionFromIncoming(initialSunDirection),
        [initialSunDirection],
    );

    // Efeméride calculada localmente com astronomy-engine (direção do Sol + posição da Lua).
    // Null até a biblioteca (carregada de forma lazy) resolver. A cena usa o fallback do servidor
    // até então. Recalculada a cada 10 s para que dia/noite e a Lua derivem realisticamente.
    const ephemeris = useSceneEphemeris();

    // Máquina de estados da câmera. O discriminante ('preset' | 'object' | 'body') informa
    // ao RadarScene qual tipo de transição executar no próximo tween.
    const [cameraIntent, setCameraIntent] = useState<CameraIntent>({
        kind: 'preset',
        view: 'perspective',
        nonce: 0,
    });
    const view = cameraIntent.view;

    const focusedObject = useMemo(
        () => closestNowObjects.find((o) => o.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );
    const [dismissedFocusObjectId, setDismissedFocusObjectId] = useState<string | null>(null);
    const visibleFocusedObject = focusedObject && focusedObject.approach.id !== dismissedFocusObjectId
        ? focusedObject
        : null;

    // Dois modos de visualização para um asteroide selecionado:
    //   - close-up (orbitMode = false): câmera voa ATÉ a rocha, exibindo o painel de foco.
    //   - órbita  (orbitMode = true) : câmera recua para enquadrar a órbita completa ao redor do Sol.
    // Selecionar qualquer objeto sempre começa em close-up; o botão "Ver órbita" alterna.
    const [orbitMode, setOrbitMode] = useState(false);

    // Overlay translúcido de "Carregando…" exibido brevemente durante a troca de modo, para
    // mascarar o salto visual enquanto a câmera re-enquadra e a cena heliocêntrica carrega.
    const [sceneTransitioning, setSceneTransitioning] = useState(false);
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerTransition = useCallback((fn: () => void) => {
        // Cancela qualquer transição anterior ainda em andamento antes de iniciar uma nova,
        // evitando que dois timers paralelos apaguem o overlay antes do tempo.
        if (transitionTimerRef.current !== null) {
            clearTimeout(transitionTimerRef.current);
        }
        setSceneTransitioning(true);
        fn();
        // 420 ms é suficiente para esconder o salto de câmera sem parecer lento.
        transitionTimerRef.current = setTimeout(() => {
            setSceneTransitioning(false);
            transitionTimerRef.current = null;
        }, 420);
    }, []);

    useEffect(() => {
        return () => {
            if (transitionTimerRef.current !== null) clearTimeout(transitionTimerRef.current);
        };
    }, []);

    // Enquadramento de câmera derivado da seleção atual. Recalculado apenas em mudanças
    // explícitas de intenção (selecionar objeto, alternar modo órbita) — não a cada tick
    // de efeméride, para evitar que atualizações de Sol/Lua reiniciem tweens em andamento.
    const focusTarget = useSelectionFocusFraming(
        focusedObject,
        cameraIntent.kind === 'object' ? cameraIntent.nonce : 0,
        orbitMode,
        ephemeris?.earthHelioPositionAU ?? null,
        ephemeris?.earthScenePosition ?? null,
    );

    // Modo ativo da cena. Heliocêntrico só quando o usuário pediu E o objeto tem
    // elementos orbitais com época de periélio válida (tpJd ≠ 0).
    const activeMode: SceneMode = deriveActiveMode(orbitMode, focusedObject);

    const [manualOpen, setManualOpen] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [planetsOpen, setPlanetsOpen] = useState(false);
    // Em mobile o painel começa colapsado para não cobrir o canvas.
    const [panelCollapsed, setPanelCollapsed] = useState(true);
    const [mobilePanelSection, setMobilePanelSection] = useState<MobilePanelSection>('menu');
    const [bodyCardOpen, setBodyCardOpen] = useState<'earth' | 'moon' | 'sun' | PlanetId | null>(null);
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

    const pickView = (key: CameraViewKey) => {
        onClearSelection?.();
        setBodyCardOpen(null);
        clearPlanetTargets();
        setCameraIntent((intent) => ({ kind: 'preset', view: key, nonce: nextCameraNonce(intent) }));
    };

    const selectObject = (approach: UnifiedApproach) => {
        const newObject = closestNowObjects.find((o) => o.approach.id === approach.id);
        const newHasOrbit = Boolean(newObject?.trajectory?.orbitalElements);
        // Em modo orbital, bloqueia clique em objetos sem órbita — eles são desabilitados na lista.
        if (orbitMode && !newHasOrbit) return;
        if (!orbitMode) setOrbitMode(false);
        setDismissedFocusObjectId(null);
        setBodyCardOpen(null);
        clearPlanetTargets();
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
        onSelect(approach);
    };

    const showOrbit = () => triggerTransition(() => {
        setOrbitMode(true);
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
    });

    const showCloseUp = () => triggerTransition(() => {
        setOrbitMode(false);
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
    });

    const [planetFocusTargets, setPlanetFocusTargets] = useState<Partial<Record<PlanetId, FocusFraming>>>({});
    const [sunFocusTarget, setSunFocusTarget] = useState<FocusFraming | null>(null);

    const clearPlanetTargets = useCallback(() => {
        setPlanetFocusTargets({});
        setSunFocusTarget(null);
    }, []);

    const showNavigationPanel = useCallback(() => {
        setDismissedFocusObjectId(null);
        onClearSelection?.();
        setBodyCardOpen(null);
        clearPlanetTargets();
        setPlanetsOpen(false);
        setPanelCollapsed(false);
        setMobilePanelSection('menu');
    }, [clearPlanetTargets, onClearSelection]);

    const closeFocusedObject = useCallback(() => {
        if (focusedObject) setDismissedFocusObjectId(focusedObject.approach.id);
        setBodyCardOpen(null);
        clearPlanetTargets();
        setPlanetsOpen(false);
    }, [clearPlanetTargets, focusedObject]);

    useEffect(() => {
        if (!focusedObject) {
            setDismissedFocusObjectId(null);
            return;
        }
        if (dismissedFocusObjectId && dismissedFocusObjectId !== focusedObject.approach.id) {
            setDismissedFocusObjectId(null);
        }
    }, [focusedObject, dismissedFocusObjectId]);

    useEffect(() => {
        if (!orbitMode) return;
        setPlanetsOpen(false);
        if (mobilePanelSection === 'filters') {
            setMobilePanelSection('menu');
        }
    }, [orbitMode, mobilePanelSection]);

    // Foca Terra ou Lua. Se estiver em modo órbita, dispara o overlay de transição antes de
    // re-enquadrar — o mesmo tratamento dado ao botão "Voltar ao Asteroide".
    const focusBody = (body: 'earth' | 'moon') => {
        onClearSelection?.();
        setBodyCardOpen(body);
        clearPlanetTargets();
        const doFocus = () => setCameraIntent((intent) => ({ kind: 'body', view: intent.view, body, nonce: nextCameraNonce(intent) }));
        if (orbitMode) {
            triggerTransition(() => { setOrbitMode(false); doFocus(); });
        } else {
            doFocus();
        }
    };

    const focusPlanet = useCallback((id: PlanetId) => {
        onClearSelection?.();
        setBodyCardOpen(id);
        setPlanetsOpen(false);
        setSunFocusTarget(null);
        const cfg = PLANET_CONFIG[id];
        const pos = ephemeris?.[cfg.ephemerisKey];
        if (pos) {
            setPlanetFocusTargets({ [id]: framingForBody(new THREE.Vector3(...pos), cfg.framingRadius) });
        } else {
            setPlanetFocusTargets({});
        }
    }, [ephemeris, onClearSelection]);

    const focusSun = useCallback(() => {
        onClearSelection?.();
        setBodyCardOpen('sun');
        clearPlanetTargets();
        const doFocus = () => {
            setSunFocusTarget(framingForBody(new THREE.Vector3(0, 0, 0), 0.5));
        };
        if (orbitMode) {
            triggerTransition(() => { setOrbitMode(false); doFocus(); });
        } else {
            doFocus();
        }
    }, [onClearSelection, orbitMode, triggerTransition, clearPlanetTargets]);

    const resetView = () => {
        onClearSelection?.();
        pickView('perspective');
    };

    // Se o objeto selecionado tem elementos orbitais com época de periélio, a posição
    // Kepleriana é computável e o botão de órbita pode ser habilitado.
    const canShowOrbitPosition = useMemo(() => {
        const tp = focusedObject?.trajectory?.orbitalElements?.tpJd;
        return Number.isFinite(tp) && tp !== 0;
    }, [focusedObject]);

    return (
        <section>
            {fullscreen && (
                <div className="h-[calc(100vh-8rem)] min-h-[400px] sm:min-h-[560px] rounded-lg border border-white/5 bg-white/[0.02]" aria-hidden />
            )}
            <div
                ref={canvasContainerRef}
                className={fullscreen
                    ? 'fixed inset-0 z-50 bg-[#03060d]'
                    : 'relative h-[calc(100vh-8rem)] min-h-[400px] sm:min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-[#03060d]'}
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
                    objectLimit={objectLimit}
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
