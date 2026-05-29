import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { ClosestNowObject, LunarReference, SunDirection, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { computeSceneEphemeris, KM_PER_AU, type SceneEphemeris } from '@/lib/sceneEphemeris';
import { sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { MapManualModal, type SceneMode } from './Controls/MapManualModal';
import { FocusCard } from './Panels/FocusCard';
import { RadarScene } from './Scene/RadarScene';
import {
    CAMERA_FOV_DEG,
    CAMERA_VIEWS,
    MAX_CAMERA_DISTANCE,
    computeFocusFraming,
    type CameraViewKey,
    type FocusFraming,
} from './Scene/CameraRig';
import { nextCameraNonce, type CameraIntent } from './Scene/cameraIntent';

/**
 * Isolated 3D prototype of the orbital radar. Lives alongside the SVG radar — it does NOT
 * replace it. Toggled on via a button in the page header.
 *
 * Why this exists: the SVG radar projects the ecliptic plane orthographically, which collapses
 * the Z axis. Asteroids with high orbital inclination (e.g. 2018 CX at i ≈ 25°) end up looking
 * misplaced — their 3D range is 60 DL, but their (x, y) projection sits between 1 and 5 DL.
 * This 3D scene keeps the real X/Y/Z so depth reads honestly.
 *
 * Out of scope for the prototype: solar-context mode, all modes besides closest-5-now, raycast
 * interaction on the rings, mobile gesture polish.
 */

type Props = {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    onSelect: (approach: UnifiedApproach) => void;
    onClearSelection?: () => void;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    /**
     * Sun direction (geocentric ecliptic) for the current instant, computed server-side via
     * SunDirectionCalculator and passed through Inertia. We use it as the SYNCHRONOUS fallback for
     * the directional light, so the scene never starts with an arbitrary cardinal vector while
     * astronomy-engine is still resolving its lazy import.
     */
    initialSunDirection: SunDirection;
};

/**
 * Two semantically distinct viewing modes the user can switch between:
 *   - 'radar': geocentric, log-compressed scale.
 *   - 'orbit': heliocentric, linear AU scale centred on the Sun.
 * SceneMode is defined in ./MapManualModal so the modal and the scene agree on the same union.
 */
// --------------- Component ---------------

export function DailyOrbitalRadar3DPrototype({
    closestNowObjects,
    selectedId,
    onSelect,
    onClearSelection,
    onOpenFocus,
    lunarReference,
    locale,
    initialSunDirection,
}: Props) {
    const en = locale === 'en';

    // Honest synchronous fallback for the Sun direction: the server already knows the current Sun
    // longitude (Meeus, SunDirectionCalculator) and ships it through Inertia. Until astronomy-engine
    // resolves its lazy import, the scene lights from this vector — never from an arbitrary one.
    const fallbackSunDirection = useMemo<[number, number, number]>(
        () => sunDirectionFromIncoming(initialSunDirection),
        [initialSunDirection],
    );

    // Sun direction + Moon position for this instant, computed locally with astronomy-engine.
    // Null until the (lazy-loaded) library resolves; the scene uses the server-seeded direction
    // above until then. Recomputed every few minutes so day/night and the Moon drift realistically.
    const ephemeris = useSceneEphemeris();

    // One explicit camera state-machine input. The discriminant tells the scene whether the next
    // tween should honor a preset view, a selected asteroid framing, or an Earth/Moon body focus.
    const [cameraIntent, setCameraIntent] = useState<CameraIntent>({ kind: 'preset', view: 'perspective', nonce: 0 });
    const view = cameraIntent.view;

    const focusedObject = useMemo(
        () => closestNowObjects.find((o) => o.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );

    // Two viewing modes for a selected asteroid:
    //   - close-up (orbitMode = false): the camera flies IN to the rock, showing its focus card.
    //   - orbit (orbitMode = true): the camera pulls BACK to frame its full orbit around the Sun.
    // Selecting any object always starts in close-up; the "Ver órbita" button switches to orbit.
    const [orbitMode, setOrbitMode] = useState(false);
    const [sceneTransitioning, setSceneTransitioning] = useState(false);

    const triggerTransition = (fn: () => void) => {
        setSceneTransitioning(true);
        fn();
        setTimeout(() => setSceneTransitioning(false), 420);
    };

    // When an object is selected, compute a framing that keeps Earth + object + (a slice of) the
    // trajectory all in view. Null when nothing is selected → fall back to the preset view.
    // Camera focus is tied to explicit selection intent. The Sun/Moon ephemeris keeps updating the
    // scene, but those refreshes must not restart camera tweens after the user has placed the view.
    const focusTarget = useSelectionFocusFraming(
        focusedObject,
        cameraIntent.kind === 'object' ? cameraIntent.nonce : 0,
        orbitMode,
        ephemeris?.earthHelioPositionAU ?? null,
    );

    const pickView = (key: CameraViewKey) => {
        clearSelection();
        setCameraIntent((intent) => ({ kind: 'preset', view: key, nonce: nextCameraNonce(intent) }));
    };

    const selectObject = (approach: UnifiedApproach) => {
        const newObject = closestNowObjects.find((o) => o.approach.id === approach.id);
        const newHasOrbit = Boolean(newObject?.trajectory?.orbitalElements);
        // Stay in orbit mode if the new object also has orbital data; otherwise reset to close-up.
        if (!orbitMode || !newHasOrbit) {
            setOrbitMode(false);
        }
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
        onSelect(approach);
    };

    // Toggle to the orbit framing (or back to the close-up) for the currently focused object.
    const showOrbit = () => triggerTransition(() => {
        setOrbitMode(true);
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
    });
    const showCloseUp = () => triggerTransition(() => {
        setOrbitMode(false);
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
    });

    // Lets the side list focus Earth/Moon (the camera work lives in <RadarScene>). We bump the
    // intent nonce so the same body can be re-focused, and clear any object selection first.
    const focusBody = (body: 'earth' | 'moon') => {
        if (onClearSelection) onClearSelection();
        setCameraIntent((intent) => ({ kind: 'body', view: intent.view, body, nonce: nextCameraNonce(intent) }));
    };

    const clearSelection = () => {
        if (onClearSelection) {
            onClearSelection();
        } else if (focusedObject) {
            selectObject(focusedObject.approach);
        }
    };

    const resetView = () => {
        clearSelection();
        pickView('perspective');
    };

    // The active visualisation mode. The orbit-solar (heliocentric) layer takes over the whole
    // scene only when (a) the user asked for it AND (b) the selected object has osculating elements
    // with a usable perihelion epoch. Anything else stays in the geocentric radar layer.
    const activeMode: SceneMode = useMemo(() => {
        if (!orbitMode || !focusedObject) return 'radar';
        const els = focusedObject.trajectory?.orbitalElements;
        if (!els || !Number.isFinite(els.tpJd) || els.tpJd === 0) return 'radar';
        return 'orbit';
    }, [orbitMode, focusedObject]);

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
                            {en
                                ? `Showing the ${closestNowObjects.length} closest objects to Earth right now.`
                                : `Mostrando os ${closestNowObjects.length} objetos mais próximos da Terra agora.`}
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
                            closestNowObjects={closestNowObjects}
                            selectedId={selectedId}
                            orbitMode={orbitMode}
                            onSelect={selectObject}
                            cameraIntent={cameraIntent}
                            focusTarget={focusTarget}
                            ephemeris={ephemeris}
                            fallbackSunDirection={fallbackSunDirection}
                            locale={locale}
                            onClearSelection={clearSelection}
                        />
                    </Suspense>
                </Canvas>

                {/* Top-bar: object count + camera view shortcuts. The scene stays fully explorable;
                    these only nudge the camera to a starting angle. */}
                <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-3">
                    <div className="pointer-events-auto w-[min(18rem,48%)] overflow-hidden rounded-xl border border-white/12 bg-space-950/88 backdrop-blur-xl">
                        {/* Reference bodies — Earth & Moon — clickable to fly the camera to them. */}
                        <div className="border-b border-white/10 px-2 py-2">
                            <div className="px-1 pb-1 text-[11px] uppercase tracking-wide text-white/45">
                                {en ? 'Reference' : 'Referência'}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    onClick={() => focusBody('earth')}
                                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-white/80 transition outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                >
                                    <span>🌍</span><span className="font-medium">{en ? 'Earth' : 'Terra'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => focusBody('moon')}
                                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-white/80 transition outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                >
                                    <span>🌙</span><span className="font-medium">{en ? 'Moon' : 'Lua'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Closest objects — clicking flies the camera to that asteroid. */}
                        <div className="px-2 py-2">
                            <div className="px-1 pb-1.5 text-[11px] uppercase tracking-wide text-white/45">
                                {en
                                    ? `${closestNowObjects.length} closest objects now`
                                    : `${closestNowObjects.length} objetos mais próximos agora`}
                            </div>
                            <ul className="space-y-0.5">
                                {closestNowObjects.map((o, index) => {
                                    const pal = OBJECT_PALETTE[index % OBJECT_PALETTE.length];
                                    const active = o.approach.id === selectedId;
                                    const hasScenePosition = Boolean(o.trajectory?.currentPoint);
                                    const hazard = o.approach.hazardFlag;
                                    return (
                                        <li key={o.approach.id}>
                                            <button
                                                type="button"
                                                onClick={() => selectObject(o.approach)}
                                                title={
                                                    hasScenePosition
                                                        ? undefined
                                                        : en
                                                          ? 'No live position from Horizons right now — not shown on the radar.'
                                                          : 'Sem posição do Horizons no momento — não exibido no radar.'
                                                }
                                                className={[
                                                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                                                    active ? 'bg-signal-cyan/15 text-white ring-1 ring-signal-cyan/40' : 'text-white/75 hover:bg-white/8 hover:text-white',
                                                    hasScenePosition ? '' : 'opacity-50',
                                                ].join(' ')}
                                            >
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10" style={{ backgroundColor: pal.future }} />
                                                <span className="min-w-0 flex-1 truncate font-medium">
                                                    {o.approach.displayName ?? o.approach.name}
                                                </span>
                                                {hazard ? (
                                                    <span className="shrink-0 text-[12px]" title={en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL'} aria-hidden>⚠️</span>
                                                ) : null}
                                                {!hasScenePosition ? (
                                                    <span className="shrink-0 text-[11px] text-amber-200/70" aria-hidden>
                                                        {en ? 'no pos.' : 'sem pos.'}
                                                    </span>
                                                ) : null}
                                                <span className="shrink-0 tabular-nums text-white/55">
                                                    {compactKm(o.currentDistanceKm)}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
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

                {/* Inline focus card — slides in from the left when an object is selected. Hands the
                    user the same kind of metrics the SVG radar shows, without leaving the 3D experience. */}
                {focusedObject ? (
                    <FocusCard
                        object={focusedObject}
                        onOpenFocus={onOpenFocus}
                        onClose={() => selectObject(focusedObject.approach)}
                        orbitMode={orbitMode}
                        hasOrbit={Boolean(focusedObject.trajectory?.orbitalElements)}
                        canShowOrbitPosition={(() => {
                            const tp = focusedObject.trajectory?.orbitalElements?.tpJd;
                            return Number.isFinite(tp) && tp !== 0;
                        })()}
                        onShowOrbit={showOrbit}
                        onShowCloseUp={showCloseUp}
                        locale={locale}
                    />
                ) : null}

                {sceneTransitioning ? (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#03060d]/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-space-950/90 px-4 py-2.5 text-[13px] text-white/70 shadow-glow">
                            <span className="size-2 animate-pulse rounded-full bg-signal-cyan" aria-hidden />
                            {en ? 'Loading…' : 'Carregando…'}
                        </div>
                    </div>
                ) : null}

                <SceneLegend lunarReference={lunarReference} locale={locale} mode={activeMode} />
            </div>
        </section>
    );
}

/**
 * Bottom-right legend. A compact, human-friendly card: the two key scale references are always
 * visible, and a one-tap "How to read this map" panel unfolds the richer (otherwise intimidating)
 * explanation of the dual log/linear scale and the interaction hints — kept out of the way until
 * the curious user asks for it.
 */
function SceneLegend({ lunarReference, locale, mode }: { lunarReference: LunarReference; locale: 'pt-BR' | 'en'; mode: SceneMode }) {
    const en = locale === 'en';
    const [manualOpen, setManualOpen] = useState(false);
    const nf = new Intl.NumberFormat(locale);

    return (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-10 w-[min(22rem,46%)] overflow-hidden rounded-xl border border-white/18 bg-space-950/92 shadow-glow backdrop-blur-xl">
            {/* Always-on header: the two distance references, the info users glance at most. */}
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

            {/* Expand/collapse toggle for the deeper explanation. */}
            <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="mt-2 flex w-full items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-left text-[13px] font-semibold text-signal-cyan transition outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-signal-cyan"
            >
                <span className="inline-flex items-center gap-2">
                    <BookOpen className="size-4" aria-hidden />
                    {en ? 'Manual' : 'Manual'}
                </span>
                <ChevronDown className="-rotate-90 size-4" aria-hidden />
            </button>

            {manualOpen ? (
                createPortal(
                    <MapManualModal
                        mode={mode}
                        locale={locale}
                        lunarDistanceKm={lunarReference.distanceKm}
                        onClose={() => setManualOpen(false)}
                    />,
                    document.body,
                )
            ) : null}
        </div>
    );
}



/**
 * Computes Sun direction + Moon position with astronomy-engine, refreshing on a short cadence so
 * the Moon's position, the Earth-Sun line and the day/night terminator track real time as it
 * actually passes. Returns null until the lazy library resolves.
 *
 * Cadence note: the bodies move slowly in reality (the Moon ~0.5°/h, the subsolar point 15°/h), so
 * a 10s tick already gives smooth, honest real-time drift — no need to recompute per frame, which
 * would put the heavy library on the render loop for no visible gain. This is "real time fiel":
 * positions always equal the current instant, just sampled every 10s.
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
        return () => { active = false; window.clearInterval(id); };
    }, []);

    return ephemeris;
}

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
        // Camera framing should react to explicit selection intent only (selection + orbit toggle).
        // Ephemeris refreshes keep Sun/orbit geometry current, but must not restart a camera tween.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedObject?.approach.id, selectionFocusNonce, orbitMode]);

    return framing;
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
