import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { ClosestNowObject, LunarReference, ObjectLimit, SelectionMode, SunDirection, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { computeSceneEphemeris, KM_PER_AU, type SceneEphemeris } from '@/lib/sceneEphemeris';
import { sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { MapManualModal, type SceneMode } from './Controls/MapManualModal';
import { RadarObjectControls } from './Controls/RadarObjectControls';
import { OrbitWelcomeToast, RadarWelcomeToast } from './Controls/WelcomeToast';
import { FocusCard } from './Panels/FocusCard';
import { BodyInfoCard } from './Panels/BodyInfoCard';
import { RadarScene } from './Scene/RadarScene';
import {
    CAMERA_FOV_DEG,
    MAX_CAMERA_DISTANCE,
    computeFocusFraming,
    framingForBody,
    type CameraViewKey,
    type FocusFraming,
} from './Scene/CameraRig';
import { nextCameraNonce, type CameraIntent } from './Scene/cameraIntent';

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
    );

    // Modo ativo da cena. Heliocêntrico só quando o usuário pediu E o objeto tem
    // elementos orbitais com época de periélio válida (tpJd ≠ 0).
    const activeMode: SceneMode = deriveActiveMode(orbitMode, focusedObject);

    const [manualOpen, setManualOpen] = useState(false);

    const pickView = (key: CameraViewKey) => {
        onClearSelection?.();
        setCameraIntent((intent) => ({ kind: 'preset', view: key, nonce: nextCameraNonce(intent) }));
    };

    const selectObject = (approach: UnifiedApproach) => {
        const newObject = closestNowObjects.find((o) => o.approach.id === approach.id);
        const newHasOrbit = Boolean(newObject?.trajectory?.orbitalElements);
        if (!orbitMode || !newHasOrbit) setOrbitMode(false);
        setBodyCardOpen(null);
        setMercuryFocusTarget(null);
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

    const [bodyCardOpen, setBodyCardOpen] = useState<'earth' | 'moon' | 'mercury' | null>(null);
    const [mercuryFocusTarget, setMercuryFocusTarget] = useState<FocusFraming | null>(null);

    // Foca Terra ou Lua. Se estiver em modo órbita, dispara o overlay de transição antes de
    // re-enquadrar — o mesmo tratamento dado ao botão "Voltar ao Asteroide".
    const focusBody = (body: 'earth' | 'moon') => {
        onClearSelection?.();
        setBodyCardOpen(body);
        setMercuryFocusTarget(null);
        const doFocus = () => setCameraIntent((intent) => ({ kind: 'body', view: intent.view, body, nonce: nextCameraNonce(intent) }));
        if (orbitMode) {
            triggerTransition(() => { setOrbitMode(false); doFocus(); });
        } else {
            doFocus();
        }
    };

    const focusMercury = useCallback(() => {
        onClearSelection?.();
        setBodyCardOpen('mercury');
        const pos = ephemeris?.mercuryScenePosition;
        if (pos) setMercuryFocusTarget(framingForBody(new THREE.Vector3(...pos), 0.028));
    }, [ephemeris, onClearSelection]);

    const mercuryFocused = bodyCardOpen === 'mercury';

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
        <section className="space-y-4 transition-all duration-500 ease-out">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-glow transition-all duration-500 ease-out sm:p-5">
                <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h2 className="text-xl font-semibold text-white">
                                {en ? 'Orbital radar of the day' : 'Radar orbital do dia'}
                            </h2>
                            <span className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/45 bg-signal-cyan/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-cyan">
                                {en ? 'Live · 3D' : 'Ao vivo · 3D'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-white/60">
                            <span className="mr-1.5 font-medium text-white/80">
                                {en ? 'Current position' : 'Posição atual'}
                            </span>
                            {listTitle(closestNowObjects.length, selectionMode, en)}
                        </p>
                    </div>
                </header>
            </div>

            <div
                className="relative h-[72vh] min-h-[640px] overflow-hidden rounded-lg border border-white/10 bg-[#03060d] sm:h-[78vh] sm:min-h-[760px]"
                onContextMenu={(e) => e.preventDefault()}
            >
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
                            onSelect={(approach) => { setBodyCardOpen(null); setMercuryFocusTarget(null); selectObject(approach); }}
                            cameraIntent={cameraIntent}
                            focusTarget={focusTarget ?? mercuryFocusTarget}
                            ephemeris={ephemeris}
                            fallbackSunDirection={fallbackSunDirection}
                            locale={locale}
                            objectLimit={objectLimit}
                            onFocusMercury={focusMercury}
                            onFocusBody={focusBody}
                            isMercuryFocused={mercuryFocused}
                        />
                    </Suspense>
                </Canvas>

                {/* Barra superior: painel lateral + botões de câmera. */}
                <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-3">
                    <div className="pointer-events-auto flex h-[min(28rem,70vh)] w-[min(18rem,48%)] flex-col overflow-hidden rounded-xl border border-white/12 bg-space-950/88 backdrop-blur-xl">

                        {/* Controles de seleção: quantidade + critério — integrados no painel lateral. */}
                        <div className="border-b border-white/10 px-2 py-2">
                            <RadarObjectControls
                                objectLimit={objectLimit}
                                selectionMode={selectionMode}
                                onLimitChange={onLimitChange}
                                onModeChange={onModeChange}
                                locale={locale}
                                loading={radarLoading}
                            />
                        </div>

                        {/* Corpos de referência */}
                        <ReferenceSection
                            en={en}
                            mercuryFocused={mercuryFocused}
                            onFocusEarth={() => focusBody('earth')}
                            onFocusMoon={() => focusBody('moon')}
                            onFocusMercury={focusMercury}
                        />

                        {/* Lista dos objetos: ocupa o espaço restante do painel com scroll. */}
                        <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
                            <div className="px-1 pb-1.5 text-[11px] uppercase tracking-wide text-white/45">
                                {listTitle(closestNowObjects.length, selectionMode, en)}
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
                                            compact={objectLimit === 30}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Botões de visão de câmera — ocultos no modo órbita, onde a câmera é gerenciada
                        automaticamente pelo enquadramento heliocêntrico. */}
                    {activeMode !== 'orbit' ? (
                        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-space-950/82 p-1 backdrop-blur">
                            <ViewButton active={view === 'top' && !focusedObject} onClick={() => pickView('top')}>
                                {en ? 'Top' : 'Superior'}
                            </ViewButton>
                            <ViewButton active={view === 'side' && !focusedObject} onClick={() => pickView('side')}>
                                {en ? 'Side' : 'Lateral'}
                            </ViewButton>
                            <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
                            <ViewButton
                                active={view === 'perspective' && !focusedObject}
                                onClick={resetView}
                            >
                                {en ? 'Reset' : 'Resetar'}
                            </ViewButton>
                        </div>
                    ) : null}
                </div>

                {/* Painel de foco inline — desliza da esquerda quando um objeto é selecionado.
                    Mostra as mesmas métricas do radar SVG sem sair da experiência 3D. */}
                {focusedObject ? (
                    <FocusCard
                        object={focusedObject}
                        onOpenFocus={onOpenFocus}
                        onClose={() => selectObject(focusedObject.approach)}
                        orbitMode={orbitMode}
                        hasOrbit={Boolean(focusedObject.trajectory?.orbitalElements)}
                        canShowOrbitPosition={canShowOrbitPosition}
                        onShowOrbit={showOrbit}
                        onShowCloseUp={showCloseUp}
                        locale={locale}
                    />
                ) : bodyCardOpen ? (
                    <BodyInfoCard body={bodyCardOpen} onClose={() => setBodyCardOpen(null)} locale={locale} />
                ) : null}

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
            </div>
        </section>
    );
}

// --------------- Funções puras ---------------

function listTitle(count: number, mode: SelectionMode, en: boolean): string {
    if (mode === 'upcoming')  return en ? `${count} upcoming passes`     : `${count} próximas aproximações`;
    if (mode === 'featured')  return en ? 'Featured objects'              : 'Objetos em destaque';
    if (mode === 'attention') return en ? `${count} watch-list objects`   : `${count} objetos em maior atenção`;
    return en ? `${count} closest objects now` : `${count} objetos mais próximos agora`;
}

const EMPTY_MODE_MESSAGES: Record<SelectionMode, { pt: string; en: string }> = {
    nearest:   { pt: 'Nenhum objeto próximo encontrado agora.', en: 'No nearby objects found right now.' },
    upcoming:  { pt: 'Nenhuma aproximação prevista para hoje.', en: 'No close approaches scheduled for today.' },
    featured:  {
        pt: 'Nenhum dos objetos em destaque (Bennu, Eros, Ceres, Itokawa, Vesta) tem posição disponível no radar agora.',
        en: 'None of the featured objects (Bennu, Eros, Ceres, Itokawa, Vesta) have a position available in the radar right now.',
    },
    attention: {
        pt: 'Nenhum objeto monitorado pela NASA/JPL com posição disponível no radar agora.',
        en: 'No NASA/JPL-monitored objects with a position available in the radar right now.',
    },
};

function EmptyModeMessage({ selectionMode, locale }: { selectionMode: SelectionMode; locale: 'pt-BR' | 'en' }) {
    const msg = EMPTY_MODE_MESSAGES[selectionMode];
    return (
        <p className="px-1 py-2 text-[11px] leading-relaxed text-white/40">
            {locale === 'en' ? msg.en : msg.pt}
        </p>
    );
}


/**
 * Deriva o modo ativo da cena a partir do estado de seleção e modo de órbita.
 * Heliocêntrico só quando o usuário pediu E o objeto tem elementos com época de periélio válida.
 * Função pura extraída do componente para manter o corpo do useMemo sem lógica embutida.
 */
function deriveActiveMode(orbitMode: boolean, focusedObject: ClosestNowObject | null): SceneMode {
    if (!orbitMode || !focusedObject) return 'radar';
    const els = focusedObject.trajectory?.orbitalElements;
    if (!els || !Number.isFinite(els.tpJd) || els.tpJd === 0) return 'radar';
    return 'orbit';
}

// --------------- Sub-componentes locais ---------------

type ObjectListItemProps = {
    object: ClosestNowObject;
    palette: { future: string };
    isSelected: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    /** Modo compacto: oculta distância e reduz padding — usado com 30 objetos. */
    compact?: boolean;
};

/**
 * Item da lista de objetos próximos na barra lateral da cena.
 * Exibe cor de paleta, nome, distância e indicadores de estado (sem posição, perigo).
 */
function ObjectListItem({ object: o, palette, isSelected, onSelect, locale, compact = false }: ObjectListItemProps) {
    const en = locale === 'en';
    const hasScenePosition = Boolean(o.trajectory?.currentPoint);
    const hazard = o.approach.hazardFlag;

    return (
        <li>
            <button
                type="button"
                onClick={() => onSelect(o.approach)}
                title={
                    hasScenePosition
                        ? undefined
                        : en
                          ? 'No live position from Horizons right now — not shown on the radar.'
                          : 'Sem posição do Horizons no momento — não exibido no radar.'
                }
                className={[
                    'flex w-full items-center gap-2 rounded-lg text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                    compact ? 'px-2 py-1' : 'px-2 py-2',
                    isSelected ? 'bg-signal-cyan/15 text-white ring-1 ring-signal-cyan/40' : 'text-white/75 hover:bg-white/8 hover:text-white',
                    hasScenePosition ? '' : 'opacity-50',
                ].join(' ')}
            >
                <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10" style={{ backgroundColor: palette.future }} />
                <span className="min-w-0 flex-1 truncate font-medium">
                    {o.approach.displayName ?? o.approach.name}
                </span>
                {hazard ? (
                    <span className="shrink-0 text-[11px]" title={en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL'} aria-hidden>⚠️</span>
                ) : null}
                {!hasScenePosition ? (
                    <span className="shrink-0 text-[10px] text-amber-200/60" aria-hidden>
                        {en ? 'no pos.' : 'sem pos.'}
                    </span>
                ) : null}
                <span className="shrink-0 tabular-nums text-white/55">
                    {compactKm(o.currentDistanceKm)}
                </span>
            </button>
        </li>
    );
}

/**
 * Legenda no canto inferior direito. Mantém as duas referências de escala sempre visíveis
 * (1 DL e 1 UA) e expande para o manual completo via portal quando o usuário pede.
 * O manual fica fora do caminho principal para não intimidar à primeira vista.
 */
function SceneLegend({
    lunarReference,
    locale,
    mode,
    manualOpen,
    onManualOpenChange,
}: {
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    mode: SceneMode;
    manualOpen: boolean;
    onManualOpenChange: (open: boolean) => void;
}) {
    const en = locale === 'en';
    // Intl.NumberFormat é caro de instanciar — memoizado para não recriar a cada render.
    const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

    return (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-10 w-[min(22rem,46%)] overflow-hidden rounded-xl border border-white/18 bg-space-950/92 shadow-glow backdrop-blur-xl">
            {/* Referências de distância sempre visíveis — o que o usuário consulta com mais frequência. */}
            <div className="space-y-2 px-3 pt-3">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-white/75">
                        {en ? '🌙 1 LD · Earth-Moon distance' : '🌙 1 DL · distância Terra-Lua'}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{nf.format(lunarReference.distanceKm)} km</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-white/75">
                        {en ? '☀️ 1 AU · Earth-Sun distance' : '☀️ 1 UA · distância Terra-Sol'}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{nf.format(Math.round(KM_PER_AU))} km</span>
                </div>
            </div>

            {/* Botão que abre o manual completo via portal (fora do stacking context do canvas). */}
            <button
                type="button"
                onClick={() => onManualOpenChange(true)}
                className="mt-2 flex w-full items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-left text-[13px] font-semibold text-signal-cyan transition outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-signal-cyan"
            >
                <span className="inline-flex items-center gap-2">
                    <BookOpen className="size-4" aria-hidden />
                    {en ? (mode === 'radar' ? 'Radar guide' : 'Orbit guide') : (mode === 'radar' ? 'Guia do radar' : 'Guia da órbita')}
                </span>
                <ChevronDown className="-rotate-90 size-4" aria-hidden />
            </button>

            {manualOpen ? (
                createPortal(
                    <MapManualModal
                        mode={mode}
                        locale={locale}
                        lunarDistanceKm={lunarReference.distanceKm}
                        onClose={() => onManualOpenChange(false)}
                    />,
                    document.body,
                )
            ) : null}
        </div>
    );
}

// --------------- Hooks privados ---------------

/**
 * Calcula direção do Sol + posição da Lua com astronomy-engine, em cadência lenta (10 s).
 *
 * Os corpos se movem devagar na realidade (Lua ≈ 0,5°/h, ponto subsolar ≈ 15°/h), então
 * 10 s já dá deriva em tempo real honesta sem colocar o cálculo pesado no loop de render.
 * Retorna null até a biblioteca (lazy-loaded) resolver.
 */
function useSceneEphemeris(): SceneEphemeris | null {
    const [ephemeris, setEphemeris] = useState<SceneEphemeris | null>(null);

    useEffect(() => {
        let active = true;
        const update = () => {
            void computeSceneEphemeris(new Date()).then((result) => {
                if (active && result) setEphemeris(result);
            });
        };
        update();
        const id = window.setInterval(update, 10 * 1000);
        return () => {
            active = false;
            window.clearInterval(id);
        };
    }, []);

    return ephemeris;
}

/**
 * Deriva o enquadramento de câmera para o objeto selecionado.
 *
 * Recalcula apenas quando há mudança explícita de intenção de seleção (selectionFocusNonce
 * ou orbitMode mudam) — nunca a cada tick de efeméride. Isso evita que atualizações de
 * Sol/Lua reiniciem um tween de câmera já em andamento enquanto o usuário explora a cena.
 *
 * A posição heliocêntrica da Terra (earthHelioPositionAU) é lida via ref no momento do
 * cálculo para sempre usar o valor mais recente, sem torná-la dependência do effect.
 */
function useSelectionFocusFraming(
    focusedObject: ClosestNowObject | null,
    selectionFocusNonce: number,
    orbitMode: boolean,
    earthHelioPositionAU: { x: number; y: number; z: number } | null,
): FocusFraming | null {
    const [framing, setFraming] = useState<FocusFraming | null>(null);
    const latestEarthHelio = useRef(earthHelioPositionAU);

    useEffect(() => {
        latestEarthHelio.current = earthHelioPositionAU;
    }, [earthHelioPositionAU]);

    useEffect(() => {
        if (!focusedObject) {
            setFraming(null);
            return;
        }
        setFraming(computeFocusFraming(focusedObject, orbitMode, latestEarthHelio.current));
        // earthHelioPositionAU é lida via ref — intencionalmente fora das dependências.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedObject?.approach.id, selectionFocusNonce, orbitMode]);

    return framing;
}

function ViewButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-full px-3 py-1 text-[12px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

/**
 * Seção de corpos de referência do painel lateral.
 *
 * Terra e Lua são sempre visíveis. O botão "···" expande uma linha adicional
 * com planetas de ambientação (por enquanto só Mercúrio). Cada planeta aparece
 * como um pontinho colorido + nome, sem ícone emoji para manter a discrição.
 * Ao adicionar Vênus, Marte etc., basta acrescentar na lista AMBIENT_PLANETS.
 */
function ReferenceSection({
    en,
    mercuryFocused,
    onFocusEarth,
    onFocusMoon,
    onFocusMercury,
}: {
    en: boolean;
    mercuryFocused: boolean;
    onFocusEarth: () => void;
    onFocusMoon: () => void;
    onFocusMercury: () => void;
}) {
    const [planetsOpen, setPlanetsOpen] = useState(false);

    const btnCls = 'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-white/80 transition outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan';

    return (
        <div className="border-b border-white/10 px-2 py-2">
            <div className="px-1 pb-1 text-[11px] uppercase tracking-wide text-white/45">
                {en ? 'Reference' : 'Referência'}
            </div>

            {/* Linha principal: Terra + Lua + botão ··· */}
            <div className="flex items-center gap-1">
                <button type="button" onClick={onFocusEarth} className={btnCls}>
                    <span>🌍</span><span className="font-medium">{en ? 'Earth' : 'Terra'}</span>
                </button>
                <button type="button" onClick={onFocusMoon} className={btnCls}>
                    <span>🌙</span><span className="font-medium">{en ? 'Moon' : 'Lua'}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setPlanetsOpen((v) => !v)}
                    title={en ? 'More bodies' : 'Mais corpos'}
                    className={[
                        'ml-auto rounded-lg px-2 py-1.5 text-[13px] tracking-widest transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                        planetsOpen ? 'text-white' : 'text-white/40 hover:text-white/70',
                    ].join(' ')}
                >
                    ···
                </button>
            </div>

            {/* Painel expansível: planetas de ambientação */}
            {planetsOpen ? (
                <div className="mt-1 border-t border-white/8 pt-1">
                    <button
                        type="button"
                        onClick={onFocusMercury}
                        className={[
                            btnCls,
                            'w-full',
                            mercuryFocused ? 'text-white' : '',
                        ].join(' ')}
                    >
                        {/* Pontinho prateado — identidade visual de Mercúrio sem emoji */}
                        <span className="inline-block size-2 rounded-full bg-[#b0b8c8] ring-1 ring-white/20" />
                        <span className="font-medium">{en ? 'Mercury' : 'Mercúrio'}</span>
                    </button>
                </div>
            ) : null}
        </div>
    );
}
