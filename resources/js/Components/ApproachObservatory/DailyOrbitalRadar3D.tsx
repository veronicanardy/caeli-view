import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronDown, ChevronUp, Eye, EyeOff, Maximize2, Minimize2, RefreshCw, RotateCcw } from 'lucide-react';
import type { ClosestNowObject, LunarReference, ObjectLimit, SelectionMode, SunDirection, UnifiedApproach } from '@/types';
import { sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import type { SceneMode } from './Controls/MapManualModal';
import { RadarObjectControls } from './Controls/RadarObjectControls';
import { ReferenceSection, PlanetFlyout } from './Controls/ReferenceControls';
import { IconViewButton, ViewButton } from './Controls/ViewButtons';
import { OrbitWelcomeToast, RadarWelcomeToast } from './Controls/WelcomeToast';
import { FocusCard } from './Panels/FocusCard';
import { BodyInfoCard } from './Panels/BodyInfoCard';
import { EmptyModeMessage, listTitle, MobilePanelMenuButton, MobilePanelSectionHeader, type MobilePanelSection } from './Panels/MobilePanelControls';
import { SceneLegend } from './Panels/SceneLegend';
import { ObjectListItem } from './Lists/RadarSceneObjectListItem';
import { RadarScene } from './Scene/RadarScene';
import { LabelNoGoContext, type NoGoRect } from './Overlays/SceneLabels';
import {
    CAMERA_FOV_DEG,
    MAX_CAMERA_DISTANCE,
    framingForBody,
    type CameraViewKey,
    type FocusFraming,
} from './Scene/CameraRig';
import { nextCameraNonce, type CameraIntent } from './Scene/cameraIntent';
import { PLANET_CONFIG, type PlanetId } from './Scene/planetConfig';
import { deriveActiveMode } from './Scene/sceneMode';
import { useSceneEphemeris } from './Scene/useSceneEphemeris';
import { useSelectionFocusFraming } from './Scene/useSelectionFocusFraming';

/**
 * Radar orbital 3D — visualização principal da aproximação diária.
 *
 * Por que existe: o radar SVG projeta o plano eclíptico ortograficamente, colapsando
 * o eixo Z. Asteroides com alta inclinação orbital (ex.: 2018 CX, i ≈ 25°) aparecem
 * mal posicionados: sua distância 3D real é 60 DL, mas a projeção (x, y) cai entre
 * 1 e 5 DL. Esta cena preserva os eixos X/Y/Z reais para que a profundidade seja honesta.
 *
 * Dois modos de visualização coexistem:
 *   - 'radar'  : geocêntrico, escala logarítmica comprimida (Terra na origem).
 *   - 'orbit'  : heliocêntrico, escala linear em UA (Sol na origem).
 * A troca só ocorre quando um objeto selecionado tem elementos orbitais com época de
 * periélio válida (tpJd ≠ 0) — sem isso a posição Kepleriana não é computável.
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
     * Direção do Sol (eclíptica geocêntrica) para o instante atual, calculada no servidor
     * via SunDirectionCalculator e transmitida pelo Inertia. Usada como fallback SÍNCRONO
     * para a luz direcional — a cena nunca parte de um vetor cardinal arbitrário enquanto
     * o astronomy-engine ainda está resolvendo seu import lazy.
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
    const [noGoRects, setNoGoRects] = useState<NoGoRect[]>([]);

    // Recalcula as zonas proibidas para labels — painel lateral, flyout e cards flutuantes.
    useEffect(() => {
        const toCanvasRect = (element: HTMLDivElement, canvasRect: DOMRect): NoGoRect => {
            const rect = element.getBoundingClientRect();
            return {
                left: rect.left - canvasRect.left,
                top: rect.top - canvasRect.top,
                right: rect.right - canvasRect.left,
                bottom: rect.bottom - canvasRect.top,
            };
        };

        const update = () => {
            const canvas = canvasContainerRef.current;
            if (!canvas) return;
            const canvasRect = canvas.getBoundingClientRect();
            const elements = [
                sidePanelRef.current,
                planetFlyoutRef.current,
                focusCardRef.current,
                bodyCardRef.current,
            ].filter((element): element is HTMLDivElement => Boolean(element));

            setNoGoRects(elements.map((element) => toCanvasRect(element, canvasRect)));
        };
        update();
        const observer = new ResizeObserver(update);
        if (sidePanelRef.current) observer.observe(sidePanelRef.current);
        if (planetFlyoutRef.current) observer.observe(planetFlyoutRef.current);
        if (focusCardRef.current) observer.observe(focusCardRef.current);
        if (bodyCardRef.current) observer.observe(bodyCardRef.current);
        if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [fullscreen, planetsOpen, focusedObject, bodyCardOpen, panelCollapsed, mobilePanelSection]);

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
                <LabelNoGoContext.Provider value={noGoRects}>
                <Canvas
                    camera={{ position: [0, 4.5, 9], fov: CAMERA_FOV_DEG, near: 0.01, far: MAX_CAMERA_DISTANCE * 3 }}
                    dpr={[1, 1.6]}
                    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                >
                    <Suspense fallback={null}>
                        <RadarScene
                            closestNowObjects={sceneObjects}
                            selectedId={selectedId}
                            orbitMode={orbitMode}
                            onSelect={(approach) => { setBodyCardOpen(null); clearPlanetTargets(); selectObject(approach); }}
                            cameraIntent={cameraIntent}
                            focusTarget={focusTarget ?? sunFocusTarget ?? Object.values(planetFocusTargets)[0] ?? null}
                            ephemeris={ephemeris}
                            fallbackSunDirection={fallbackSunDirection}
                            locale={locale}
                            objectLimit={objectLimit}
                            showLabels={showLabels}
                            onFocusSun={focusSun}
                            isSunFocused={bodyCardOpen === 'sun'}
                            onFocusMercury={() => focusPlanet('mercury')}
                            isMercuryFocused={bodyCardOpen === 'mercury'}
                            onFocusVenus={() => focusPlanet('venus')}
                            isVenusFocused={bodyCardOpen === 'venus'}
                            onFocusMars={() => focusPlanet('mars')}
                            isMarsFocused={bodyCardOpen === 'mars'}
                            onFocusJupiter={() => focusPlanet('jupiter')}
                            isJupiterFocused={bodyCardOpen === 'jupiter'}
                            onFocusSaturn={() => focusPlanet('saturn')}
                            isSaturnFocused={bodyCardOpen === 'saturn'}
                            onFocusUranus={() => focusPlanet('uranus')}
                            isUranusFocused={bodyCardOpen === 'uranus'}
                            onFocusNeptune={() => focusPlanet('neptune')}
                            isNeptuneFocused={bodyCardOpen === 'neptune'}
                            onFocusBody={focusBody}
                        />
                    </Suspense>
                </Canvas>

                {/* Painel lateral — canto superior esquerdo. */}
                <div className="pointer-events-none absolute left-3 top-3 z-10">
                    <div className="pointer-events-auto relative flex flex-col sm:flex-row items-start gap-2">
                        {panelCollapsed ? (
                            <button
                                type="button"
                                onClick={showNavigationPanel}
                                aria-label={en ? 'Show navigation panel' : 'Mostrar painel de navegaÃ§Ã£o'}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-space-950/90 px-2.5 py-1.5 text-[11px] font-medium text-white/75 shadow-glow backdrop-blur transition hover:border-white/25 hover:text-white sm:hidden"
                            >
                                <ChevronDown className="size-3.5 -rotate-90" />
                                <span>{en ? 'Objects' : 'Objetos'}</span>
                            </button>
                        ) : null}

                            {/* Painel lateral principal — sempre visível em desktop, toggle em mobile. */}
                        <div
                            ref={sidePanelRef}
                            className={[
                                'flex flex-col rounded-xl border border-white/12 bg-space-950/88 backdrop-blur-xl',
                                orbitMode
                                    ? 'sm:flex sm:h-[min(18rem,49vh)] sm:w-[min(18rem,48vw)]'
                                    : 'sm:flex sm:h-[min(22rem,50vh)] sm:w-[min(18rem,48vw)]',
                                // mobile: escondido apenas quando o usuário recolhe o painel
                                panelCollapsed
                                    ? 'hidden sm:flex'
                                    : orbitMode
                                        ? 'flex h-[min(10.5rem,27vh)] w-[min(15rem,calc(100vw-5rem))]'
                                        : 'flex h-[min(13rem,33vh)] w-[min(15rem,calc(100vw-5rem))]',
                            ].join(' ')}
                        >
                            {/* Header mobile: título + botão de fechar o painel */}
                            <div className="border-b border-white/10 px-2 pt-1 pb-1.5 sm:hidden">
                                <button
                                    type="button"
                                    onClick={() => { setPanelCollapsed(true); setMobilePanelSection('menu'); setPlanetsOpen(false); }}
                                    aria-label={en ? 'Collapse panel' : 'Recolher painel'}
                                    className="flex w-full flex-col items-center gap-1 rounded-lg py-0.5 text-signal-cyan/75 transition hover:text-signal-cyan"
                                >
                                    <span className="h-1 w-10 rounded-full bg-white/18" aria-hidden />
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
                                        <ChevronUp className="size-3" aria-hidden />
                                        {en ? 'Objects' : 'Objetos'}
                                    </span>
                                </button>
                            </div>

                            <div className="flex flex-1 flex-col sm:hidden">
                                {mobilePanelSection === 'menu' ? (
                                    <div className="flex flex-1 flex-col gap-2 px-2 py-2">
                                        {!orbitMode ? (
                                            <MobilePanelMenuButton
                                                label={en ? 'Filters' : 'Filtros'}
                                                subtitle={en ? 'Amount and criterion' : 'Quantidade e critério'}
                                                onClick={() => setMobilePanelSection('filters')}
                                            />
                                        ) : null}
                                        <MobilePanelMenuButton
                                            label={en ? 'References' : 'Referências'}
                                            subtitle={en ? 'Sun, Earth, Moon and planets' : 'Sol, Terra, Lua e planetas'}
                                            onClick={() => setMobilePanelSection('reference')}
                                        />
                                        <MobilePanelMenuButton
                                            label={en ? 'Nearest objects' : 'Objetos próximos'}
                                            subtitle={listTitle(closestNowObjects.length, selectionMode, en)}
                                            onClick={() => setMobilePanelSection('objects')}
                                        />
                                    </div>
                                ) : null}

                                {mobilePanelSection === 'filters' && !orbitMode ? (
                                    <div className="flex flex-1 flex-col">
                                        <MobilePanelSectionHeader
                                            title={en ? 'Filters' : 'Filtros'}
                                            backLabel={en ? 'Back' : 'Voltar'}
                                            onBack={() => setMobilePanelSection('menu')}
                                        />
                                            <div className="min-h-0 px-2 py-2">
                                                <RadarObjectControls
                                                    objectLimit={objectLimit}
                                                    selectionMode={selectionMode}
                                                    onLimitChange={onLimitChange}
                                                    onModeChange={onModeChange}
                                                    locale={locale}
                                                    loading={radarLoading}
                                                    criterionLocked={orbitMode}
                                                />
                                        </div>
                                    </div>
                                ) : null}

                                {mobilePanelSection === 'reference' ? (
                                    <div className="flex min-h-0 flex-1 flex-col">
                                        <MobilePanelSectionHeader
                                            title={en ? 'References' : 'Referências'}
                                            backLabel={en ? 'Back' : 'Voltar'}
                                            onBack={() => { setMobilePanelSection('menu'); setPlanetsOpen(false); }}
                                        />
                                        <ReferenceSection
                                            en={en}
                                            orbitMode={orbitMode}
                                            planetsOpen={planetsOpen}
                                            onPlanetsOpenChange={setPlanetsOpen}
                                            onFocusEarth={() => focusBody('earth')}
                                            onFocusMoon={() => focusBody('moon')}
                                            onFocusSun={focusSun}
                                        />
                                        {planetsOpen && !orbitMode ? (
                                            <div className="min-h-0 flex-1 border-t border-white/10 px-2 py-2">
                                                <div className="max-h-[8.5rem] overflow-y-auto rounded-xl border border-white/10 bg-space-950 px-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                                                    <PlanetFlyout
                                                        en={en}
                                                        focusedId={bodyCardOpen as PlanetId | null}
                                                        onFocus={focusPlanet}
                                                    />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {mobilePanelSection === 'objects' ? (
                                    <div className="flex min-h-0 flex-1 flex-col">
                                        <MobilePanelSectionHeader
                                            title={en ? 'Nearest objects' : 'Objetos próximos'}
                                            backLabel={en ? 'Back' : 'Voltar'}
                                            onBack={() => setMobilePanelSection('menu')}
                                            trailing={onRefresh ? (
                                                <button
                                                    type="button"
                                                    onClick={onRefresh}
                                                    disabled={radarLoading}
                                                    title={en ? 'Refresh data' : 'Atualizar dados'}
                                                    aria-label={en ? 'Refresh data' : 'Atualizar dados'}
                                                    className="rounded p-0.5 text-white/35 transition outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-40"
                                                >
                                                    <RefreshCw className={['size-3', radarLoading ? 'animate-spin' : ''].join(' ')} />
                                                </button>
                                            ) : null}
                                        />
                                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2">
                                            {radarLoading ? null : closestNowObjects.length === 0 ? (
                                                <EmptyModeMessage selectionMode={selectionMode} locale={locale} />
                                            ) : (
                                                <div className="min-h-0 max-h-[8.75rem] flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-space-950 px-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                                                    <ul className="space-y-0.5">
                                                        {closestNowObjects.map((o, index) => (
                                                            <ObjectListItem
                                                                key={o.approach.id}
                                                                object={o}
                                                                palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                                                                isSelected={o.approach.id === selectedId}
                                                                onSelect={selectObject}
                                                                locale={locale}
                                                                selectionMode={selectionMode}
                                                                compact={objectLimit === 30}
                                                                orbitMode={orbitMode}
                                                            />
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Controles de seleção: quantidade + critério. */}
                            {!orbitMode ? (
                                <div className="hidden border-b border-white/10 px-2 py-2 sm:block">
                                    <RadarObjectControls
                                        objectLimit={objectLimit}
                                        selectionMode={selectionMode}
                                        onLimitChange={onLimitChange}
                                        onModeChange={onModeChange}
                                        locale={locale}
                                        loading={radarLoading}
                                        criterionLocked={orbitMode}
                                    />
                                </div>
                            ) : null}

                            {/* Corpos de referência — visíveis quando painel está expandido. */}
                            <div className="hidden sm:block">
                                <ReferenceSection
                                    en={en}
                                    orbitMode={orbitMode}
                                    planetsOpen={planetsOpen}
                                    onPlanetsOpenChange={setPlanetsOpen}
                                    onFocusEarth={() => focusBody('earth')}
                                    onFocusMoon={() => focusBody('moon')}
                                    onFocusSun={focusSun}
                                />
                            </div>

                            {/* Lista dos objetos: ocupa o espaço restante do painel com scroll. */}
                            <div className="hidden min-h-0 flex-1 flex-col px-2 py-2 sm:flex">
                                <div className="flex items-center justify-between px-1 pb-1.5">
                                    <span className="text-[11px] uppercase tracking-wide text-white/45">
                                        {listTitle(closestNowObjects.length, selectionMode, en)}
                                    </span>
                                    {onRefresh ? (
                                        <button
                                            type="button"
                                            onClick={onRefresh}
                                            disabled={radarLoading}
                                            title={en ? 'Refresh data' : 'Atualizar dados'}
                                            aria-label={en ? 'Refresh data' : 'Atualizar dados'}
                                            className="rounded p-0.5 text-white/35 transition outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-40"
                                        >
                                            <RefreshCw className={['size-3', radarLoading ? 'animate-spin' : ''].join(' ')} />
                                        </button>
                                    ) : null}
                                </div>
                                {radarLoading ? null : closestNowObjects.length === 0 ? (
                                    <EmptyModeMessage selectionMode={selectionMode} locale={locale} />
                                ) : (
                                    <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                                        {closestNowObjects.map((o, index) => (
                                            <ObjectListItem
                                                key={o.approach.id}
                                                object={o}
                                                palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                                                isSelected={o.approach.id === selectedId}
                                                onSelect={selectObject}
                                                locale={locale}
                                                selectionMode={selectionMode}
                                                compact={objectLimit === 30}
                                                orbitMode={orbitMode}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Flyout de planetas — abre à direita do painel lateral.
                            Em mobile: aparece abaixo do painel (column) em vez de ao lado. */}
                        {planetsOpen && !orbitMode && mobilePanelSection !== 'reference' ? (
                            <div
                                ref={planetFlyoutRef}
                                className="flex flex-col rounded-xl border border-white/12 bg-space-950/88 backdrop-blur-xl overflow-y-auto
                                           h-[min(13rem,34vh)] w-[min(15rem,calc(100vw-5rem))]
                                           sm:h-[min(26rem,70vh)] sm:w-[min(14rem,40vw)]"
                            >
                                <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-white/45 border-b border-white/10">
                                    {en ? 'Planets' : 'Planetas'}
                                </div>
                                <PlanetFlyout
                                    en={en}
                                    focusedId={bodyCardOpen as PlanetId | null}
                                    onFocus={focusPlanet}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Botões de câmera + labels + fullscreen — canto superior direito, sempre visíveis.
                    Desktop: horizontal. Mobile: coluna vertical de ícones. */}
                <div className="pointer-events-none absolute right-3 top-3 z-20">
                    {/* Desktop: tudo numa linha */}
                    <div className="pointer-events-auto hidden sm:flex items-center gap-1.5">
                        {activeMode !== 'orbit' ? (
                            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-space-950/82 p-1 backdrop-blur">
                                <ViewButton active={view === 'top' && !visibleFocusedObject} onClick={() => pickView('top')}>
                                    {en ? 'Top' : 'Superior'}
                                </ViewButton>
                                <ViewButton active={view === 'side' && !visibleFocusedObject} onClick={() => pickView('side')}>
                                    {en ? 'Side' : 'Lateral'}
                                </ViewButton>
                                <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
                                <ViewButton active={view === 'perspective' && !visibleFocusedObject} onClick={resetView}>
                                    {en ? 'Reset' : 'Resetar'}
                                </ViewButton>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setShowLabels((v) => !v)}
                            title={showLabels ? (en ? 'Hide markers' : 'Ocultar marcações') : (en ? 'Show markers' : 'Mostrar marcações')}
                            aria-label={showLabels ? (en ? 'Hide markers' : 'Ocultar marcações') : (en ? 'Show markers' : 'Mostrar marcações')}
                            className={['flex items-center justify-center rounded-full border p-1.5 backdrop-blur transition', showLabels ? 'border-white/10 bg-space-950/82 text-white/60 hover:border-white/25 hover:text-white' : 'border-white/20 bg-white/8 text-white/35 hover:text-white/60'].join(' ')}
                        >
                            {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFullscreen((v) => !v)}
                            title={fullscreen ? (en ? 'Exit fullscreen' : 'Sair da tela cheia') : (en ? 'Fullscreen' : 'Tela cheia')}
                            aria-label={fullscreen ? (en ? 'Exit fullscreen' : 'Sair da tela cheia') : (en ? 'Fullscreen' : 'Tela cheia')}
                            className="flex items-center justify-center rounded-full border border-white/10 bg-space-950/82 p-1.5 text-white/60 backdrop-blur transition hover:border-white/25 hover:text-white"
                        >
                            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        </button>
                    </div>

                    {/* Mobile: coluna vertical de ícones */}
                    <div className="pointer-events-auto flex sm:hidden flex-col items-center gap-1.5">
                        {/* Pill vertical de vistas de câmera */}
                        {activeMode !== 'orbit' ? (
                            <div className="flex flex-col items-center gap-0.5 rounded-full border border-white/10 bg-space-950/82 py-1 px-1 backdrop-blur">
                                <IconViewButton active={view === 'top' && !visibleFocusedObject} onClick={() => pickView('top')} title={en ? 'Top view' : 'Vista superior'}>
                                    <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="7" cy="7" r="5.5" />
                                        <line x1="7" y1="1.5" x2="7" y2="4" /><line x1="7" y1="10" x2="7" y2="12.5" />
                                        <line x1="1.5" y1="7" x2="4" y2="7" /><line x1="10" y1="7" x2="12.5" y2="7" />
                                    </svg>
                                </IconViewButton>
                                <IconViewButton active={view === 'side' && !visibleFocusedObject} onClick={() => pickView('side')} title={en ? 'Side view' : 'Vista lateral'}>
                                    <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <ellipse cx="7" cy="7" rx="5.5" ry="2.5" />
                                        <line x1="1.5" y1="7" x2="12.5" y2="7" />
                                    </svg>
                                </IconViewButton>
                                <span className="my-0.5 h-px w-3.5 bg-white/10" aria-hidden />
                                <IconViewButton active={view === 'perspective' && !visibleFocusedObject} onClick={resetView} title={en ? 'Reset view' : 'Resetar vista'}>
                                    <RotateCcw className="size-3" />
                                </IconViewButton>
                            </div>
                        ) : null}
                        {/* Labels toggle */}
                        <button
                            type="button"
                            onClick={() => setShowLabels((v) => !v)}
                            title={showLabels ? (en ? 'Hide markers' : 'Ocultar marcações') : (en ? 'Show markers' : 'Mostrar marcações')}
                            aria-label={showLabels ? (en ? 'Hide markers' : 'Ocultar marcações') : (en ? 'Show markers' : 'Mostrar marcações')}
                            className={['flex items-center justify-center rounded-full border p-1.5 backdrop-blur transition', showLabels ? 'border-white/10 bg-space-950/82 text-white/60 hover:border-white/25 hover:text-white' : 'border-white/20 bg-white/8 text-white/35 hover:text-white/60'].join(' ')}
                        >
                            {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        </button>
                        {/* Fullscreen */}
                        <button
                            type="button"
                            onClick={() => setFullscreen((v) => !v)}
                            title={fullscreen ? (en ? 'Exit fullscreen' : 'Sair da tela cheia') : (en ? 'Fullscreen' : 'Tela cheia')}
                            aria-label={fullscreen ? (en ? 'Exit fullscreen' : 'Sair da tela cheia') : (en ? 'Fullscreen' : 'Tela cheia')}
                            className="flex items-center justify-center rounded-full border border-white/10 bg-space-950/82 p-1.5 text-white/60 backdrop-blur transition hover:border-white/25 hover:text-white"
                        >
                            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Painel de foco inline — desliza da esquerda quando um objeto é selecionado.
                    Mostra as mesmas métricas do radar SVG sem sair da experiência 3D. */}
                {visibleFocusedObject ? (
                    <FocusCard
                        object={visibleFocusedObject}
                        onOpenFocus={onOpenFocus}
                        onClose={closeFocusedObject}
                        orbitMode={orbitMode}
                        hasOrbit={Boolean(visibleFocusedObject.trajectory?.orbitalElements)}
                        canShowOrbitPosition={canShowOrbitPosition}
                        onShowOrbit={showOrbit}
                        onShowCloseUp={showCloseUp}
                        locale={locale}
                        mobileTopAlign={false}
                        onShowPanel={showNavigationPanel}
                        panelRef={focusCardRef}
                    />
                ) : bodyCardOpen ? (
                    <BodyInfoCard
                        body={bodyCardOpen}
                        onClose={() => setBodyCardOpen(null)}
                        locale={locale}
                        mobileTopAlign={false}
                        panelRef={bodyCardRef}
                    />
                ) : null}

                {/* Título e badge — overlay centrado na borda inferior do canvas */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                    <h2 className="text-[11px] font-medium text-white/40">
                        {en ? 'Orbital radar · 3D' : 'Radar orbital · 3D'}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/30 bg-signal-cyan/8 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-signal-cyan/70">
                        {en ? 'Live' : 'Ao vivo'}
                    </span>
                </div>

                {/* Overlay de carregamento — mesmo visual para transição de modo e atualização de filtros. */}
                {(sceneTransitioning || radarLoading) ? (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#03060d]/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-space-950/90 px-4 py-2.5 text-[13px] text-white/70 shadow-glow">
                            <span className="size-2 animate-pulse rounded-full bg-signal-cyan" aria-hidden />
                            {en ? 'Loading…' : 'Carregando…'}
                        </div>
                    </div>
                ) : null}

                {/* Toasts de boas-vindas — primeira visita ao radar e à vista orbital. */}
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    {activeMode === 'radar'
                        ? <RadarWelcomeToast locale={locale} onOpenManual={() => setManualOpen(true)} />
                        : <OrbitWelcomeToast locale={locale} onOpenManual={() => setManualOpen(true)} />}
                </div>

                <SceneLegend lunarReference={lunarReference} locale={locale} mode={activeMode} manualOpen={manualOpen} onManualOpenChange={setManualOpen} />
                </LabelNoGoContext.Provider>
            </div>
        </section>
    );
}
