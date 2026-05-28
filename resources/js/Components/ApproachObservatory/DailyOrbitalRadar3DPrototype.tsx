import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import { createContext, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { BookOpen, Calculator, ChevronDown, Compass, Eye, GripHorizontal, Maximize2, MousePointer2, Orbit, Radar, X } from 'lucide-react';
import type { AsteroidTrajectory, ClosestNowObject, LunarReference, OrbitalElements, SunDirection, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { buildHeliocentricOrbit, compressDistanceDl, compressSceneVector, computeSceneEphemeris, helioAUToSunCenteredScene, KM_PER_AU, ORBIT_AU_SCALE, SUN_DISPLAY_DL, type SceneEphemeris } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { normalize3, sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import { formatDistanceAU, formatTimestamp } from '@/lib/observatory/format';
import { orientEarth, orientMoonTidal } from '@/lib/observatory/earthOrientation';
import {
    clipPolylineByLength,
    closestApproachNearPosition,
    collectTimeTicks,
    currentPositionInScene,
    findClosestApproachPoint,
    toVec3,
} from '@/lib/observatory/trajectorySampling';
import { sunEclipticDisplayPosition } from '@/lib/observatory/sunGeometry';
import { buildMoonBump, mulberry32 } from '@/lib/observatory/moonTextures';

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

// --------------- Scale ---------------
// The scene uses "scene units" where 1 unit = 1 DL. We don't apply the SVG's log compression
// here — keeping the scale honest is the whole point of the prototype. Earth/Moon radii are
// exaggerated (we'd never see them otherwise), but distances between bodies are true to DL.
//
// Bodies are deliberately scaled UP for readability — distances in DL stay real. The on-screen
// note ("Earth and Moon scaled up") makes this contract explicit to the user.
const EARTH_RADIUS_DL = 0.11;
const MOON_RADIUS_DL = 0.035;

// Invisible hitboxes — generous click/hover targets that never change the rendered geometry.
const EARTH_HITBOX_DL = EARTH_RADIUS_DL * 1.8;
const MOON_HITBOX_DL = MOON_RADIUS_DL * 3;

const KM_PER_LD = 384_400;
const SUN_RADIUS_KM = 695_700;
const SUN_RADIUS_SCENE = SUN_RADIUS_KM / KM_PER_LD;

// Primary DL rings are disabled here; the local 1 DL cue belongs to the Moon orbit itself.
const RING_STOPS_DL: number[] = [];
const GUIDE_RING_STOPS_DL = [50];
const CAMERA_FOV_DEG = 42;
// The heliocentric orbit is drawn on a linear AU scale (1 AU = ORBIT_AU_SCALE units). A wide NEO
// aphelion of ~4 AU reaches ~4·ORBIT_AU_SCALE units, so allow the camera to pull back well past that
// to frame the whole ellipse plus headroom.
const MAX_CAMERA_DISTANCE = ORBIT_AU_SCALE * 12;

// Label-layout thresholds, all in screen pixels — kept here so the magic numbers buried in
// useCompactLabelMode / useLabelHiddenByFocusRef speak for themselves at the call sites.

/** Below this projected Moon-orbit radius, labels switch to their compact form. */
const COMPACT_LABEL_THRESHOLD_PX = 92;

/** Minimum exclusion radius around a focused body inside which 3D labels are hidden. */
const LABEL_HIDE_MIN_RADIUS_PX = 56;

/** Extra padding added to the body's own projected radius before hiding nearby labels. */
const LABEL_HIDE_BODY_PADDING_PX = 72;


// Camera presets. The scene is fully explorable via OrbitControls at all times; these are just
// soft "starting angles" the user can jump to. Each one tweens in; the user can immediately
// keep orbiting/zooming from there.
//
// Distances are in scene units. Under the radial log compression the Moon sits at ~1, the closest-5
// asteroids span ~2–10, and the Sun sits at ~33. The default views frame the Earth–Moon–asteroid
// neighbourhood; selecting an asteroid pulls the camera out to include the Sun and its orbit.
const CAMERA_VIEWS = {
    perspective: new THREE.Vector3(0, 7.5, 14),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;
type CameraViewKey = keyof typeof CAMERA_VIEWS;

/**
 * Two semantically distinct viewing modes the user can switch between:
 *   - 'radar': geocentric, log-compressed scale. Earth at origin, Moon and asteroids placed by
 *     their real geocentric Horizons vectors, run through the shared radial log compression.
 *     Answers "where is this object relative to Earth, and where is it heading short-term?".
 *   - 'orbit': heliocentric, linear AU scale. Sun at origin, Earth at its real 1 AU position,
 *     asteroid propagated by Kepler so it sits on the drawn ellipse by construction.
 *     Answers "where is this object on its orbit around the Sun?".
 * The two never share a frame: mixing the two rulers was the audit's central bug.
 */
type SceneMode = 'radar' | 'orbit';
type LabelOccluder = { center: THREE.Vector3; radius: number } | null;

const LabelOccluderContext = createContext<LabelOccluder>(null);

// Palette assigned to objects in order. Keep selected/non-selected legible against the dark bg.
// The colors are chosen to read against the green-tinted "future" trajectories: warm hues bias
// each object so collisions in 3D space stay parseable.
// `past` is a solid hex (no rgba): THREE.Color ignores the alpha channel of rgba() strings and
// would warn + render it white. The faintness of the past trail comes from material opacity,
// not the color string.
const OBJECT_PALETTE = [
    { future: '#76e4b5', current: '#a6f0d4', past: '#9fb4ad' },  // mint
    { future: '#7cc4f5', current: '#a8d8fa', past: '#9fb0bf' },  // sky
    { future: '#f5b676', current: '#fad19c', past: '#bfae9c' },  // amber
    { future: '#e88ab8', current: '#f1afcc', past: '#bfa6b2' },  // rose
    { future: '#c7a8f0', current: '#dac4f5', past: '#b3a6bf' },  // lavender
];

type AsteroidModelAsset = {
    key: 'bennu' | 'ceres' | 'eros' | 'itokawa' | 'vesta';
    url: string;
    rotation: [number, number, number];
    aliases: string[];
    numbers: string[];
};

type GenericAsteroidVariant = 'tiny' | 'small' | 'medium' | 'large' | 'unknown';

type AsteroidRenderableModel =
    | { kind: 'real'; asset: AsteroidModelAsset }
    | { kind: 'generic'; variant: GenericAsteroidVariant };

const REAL_ASTEROID_MODELS: AsteroidModelAsset[] = [
    { key: 'bennu', url: '/models/asteroids/bennu.glb', rotation: [-0.12, 0.38, 0.04], aliases: ['bennu', 'rq36'], numbers: ['101955'] },
    { key: 'ceres', url: '/models/asteroids/ceres.glb', rotation: [0.08, -0.28, 0.02], aliases: ['ceres'], numbers: ['1'] },
    { key: 'itokawa', url: '/models/asteroids/itokawa.glb', rotation: [-0.2, 0.45, 0.08], aliases: ['itokawa'], numbers: ['25143'] },
    { key: 'eros', url: '/models/asteroids/eros.glb', rotation: [0.15, -0.32, -0.1], aliases: ['eros'], numbers: ['433'] },
    { key: 'vesta', url: '/models/asteroids/vesta.glb', rotation: [-0.06, 0.3, -0.04], aliases: ['vesta'], numbers: ['4'] },
];

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

    // The camera view the user last picked from the toolbar. Selecting an object overrides this
    // with a computed framing (see focusTarget); clearing selection returns to this view.
    const [view, setView] = useState<CameraViewKey>('perspective');
    // Bumped whenever the user clicks the same preset again, to force a re-tween ("reset").
    const [viewNonce, setViewNonce] = useState(0);

    const focusedObject = useMemo(
        () => closestNowObjects.find((o) => o.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );

    // Two viewing modes for a selected asteroid:
    //   - close-up (orbitMode = false): the camera flies IN to the rock, showing its focus card.
    //   - orbit (orbitMode = true): the camera pulls BACK to frame its full orbit around the Sun.
    // Selecting any object always starts in close-up; the "Ver órbita" button switches to orbit.
    const [orbitMode, setOrbitMode] = useState(false);

    // When an object is selected, compute a framing that keeps Earth + object + (a slice of) the
    // trajectory all in view. Null when nothing is selected → fall back to the preset view.
    // Camera focus is tied to explicit selection intent. The Sun/Moon ephemeris keeps updating the
    // scene, but those refreshes must not restart camera tweens after the user has placed the view.
    const [selectionFocusNonce, setSelectionFocusNonce] = useState(0);
    const focusTarget = useSelectionFocusFraming(
        focusedObject,
        selectionFocusNonce,
        orbitMode,
        ephemeris?.earthHelioPositionAU ?? null,
    );

    const pickView = (key: CameraViewKey) => {
        clearSelection();
        setBodyFocusRequest(null);
        setView(key);
        setViewNonce((n) => n + 1);
    };

    const selectObject = (approach: UnifiedApproach) => {
        setOrbitMode(false); // every new selection starts as a close-up on the asteroid
        setSelectionFocusNonce((n) => n + 1);
        onSelect(approach);
    };

    // Toggle to the orbit framing (or back to the close-up) for the currently focused object.
    const showOrbit = () => {
        setOrbitMode(true);
        setSelectionFocusNonce((n) => n + 1);
    };
    const showCloseUp = () => {
        setOrbitMode(false);
        setSelectionFocusNonce((n) => n + 1);
    };

    // Lets the side list focus Earth/Moon (the camera work lives in <Scene>). We bump a nonce so the
    // same body can be re-focused, and clear any object selection first so the two don't fight.
    const [bodyFocusRequest, setBodyFocusRequest] = useState<{ body: 'earth' | 'moon'; nonce: number } | null>(null);
    const focusBody = (body: 'earth' | 'moon') => {
        if (onClearSelection) onClearSelection();
        setBodyFocusRequest({ body, nonce: Date.now() });
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
        <section className="space-y-3">
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                <strong className="font-semibold">{en ? 'Prototype' : 'Protótipo'}:</strong>{' '}
                {activeMode === 'orbit'
                    ? (en
                        ? 'Orbit mode: linear AU scale centred on the Sun. The asteroid is propagated by Kepler so it sits exactly on the drawn ellipse.'
                        : 'Modo órbita: escala linear em UA centrada no Sol. O asteroide é propagado por Kepler — fica exatamente sobre a elipse desenhada.')
                    : (en
                        ? 'Radar mode: geocentric X/Y/Z from JPL Horizons, centred on Earth. Radial distance is log-compressed; direction (and orbital inclination) stay honest — inclined asteroids visibly sit above or below the Moon plane.'
                        : 'Modo radar: X/Y/Z geocêntricos do JPL Horizons, centrado na Terra. A distância radial é comprimida em log; a direção (e a inclinação orbital) permanecem honestas — asteroides com inclinação aparecem visivelmente acima ou abaixo do plano da Lua.')}
            </div>

            <div className="relative h-[72vh] min-h-[640px] overflow-hidden rounded-lg border border-white/10 bg-[#03060d] sm:h-[78vh] sm:min-h-[760px]">
                <Canvas
                    camera={{ position: CAMERA_VIEWS.perspective.toArray(), fov: CAMERA_FOV_DEG, near: 0.01, far: MAX_CAMERA_DISTANCE * 3 }}
                    dpr={[1, 1.6]}
                    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                >
                    <Suspense fallback={null}>
                        <Scene
                            closestNowObjects={closestNowObjects}
                            selectedId={selectedId}
                            orbitMode={orbitMode}
                            onSelect={selectObject}
                            view={view}
                            viewNonce={viewNonce}
                            focusTarget={focusTarget}
                            bodyFocusRequest={bodyFocusRequest}
                            ephemeris={ephemeris}
                            fallbackSunDirection={fallbackSunDirection}
                            locale={locale}
                            onResetView={resetView}
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

                <SceneLegend lunarReference={lunarReference} locale={locale} mode={activeMode} />

                <ModeChips mode={activeMode} locale={locale} />
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

type ManualTab = 'guide' | 'technical';

const MANUAL_MIN_WIDTH = 360;
const MANUAL_MIN_HEIGHT = 320;
const MANUAL_MARGIN = 12;

function clampManualBox(
    x: number,
    y: number,
    width: number,
    height: number,
): { x: number; y: number; width: number; height: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(MANUAL_MIN_WIDTH, Math.min(width, vw - MANUAL_MARGIN * 2));
    const h = Math.max(MANUAL_MIN_HEIGHT, Math.min(height, vh - MANUAL_MARGIN * 2));
    const cx = Math.max(MANUAL_MARGIN, Math.min(x, vw - w - MANUAL_MARGIN));
    const cy = Math.max(MANUAL_MARGIN, Math.min(y, vh - h - MANUAL_MARGIN));
    return { x: cx, y: cy, width: w, height: h };
}

function MapManualModal({
    mode,
    locale,
    lunarDistanceKm,
    onClose,
}: {
    mode: SceneMode;
    locale: 'pt-BR' | 'en';
    lunarDistanceKm: number;
    onClose: () => void;
}) {
    const en = locale === 'en';
    const [tab, setTab] = useState<ManualTab>('guide');
    const title = mode === 'radar'
        ? (en ? 'Radar mode · Earth-centred' : 'Modo radar · centrado na Terra')
        : (en ? 'Orbit mode · Sun-centred' : 'Modo órbita · centrado no Sol');

    // Position + size are tracked in viewport pixels so the user can drag the panel anywhere and
    // resize it from the bottom-right corner. The first render computes a centred default sized to
    // ~min(1024, viewport-margins) × min(720, 92vh) — same footprint the previous flex-centred modal
    // used, just expressed in absolute units so it can move and resize.
    const [box, setBox] = useState(() => {
        const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
        const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
        const width = Math.min(1024, vw - MANUAL_MARGIN * 2);
        const height = Math.min(Math.round(vh * 0.92), vh - MANUAL_MARGIN * 2);
        return clampManualBox((vw - width) / 2, (vh - height) / 2, width, height);
    });

    // Drag state — header acts as the grab handle. We capture pointer events on window so the drag
    // continues even if the cursor leaves the panel bounds. Same idea for resize.
    const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
    const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    // Re-clamp the panel if the viewport shrinks (eg. window resize / DevTools opens), so it never
    // ends up parked off-screen and unreachable.
    useEffect(() => {
        const onResize = () => {
            setBox((b) => clampManualBox(b.x, b.y, b.width, b.height));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!dragging && !resizing) return;
        const onMove = (event: PointerEvent) => {
            if (dragging && dragRef.current) {
                const nextX = event.clientX - dragRef.current.offsetX;
                const nextY = event.clientY - dragRef.current.offsetY;
                setBox((b) => clampManualBox(nextX, nextY, b.width, b.height));
            } else if (resizing && resizeRef.current) {
                const dx = event.clientX - resizeRef.current.startX;
                const dy = event.clientY - resizeRef.current.startY;
                const nextW = resizeRef.current.startWidth + dx;
                const nextH = resizeRef.current.startHeight + dy;
                setBox((b) => clampManualBox(b.x, b.y, nextW, nextH));
            }
        };
        const onUp = () => {
            dragRef.current = null;
            resizeRef.current = null;
            setDragging(false);
            setResizing(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [dragging, resizing]);

    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        // Ignore drags initiated on interactive header elements (close button, etc.).
        const target = event.target as HTMLElement;
        if (target.closest('button')) return;
        dragRef.current = { offsetX: event.clientX - box.x, offsetY: event.clientY - box.y };
        setDragging(true);
    };

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        resizeRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            startWidth: box.width,
            startHeight: box.height,
        };
        setResizing(true);
    };

    const resetBox = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const width = Math.min(1024, vw - MANUAL_MARGIN * 2);
        const height = Math.min(Math.round(vh * 0.92), vh - MANUAL_MARGIN * 2);
        setBox(clampManualBox((vw - width) / 2, (vh - height) / 2, width, height));
    };

    return (
        // The outer wrapper is non-blocking: clicks outside the panel pass straight through to the
        // 3D scene below, so the manual can stay open while exploring. The panel itself re-enables
        // pointer events.
        <div
            className="pointer-events-none fixed inset-0 z-50"
            role="dialog"
            aria-modal="false"
            aria-labelledby="map-manual-title"
        >
            <div
                className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border border-white/20 bg-[#07101d]/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] ring-1 ring-black/40 backdrop-blur"
                style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                    userSelect: dragging || resizing ? 'none' : undefined,
                }}
            >
                <header
                    onPointerDown={startDrag}
                    className={[
                        'flex shrink-0 flex-col gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    ].join(' ')}
                >
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-signal-cyan">
                                {mode === 'radar' ? <Radar className="size-3.5" aria-hidden /> : <Orbit className="size-3.5" aria-hidden />}
                                {en ? 'Map manual' : 'Manual do mapa'}
                            </div>
                            <span
                                className="inline-flex items-center gap-1 text-[11px] text-white/40"
                                title={en ? 'Drag to move' : 'Arraste para mover'}
                            >
                                <GripHorizontal className="size-3.5" aria-hidden />
                                {en ? 'drag' : 'arraste'}
                            </span>
                        </div>
                        <h2 id="map-manual-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/62">
                            {tab === 'guide'
                                ? (en
                                    ? 'A friendly guide for reading the scene without needing astronomy vocabulary first.'
                                    : 'Um guia amigável para ler a cena antes de entrar em palavras de astronomia.')
                                : (en
                                    ? 'The data pipeline, scale choices, and math used to draw this view.'
                                    : 'A lógica dos dados, das escalas e da matemática usada para desenhar esta vista.')}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                        <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={resetBox}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-[12px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            title={en ? 'Reset position and size' : 'Restaurar posição e tamanho'}
                        >
                            <Maximize2 className="size-3.5" aria-hidden />
                            {en ? 'Reset' : 'Restaurar'}
                        </button>
                        <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={onClose}
                            className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            aria-label={en ? 'Close manual' : 'Fechar manual'}
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="flex shrink-0 border-b border-white/10 bg-black/16 px-3 py-2 sm:px-5">
                    <ManualTabButton active={tab === 'guide'} onClick={() => setTab('guide')} icon="guide">
                        {en ? 'Basic guide' : 'Guia básico'}
                    </ManualTabButton>
                    <ManualTabButton active={tab === 'technical'} onClick={() => setTab('technical')} icon="technical">
                        {en ? 'Technical guide' : 'Guia técnico'}
                    </ManualTabButton>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                    {tab === 'guide'
                        ? <FriendlyManual mode={mode} locale={locale} lunarDistanceKm={lunarDistanceKm} />
                        : <TechnicalManual mode={mode} locale={locale} lunarDistanceKm={lunarDistanceKm} />}
                </div>

                <button
                    type="button"
                    onPointerDown={startResize}
                    aria-label={en ? 'Resize manual' : 'Redimensionar manual'}
                    title={en ? 'Drag to resize' : 'Arraste para redimensionar'}
                    className="absolute bottom-0 right-0 z-10 flex size-5 cursor-se-resize items-end justify-end p-0.5 text-white/40 outline-none hover:text-white/80 focus-visible:text-white"
                >
                    <svg viewBox="0 0 10 10" className="size-3" aria-hidden>
                        <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function ManualTabButton({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: ManualTab;
    children: React.ReactNode;
}) {
    const Icon = icon === 'guide' ? BookOpen : Calculator;
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-signal-cyan text-space-950' : 'text-white/62 hover:bg-white/[0.08] hover:text-white',
            ].join(' ')}
        >
            <Icon className="size-3.5" aria-hidden />
            {children}
        </button>
    );
}

function FriendlyManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale);
    const auKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(KM_PER_AU));

    if (mode === 'radar') {
        return (
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-start gap-3">
                            <Compass className="mt-0.5 size-5 shrink-0 text-signal-cyan" aria-hidden />
                            <div>
                                <h3 className="text-base font-semibold text-white">{en ? 'A map of the local space neighbourhood' : 'Um mapa da vizinhança espacial'}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-white/68">
                                    {en
                                        ? 'Earth is the protagonist. Each marker is an object passing nearby right now. The map answers three questions: where is it, how far is it, and which way is it moving.'
                                        : 'A Terra é a protagonista. Cada marcador é um objeto passando por perto agora. O mapa responde a três perguntas: onde está, a que distância está e para que lado está indo.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <ManualStep
                            number="1"
                            title={en ? 'Start at Earth' : 'Comece pela Terra'}
                            text={en ? 'Distances are read from the centre outward. The closer to Earth, the closer to the middle of the scene.' : 'As distâncias são lidas do centro para fora. Quanto mais perto da Terra, mais perto do meio da cena.'}
                        />
                        <ManualStep
                            number="2"
                            title={en ? 'Trust the numbers, not the spacing' : 'Confie nos números, não no espaçamento'}
                            text={en ? 'The visual spacing is compressed so distant objects stay visible. The real distance in km, LD and AU is always shown on the focus card.' : 'O espaçamento visual é comprimido para que objetos distantes fiquem visíveis. A distância real em km, DL e UA está sempre no painel de foco.'}
                        />
                        <ManualStep
                            number="3"
                            title={en ? 'The cone shows direction' : 'O cone mostra a direção'}
                            text={en ? 'Each object carries a small cone pointing where it is heading next. The grey dashes are the short path nearby.' : 'Cada objeto carrega um cone pequeno apontando para onde está indo. Os traços cinza são o caminho próximo.'}
                        />
                        <ManualStep
                            number="4"
                            title={en ? 'Rotate the view to read depth' : 'Gire a vista para ler a profundidade'}
                            text={en ? 'The 2D radar flattened the vertical axis. Use Top and Side to check if an object sits above or below the Moon’s plane.' : 'O radar 2D achatava o eixo vertical. Use Superior e Lateral para conferir se um objeto está acima ou abaixo do plano da Lua.'}
                        />
                    </div>

                    <section className="rounded-lg border border-amber-200/14 bg-amber-200/[0.045] p-4 text-sm leading-relaxed text-white/70">
                        {en
                            ? `LD is the lunar distance — the Earth-Moon gap, currently ${nf.format(lunarDistanceKm)} km. AU is the Earth-Sun distance, about ${auKm} km. Both are standard rulers in astronomy.`
                            : `DL é a distância lunar — a separação Terra-Lua, hoje em ${nf.format(lunarDistanceKm)} km. UA é a distância Terra-Sol, cerca de ${auKm} km. Ambas são réguas padrão na astronomia.`}
                    </section>
                </div>

                <div className="space-y-4">
                    <RadarGuideDiagram locale={locale} />
                    <section className="rounded-lg border border-white/10 bg-black/18 p-4">
                        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                            <MousePointer2 className="size-4 text-signal-cyan" aria-hidden />
                            {en ? 'Suggested reading order' : 'Ordem sugerida de leitura'}
                        </h3>
                        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-white/66">
                            <li>{en ? '1. Pick an object from the list on the left.' : '1. Escolha um objeto na lista à esquerda.'}</li>
                            <li>{en ? '2. Read the real distance in the focus card — that is the trustworthy number.' : '2. Leia a distância real no painel de foco — esse é o número confiável.'}</li>
                            <li>{en ? '3. Look at the cone and the grey trail to understand the motion.' : '3. Olhe para o cone e a trilha cinza para entender o movimento.'}</li>
                            <li>{en ? '4. Switch to orbit mode only when the question is about the full path around the Sun.' : '4. Mude para o modo órbita só quando a pergunta for sobre o caminho completo ao redor do Sol.'}</li>
                        </ol>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
                <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-start gap-3">
                        <Orbit className="mt-0.5 size-5 shrink-0 text-signal-cyan" aria-hidden />
                        <div>
                            <h3 className="text-base font-semibold text-white">{en ? 'The full journey around the Sun' : 'A jornada completa ao redor do Sol'}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-white/68">
                                {en
                                    ? 'The Sun anchors the scene. The bright ellipse is the road the asteroid travels around the Sun, and the marker shows where it sits on that road today.'
                                    : 'O Sol ancora a cena. A elipse brilhante é a estrada que o asteroide percorre ao redor do Sol, e o marcador mostra onde ele está nessa estrada hoje.'}
                            </p>
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2">
                    <ManualStep
                        number="1"
                        title={en ? 'The Sun is the reference' : 'O Sol é a referência'}
                        text={en ? 'This view is not about the close approach. It shows the long-term path that gravity from the Sun keeps the asteroid on.' : 'Esta vista não é sobre a aproximação. Ela mostra o caminho de longo prazo que a gravidade do Sol mantém o asteroide seguindo.'}
                    />
                    <ManualStep
                        number="2"
                        title={en ? 'Shape tells the story' : 'A forma conta a história'}
                        text={en ? 'A round ellipse means the distance to the Sun stays steady. A stretched ellipse means the asteroid varies a lot between near and far.' : 'Uma elipse redonda indica distância estável até o Sol. Uma elipse alongada indica grande variação entre perto e longe.'}
                    />
                    <ManualStep
                        number="3"
                        title={en ? 'Compare with Earth’s 1 AU ring' : 'Compare com o anel de 1 UA da Terra'}
                        text={en ? 'The blue ring is Earth’s orbit. If the ellipse crosses it, the asteroid passes through the neighbourhood Earth lives in.' : 'O anel azul é a órbita da Terra. Se a elipse cruza esse anel, o asteroide passa pela vizinhança da Terra.'}
                    />
                    <ManualStep
                        number="4"
                        title={en ? 'Check the tilt' : 'Confira a inclinação'}
                        text={en ? 'An orbit tilted relative to Earth’s plane may look close from above but pass well over or under it in reality.' : 'Uma órbita inclinada em relação ao plano da Terra pode parecer próxima vista de cima, mas passar bem acima ou abaixo na realidade.'}
                    />
                </div>

                <section className="rounded-lg border border-amber-200/14 bg-amber-200/[0.045] p-4 text-sm leading-relaxed text-white/70">
                    {en
                        ? 'Orbit mode is the wide-angle view. Switch back to radar mode for the question "how close to Earth is it right now?".'
                        : 'O modo órbita é a visão ampla. Volte para o modo radar para a pergunta "a que distância da Terra está agora?".'}
                </section>
            </div>

            <div className="space-y-4">
                <OrbitGuideDiagram locale={locale} />
                <section className="rounded-lg border border-white/10 bg-black/18 p-4">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        <Eye className="size-4 text-signal-cyan" aria-hidden />
                        {en ? 'What to look for' : 'O que observar'}
                    </h3>
                    <ol className="mt-3 space-y-2 text-sm leading-relaxed text-white/66">
                        <li>{en ? '1. Does the ellipse cross or skim Earth’s ring?' : '1. A elipse cruza ou tangencia o anel da Terra?'}</li>
                        <li>{en ? '2. Is the marker close to that crossing or far from it on this date?' : '2. O marcador está perto desse cruzamento ou longe dele nesta data?'}</li>
                        <li>{en ? '3. How stretched is the ellipse? Stretched orbits mean big swings in speed and distance.' : '3. Quão alongada é a elipse? Órbitas alongadas significam grandes variações de velocidade e distância.'}</li>
                        <li>{en ? '4. Is the orbit tilted? A tilted orbit may not actually meet Earth’s, even if it looks close in the top view.' : '4. A órbita é inclinada? Uma órbita inclinada pode não encontrar a da Terra de verdade, mesmo parecendo próxima de cima.'}</li>
                    </ol>
                </section>
            </div>
        </div>
    );
}

function ManualStep({ number, title, text }: { number: string; title: string; text: string }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/18 p-3">
            <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-signal-cyan text-[12px] font-bold text-space-950">{number}</span>
                <div>
                    <h4 className="text-sm font-semibold text-white">{title}</h4>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/62">{text}</p>
                </div>
            </div>
        </section>
    );
}

function TechnicalManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale);
    const auKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(KM_PER_AU);

    if (mode === 'radar') {
        return (
            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                    <RadarGuideDiagram locale={locale} technical />
                    <TechnicalBlock
                        title={en ? 'Design rationale' : 'Justificativa do design'}
                        lines={en
                            ? [
                                'The radar answers a local question: the geocentric position of each object at the current instant.',
                                'A linear ruler centred on Earth would place the Moon at 1 LD and the Sun near 389 LD, collapsing the near-Earth band into a few pixels.',
                                'The scene applies a logarithmic radial compression so the Earth-Moon-asteroid band stays readable, while the numeric distances reported to the UI remain the original measurements.',
                                'Direction and inclination are preserved exactly — only the radial spacing is rescaled.',
                            ]
                            : [
                                'O radar responde a uma pergunta local: a posição geocêntrica de cada objeto no instante atual.',
                                'Uma régua linear centrada na Terra colocaria a Lua a 1 DL e o Sol perto de 389 DL, comprimindo a faixa próxima à Terra em poucos pixels.',
                                'A cena aplica uma compressão radial logarítmica para manter a faixa Terra-Lua-asteroide legível, enquanto as distâncias numéricas exibidas na interface continuam sendo as medidas originais.',
                                'Direção e inclinação são preservadas exatamente — apenas o espaçamento radial é reescalonado.',
                            ]}
                    />
                </div>
                <div className="space-y-4">
                    <FormulaPanel
                        title={en ? 'Geocentric state and distance' : 'Estado geocêntrico e distância'}
                        formulas={[
                            'r = (x, y, z),   v = (vx, vy, vz)',
                            'd_km = ||r||',
                            `d_DL = d_km / ${nf.format(lunarDistanceKm)}`,
                            `${en ? 'd_AU' : 'd_UA'} = d_km / ${auKm}`,
                        ]}
                        note={en
                            ? 'Position and velocity vectors come from JPL Horizons in the geocentric J2000 frame. The three distance units (km, LD, AU) shown in the UI are derived from the same Euclidean norm.'
                            : 'Vetores de posição e velocidade vêm do JPL Horizons no referencial geocêntrico J2000. As três unidades de distância (km, DL, UA) exibidas na interface derivam da mesma norma euclidiana.'}
                    />
                    <FormulaPanel
                        title={en ? 'Radial log compression' : 'Compressão radial logarítmica'}
                        formulas={[
                            'R0 = 8 DL',
                            'K = 1 / ln(1 + 1/R0)',
                            'f(r) = K · ln(1 + r/R0)',
                            'r_scene = f(d_DL) · r / ||r||',
                        ]}
                        note={en
                            ? 'R0 is the transition distance below which the mapping is approximately linear. K is fixed so the Moon (1 LD) lands at exactly 1 scene unit. The function is monotonic, so relative ordering of distances is preserved.'
                            : 'R0 é a distância de transição abaixo da qual o mapeamento é aproximadamente linear. K é fixado de modo que a Lua (1 DL) caia exatamente em 1 unidade de cena. A função é monotônica, portanto a ordem relativa das distâncias é preservada.'}
                    />
                    <FormulaPanel
                        title={en ? 'Motion vector and trail' : 'Vetor de movimento e trilha'}
                        formulas={[
                            'u = v / ||v||',
                            en ? 'cone direction = u' : 'direção do cone = u',
                            en ? 'trail = nearby trajectory samples' : 'trilha = amostras próximas da trajetória',
                        ]}
                        note={en
                            ? 'The cone follows the unit velocity vector, so its orientation is physically meaningful. The grey dashed trail samples the geocentric trajectory near the current epoch — it is the same compression applied to nearby positions.'
                            : 'O cone segue o vetor velocidade unitário, portanto sua orientação tem significado físico. A trilha tracejada cinza amostra a trajetória geocêntrica próxima à época atual — é a mesma compressão aplicada a posições próximas.'}
                    />
                    <TechnicalBlock
                        title={en ? '3D models and visual scale' : 'Modelos 3D e escala visual'}
                        lines={en
                            ? [
                                'When a NASA shape model exists for a body (Bennu, Ceres, Eros, Itokawa, Vesta), the matching asset is loaded.',
                                'Bodies without a dedicated model are rendered as representative rocks chosen by estimated diameter.',
                                'Body radii are amplified for legibility because true sizes would be sub-pixel at scene scale. Distances remain the trustworthy measurement layer.',
                            ]
                            : [
                                'Quando existe um modelo de forma da NASA para um corpo (Bennu, Ceres, Eros, Itokawa, Vesta), o asset correspondente é carregado.',
                                'Corpos sem modelo dedicado são renderizados como rochas representativas escolhidas pelo diâmetro estimado.',
                                'Os raios visuais são amplificados para leitura porque os tamanhos reais seriam sub-pixel na escala da cena. As distâncias permanecem a camada confiável de medição.',
                            ]}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
                <OrbitGuideDiagram locale={locale} technical />
                <TechnicalBlock
                    title={en ? 'Design rationale' : 'Justificativa do design'}
                    lines={en
                        ? [
                            'The long-term motion of an asteroid is dominated by solar gravity, so the orbit view uses the Sun as the dynamical centre.',
                            'Keeping the radar (geocentric) and orbit (heliocentric) modes strictly separated prevents the two scales from being read off the same ruler.',
                            'Distances in this mode are drawn linearly in AU so the ellipse shape is faithful — no log compression is applied.',
                            'The asteroid position is obtained by propagating Kepler’s equation from the perihelion epoch, so the marker lies on the drawn ellipse by construction.',
                        ]
                        : [
                            'O movimento de longo prazo de um asteroide é dominado pela gravidade solar, portanto a vista orbital usa o Sol como centro dinâmico.',
                            'Manter os modos radar (geocêntrico) e órbita (heliocêntrico) estritamente separados evita que as duas escalas sejam lidas pela mesma régua.',
                            'As distâncias neste modo são desenhadas linearmente em UA, preservando fielmente a forma da elipse — nenhuma compressão logarítmica é aplicada.',
                            'A posição do asteroide é obtida propagando a equação de Kepler a partir da época do periélio, de modo que o marcador cai exatamente sobre a elipse desenhada.',
                        ]}
                />
            </div>
            <div className="space-y-4">
                <FormulaPanel
                    title={en ? 'Osculating elements (input)' : 'Elementos osculadores (entrada)'}
                    formulas={[
                        'q = perihelion distance',
                        'e = eccentricity',
                        'i = inclination',
                        'Ω = longitude of ascending node',
                        'ω = argument of perihelion',
                        'Tp = time of perihelion passage',
                    ]}
                    note={en
                        ? 'These six classical elements come from JPL Horizons and describe the osculating Keplerian orbit at the current solution epoch.'
                        : 'Esses seis elementos clássicos vêm do JPL Horizons e descrevem a órbita Kepleriana osculadora na época da solução atual.'}
                />
                <FormulaPanel
                    title={en ? 'Kepler propagation' : 'Propagação Kepleriana'}
                    formulas={[
                        'a = q / (1 - e)',
                        'k = 0.01720209895',
                        'GM_sol = k²',
                        'n = sqrt(GM_sol / a³)',
                        'M = n · (JD_now - Tp)',
                        'E - e · sin(E) = M',
                    ]}
                    note={en
                        ? 'k is the Gaussian gravitational constant; the resulting GM_sol expresses the standard heliocentric two-body problem. Kepler’s equation is solved for the eccentric anomaly E by Newton iteration.'
                        : 'k é a constante gravitacional Gaussiana; o GM_sol resultante expressa o problema padrão dos dois corpos heliocêntrico. A equação de Kepler é resolvida para a anomalia excêntrica E por iteração de Newton.'}
                />
                <FormulaPanel
                    title={en ? 'Position in the orbital plane' : 'Posição no plano orbital'}
                    formulas={[
                        'x = a · (cos E - e)',
                        'y = a · sqrt(1 - e²) · sin E',
                        'R = Rz(Ω) · Rx(i) · Rz(ω)',
                        'p_ecl = R · (x, y, 0)',
                    ]}
                    note={en
                        ? 'The point is first expressed in the orbital plane (Sun at the focus), then rotated into the J2000 ecliptic frame by the composite rotation R.'
                        : 'O ponto é expresso primeiro no plano orbital (Sol no foco), depois rotacionado para o referencial eclíptico J2000 pela rotação composta R.'}
                />
                <FormulaPanel
                    title={en ? 'Scene mapping' : 'Mapeamento para a cena'}
                    formulas={[
                        '1 AU = ORBIT_AU_SCALE units',
                        'scene(x, y, z) = (x, z, y) · ORBIT_AU_SCALE',
                        en ? 'Earth = real heliocentric position' : 'Terra = posição heliocêntrica real',
                    ]}
                    note={en
                        ? 'The axis swap aligns the J2000 ecliptic with the scene convention (ecliptic Z becomes scene Y). Earth is placed from the local ephemeris and lit by the real Sun direction; only its rendered radius is amplified.'
                        : 'A troca de eixos alinha o eclíptico J2000 com a convenção da cena (Z eclíptico vira Y da cena). A Terra é posicionada pela efeméride local e iluminada pela direção real do Sol; apenas seu raio renderizado é amplificado.'}
                />
            </div>
        </div>
    );
}

function TechnicalBlock({ title, lines }: { title: string; lines: string[] }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/64">
                {lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
        </section>
    );
}

function FormulaPanel({ title, formulas, note }: { title: string; formulas: string[]; note: string }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <div className="mt-3 space-y-1 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2 font-mono text-[12px] leading-relaxed text-cyan-100/88">
                {formulas.map((formula) => <div key={formula}>{formula}</div>)}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/62">{note}</p>
        </section>
    );
}

function RadarGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 520 360" className="h-auto w-full" role="img" aria-label={en ? 'Earth-centred radar diagram' : 'Diagrama do radar centrado na Terra'}>
                <defs>
                    <radialGradient id="earthGlow" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="55%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </radialGradient>
                    <marker id="arrowCyan" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                </defs>
                <rect width="520" height="360" fill="#050b15" />
                <circle cx="260" cy="180" r="58" fill="none" stroke="#94a3b8" strokeOpacity="0.18" strokeWidth="1" />
                <circle cx="260" cy="180" r="116" fill="none" stroke="#94a3b8" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="6 8" />
                <circle cx="260" cy="180" r="174" fill="none" stroke="#94a3b8" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 10" />
                <path d="M260 180 C300 124 365 108 424 82" fill="none" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="7 9" />
                <line x1="382" y1="110" x2="442" y2="78" stroke="#67e8f9" strokeWidth="4" markerEnd="url(#arrowCyan)" />
                <circle cx="260" cy="180" r="30" fill="url(#earthGlow)" />
                <circle cx="330" cy="146" r="8" fill="#d8b4fe" />
                <circle cx="382" cy="110" r="11" fill="#f8fafc" />
                <circle cx="178" cy="228" r="7" fill="#facc15" />
                <text x="260" y="224" textAnchor="middle" fill="#e0f2fe" fontSize="15" fontWeight="700">{en ? 'Earth' : 'Terra'}</text>
                <text x="385" y="139" textAnchor="middle" fill="#e2e8f0" fontSize="13">{en ? 'object now' : 'objeto agora'}</text>
                <text x="427" y="67" fill="#67e8f9" fontSize="13" fontWeight="700">{en ? 'movement' : 'movimento'}</text>
                <text x="82" y="42" fill="#cbd5e1" fontSize="14" fontWeight="700">{en ? 'Read from Earth outward' : 'Leia saindo da Terra'}</text>
                <text x="82" y="64" fill="#94a3b8" fontSize="12">{en ? 'distance numbers stay real' : 'os números de distância são reais'}</text>
                {technical ? (
                    <>
                        <line x1="260" y1="180" x2="382" y2="110" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.8" />
                        <text x="286" y="133" fill="#fef3c7" fontSize="12">r = (x,y,z)</text>
                        <text x="315" y="264" fill="#bae6fd" fontSize="12">r_cena = f(||r||) · r/||r||</text>
                    </>
                ) : null}
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/62">
                {en
                    ? 'The centre is Earth. Dots are nearby objects, the cone shows motion, and the grey dashes show the short path around us.'
                    : 'O centro é a Terra. Os pontos são objetos próximos, o cone mostra o movimento e os traços cinza mostram o caminho curto ao nosso redor.'}
            </figcaption>
        </figure>
    );
}

function OrbitGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 520 360" className="h-auto w-full" role="img" aria-label={en ? 'Sun-centred orbit diagram' : 'Diagrama orbital centrado no Sol'}>
                <defs>
                    <radialGradient id="sunGlowManual" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#fff7ad" />
                        <stop offset="45%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#7c2d12" />
                    </radialGradient>
                    <marker id="arrowCyanOrbit" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                </defs>
                <rect width="520" height="360" fill="#050b15" />
                <ellipse cx="260" cy="180" rx="94" ry="94" fill="none" stroke="#60a5fa" strokeOpacity="0.45" strokeWidth="2" />
                <ellipse cx="288" cy="180" rx="178" ry="82" fill="none" stroke="#d8b4fe" strokeOpacity="0.82" strokeWidth="3" transform="rotate(-18 288 180)" />
                <circle cx="260" cy="180" r="24" fill="url(#sunGlowManual)" />
                <circle cx="354" cy="180" r="9" fill="#7dd3fc" />
                <circle cx="420" cy="119" r="11" fill="#f8fafc" />
                <path d="M408 128 L445 96" stroke="#67e8f9" strokeWidth="4" markerEnd="url(#arrowCyanOrbit)" />
                <text x="260" y="220" textAnchor="middle" fill="#fed7aa" fontSize="15" fontWeight="700">{en ? 'Sun' : 'Sol'}</text>
                <text x="354" y="203" textAnchor="middle" fill="#bfdbfe" fontSize="12">{en ? 'Earth (1 AU)' : 'Terra (1 UA)'}</text>
                <text x="420" y="146" textAnchor="middle" fill="#e2e8f0" fontSize="13">{en ? 'object now' : 'objeto agora'}</text>
                <text x="72" y="44" fill="#cbd5e1" fontSize="14" fontWeight="700">{en ? 'Read the whole orbit' : 'Leia a órbita inteira'}</text>
                <text x="72" y="66" fill="#94a3b8" fontSize="12">{en ? 'compare with Earth’s 1 AU path' : 'compare com o caminho da Terra em 1 UA'}</text>
                {technical ? (
                    <>
                        <line x1="260" y1="180" x2="420" y2="119" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.75" />
                        <text x="310" y="140" fill="#fef3c7" fontSize="12">p_ecl</text>
                        <text x="90" y="304" fill="#bae6fd" fontSize="12">E - e·sin(E) = M</text>
                        <text x="90" y="326" fill="#bae6fd" fontSize="12">a = q/(1-e)</text>
                    </>
                ) : null}
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/62">
                {en
                    ? 'The Sun anchors the view. Earth’s ring gives you a familiar ruler; the asteroid ellipse shows the larger path.'
                    : 'O Sol ancora a vista. O anel da Terra dá uma régua familiar; a elipse do asteroide mostra o caminho maior.'}
            </figcaption>
        </figure>
    );
}

/**
 * Persistent chip cluster bottom-left: a quick, always-visible summary of the active scale, scene
 * centre and data provenance — so the user never has to guess which ruler they're reading.
 * Different content per mode so neither set of claims overstates what the scene actually delivers.
 */
function ModeChips({ mode, locale }: { mode: SceneMode; locale: 'pt-BR' | 'en' }) {
    const en = locale === 'en';
    const chips = mode === 'orbit'
        ? [
              en ? 'Heliocentric orbit · linear AU · Sun at focus' : 'Órbita heliocêntrica · UA linear · Sol no foco',
              en ? 'Kepler orbit · Horizons osculating elements' : 'Órbita Kepler · elementos osculadores Horizons',
              en ? 'Position propagated by Kepler’s equation' : 'Posição propagada pela equação de Kepler',
              en ? 'Earth axial tilt 23.44° (real)' : 'Inclinação axial da Terra 23,44° (real)',
              en ? 'Body sizes amplified for visibility' : 'Tamanhos ampliados para leitura',
          ]
        : [
              en ? 'Earth-relative trajectory · log radial scale' : 'Trajetória relativa à Terra · escala log radial',
              en ? 'Real geocentric positions · JPL Horizons' : 'Posições reais geocêntricas · JPL Horizons',
              en ? 'Direction honest · radial magnitude compressed' : 'Direção honesta · magnitude radial comprimida',
              en ? 'Day/night from the real Sun direction' : 'Dia/noite pela direção real do Sol',
              en ? 'Earth axial tilt 23.44° (real)' : 'Inclinação axial da Terra 23,44° (real)',
              en ? 'Body sizes amplified for visibility' : 'Tamanhos ampliados para leitura',
          ];

    return (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[min(28rem,46%)] flex-wrap gap-1.5">
            {chips.map((label) => (
                <span
                    key={label}
                    className="rounded-full border border-white/10 bg-space-950/82 px-2.5 py-0.5 text-[11px] font-medium text-white/70 backdrop-blur"
                >
                    {label}
                </span>
            ))}
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

// --------------- Scene label (DOM overlay; always faces the screen) ---------------

/**
 * A 3D-anchored text label rendered as an <Html> overlay. We deliberately avoid drei's <Text>
 * (troika-three-text) because it fetches a default font from a CDN on first paint — the project
 * forbids frontend fetches to third parties (see performance notes). <Html> uses plain DOM/CSS,
 * scales with distance via `distanceFactor`, and always faces the camera for free.
 */
function SceneLabel({
    position,
    children,
    distanceFactor,
    tier,
    highlighted = false,
    protectFromFocus = true,
    onClick,
    title,
}: {
    position: [number, number, number];
    children: React.ReactNode;
    distanceFactor?: number;
    tier: 'primary' | 'ring';
    highlighted?: boolean;
    protectFromFocus?: boolean;
    onClick?: () => void;
    title?: string;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, protectFromFocus ? focusOccluder : null);
    const cls =
        tier === 'primary'
            ? [
                  'select-none whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold backdrop-blur',
                  highlighted ? 'bg-space-950/90 text-white' : 'bg-space-950/75 text-white/90',
                  onClick ? 'pointer-events-auto cursor-pointer transition hover:bg-space-950 hover:text-white' : 'pointer-events-none',
              ].join(' ')
            : [
                  'select-none whitespace-nowrap rounded-full bg-space-950/60 px-1.5 py-0.5 text-[12px] font-medium text-white/75 backdrop-blur',
                  onClick ? 'pointer-events-auto cursor-pointer transition hover:bg-space-950/85 hover:text-white' : 'pointer-events-none',
              ].join(' ');

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus ? (
                <Html position={[0, 0, 0]} center distanceFactor={distanceFactor} zIndexRange={[7, 0]}>
                    <button
                        type="button"
                        className={cls}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClick?.();
                        }}
                        onPointerEnter={() => { if (onClick) document.body.style.cursor = 'pointer'; }}
                        onPointerLeave={() => { if (onClick) document.body.style.cursor = ''; }}
                        title={title}
                        aria-label={title}
                        disabled={!onClick}
                    >
                        {children}
                    </button>
                </Html>
            ) : null}
        </group>
    );
}

/**
 * A label anchored to a 3D point but with SCREEN-STABLE size — it does NOT shrink when the object
 * is far away (no `distanceFactor`). This is what keeps a distant asteroid's hover/selection label
 * readable: the text stays a fixed CSS size on screen regardless of depth, while still tracking the
 * marker's projected position. Used for asteroid hover/selected labels (Etapa 7 priority).
 */
function ScreenLabel({
    position,
    emphasized = false,
    protectFromFocus = true,
    children,
    onClick,
    title,
}: {
    position: [number, number, number];
    emphasized?: boolean;
    protectFromFocus?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, protectFromFocus ? focusOccluder : null);

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus ? (
                <Html position={[0, 0, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onClick?.();
                        }}
                        onPointerEnter={() => { if (onClick) document.body.style.cursor = 'pointer'; }}
                        onPointerLeave={() => { if (onClick) document.body.style.cursor = ''; }}
                        title={title}
                        aria-label={title}
                        disabled={!onClick}
                        className={[
                            '-translate-y-1/2 whitespace-nowrap rounded-md border bg-space-950/92 px-3 py-2 text-[14px] leading-snug text-white/90 shadow-glow backdrop-blur',
                            emphasized ? 'border-signal-cyan/50' : 'border-white/10',
                            onClick ? 'pointer-events-auto cursor-pointer text-left transition hover:border-signal-cyan/40 hover:bg-space-950' : 'pointer-events-none',
                        ].join(' ')}
                    >
                        {children}
                    </button>
                </Html>
            ) : null}
        </group>
    );
}

function DistanceCulledScreenLabel({
    anchor,
    maxCameraDistance,
    ...props
}: Parameters<typeof ScreenLabel>[0] & {
    anchor: [number, number, number];
    maxCameraDistance: number;
}) {
    const camera = useThree((state) => state.camera);
    const [visible, setVisible] = useState(true);

    useFrame(() => {
        const d = camera.position.distanceTo(new THREE.Vector3(...anchor));
        const nextVisible = d <= maxCameraDistance;
        setVisible((current) => (current === nextVisible ? current : nextVisible));
    });

    return visible ? <ScreenLabel {...props} /> : null;
}

function FocusProtectedHtml({
    position,
    center = true,
    distanceFactor,
    zIndexRange,
    style,
    children,
}: {
    position: [number, number, number];
    center?: boolean;
    distanceFactor?: number;
    zIndexRange?: [number, number];
    style?: React.CSSProperties;
    children: React.ReactNode;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, focusOccluder);

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus ? (
                <Html position={[0, 0, 0]} center={center} distanceFactor={distanceFactor} zIndexRange={zIndexRange} style={style}>
                    {children}
                </Html>
            ) : null}
        </group>
    );
}

function useCompactLabelMode(): boolean {
    const { camera, size } = useThree();
    const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
    const [compact, setCompact] = useState(false);
    const compactRef = useRef(false);

    useFrame(() => {
        const target = controls?.target ?? new THREE.Vector3(0, 0, 0);
        const center = target.clone().project(camera);
        const oneDl = target.clone().add(new THREE.Vector3(1, 0, 0)).project(camera);
        const lunarRadiusPx = Math.hypot(
            (oneDl.x - center.x) * size.width * 0.5,
            (oneDl.y - center.y) * size.height * 0.5,
        );
        const next = lunarRadiusPx < COMPACT_LABEL_THRESHOLD_PX;
        if (next !== compactRef.current) {
            compactRef.current = next;
            setCompact(next);
        }
    });

    return compact;
}

function useLabelHiddenByFocusRef(
    labelRef: React.RefObject<THREE.Object3D | null>,
    occluder: LabelOccluder,
): boolean {
    const { camera, size } = useThree();
    const [hidden, setHidden] = useState(false);
    const hiddenRef = useRef(false);
    const labelPosition = useRef(new THREE.Vector3());

    useFrame(() => {
        if (!labelRef.current || !occluder) {
            if (hiddenRef.current) {
                hiddenRef.current = false;
                setHidden(false);
            }
            return;
        }

        labelRef.current.getWorldPosition(labelPosition.current);
        const center = occluder.center.clone().project(camera);
        if (center.z < -1 || center.z > 1) {
            if (hiddenRef.current) {
                hiddenRef.current = false;
                setHidden(false);
            }
            return;
        }

        const label = labelPosition.current.clone().project(camera);
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        const edge = occluder.center.clone().add(cameraRight.multiplyScalar(occluder.radius)).project(camera);

        const centerPx = {
            x: (center.x * 0.5 + 0.5) * size.width,
            y: (-center.y * 0.5 + 0.5) * size.height,
        };
        const labelPx = {
            x: (label.x * 0.5 + 0.5) * size.width,
            y: (-label.y * 0.5 + 0.5) * size.height,
        };
        const edgePx = {
            x: (edge.x * 0.5 + 0.5) * size.width,
            y: (-edge.y * 0.5 + 0.5) * size.height,
        };

        const bodyRadiusPx = Math.hypot(edgePx.x - centerPx.x, edgePx.y - centerPx.y);
        const hideRadiusPx = Math.max(LABEL_HIDE_MIN_RADIUS_PX, bodyRadiusPx + LABEL_HIDE_BODY_PADDING_PX);
        const nextHidden = Math.hypot(labelPx.x - centerPx.x, labelPx.y - centerPx.y) < hideRadiusPx;

        if (nextHidden !== hiddenRef.current) {
            hiddenRef.current = nextHidden;
            setHidden(nextHidden);
        }
    });

    return hidden;
}

// --------------- Heliocentric scene (orbit-solar mode) ---------------

/**
 * Visual radii in HELIOCENTRIC scene units. The cluster uses ORBIT_AU_SCALE units per AU, so
 * Earth's physical radius (≈4.26e-5 AU) is sub-pixel. Bodies are exaggerated for legibility, with
 * chip copy making the scale contract explicit to the user. Positions stay honest to AU; only the
 * spheres' visual sizes are amplified.
 *
 * Earth's visible radius is set via the EARTH_RADIUS_DL constant the <Earth> component already
 * uses internally — we wrap that <Earth> in a scaling group, see HeliocentricScene().
 */
const SUN_RADIUS_HELIO = SUN_RADIUS_SCENE;
const ASTEROID_RADIUS_HELIO = 0.06;
const EARTH_VISUAL_SCALE_HELIO = 2.0; // multiplier on EARTH_RADIUS_DL when shown in AU scene.

type HeliocentricSceneProps = {
    elements: OrbitalElements;
    earthHelioPositionAU: { x: number; y: number; z: number } | null;
    fallbackSunDirection: [number, number, number];
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    asteroidName: string;
    color: string;
    locale: 'pt-BR' | 'en';
};

/**
 * The orbit-solar scene. ALL distances live on a LINEAR AU ruler (no log compression), with the
 * Sun at the scene origin. By construction the asteroid (propagated by Kepler) lands on the drawn
 * ellipse — the audit's key correctness bug.
 *
 * Earth is placed at its real heliocentric position (from astronomy-engine when available, or a
 * 1 AU stand-in along the inverted Sun direction otherwise). Body sizes are exaggerated for
 * visibility; positions and orbit shape are honest.
 */
function HeliocentricScene({
    elements,
    earthHelioPositionAU,
    fallbackSunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    asteroidName,
    color,
    locale,
}: HeliocentricSceneProps) {
    const en = locale === 'en';

    // Earth scene position. If astronomy-engine hasn't resolved yet, place Earth opposite the
    // incoming Sun-direction at exactly 1 AU — geometrically consistent (the Sun *is* at origin),
    // just without the 1.7% eccentricity nuance.
    const earthScenePos = useMemo<[number, number, number]>(() => {
        if (earthHelioPositionAU) {
            return helioAUToSunCenteredScene(earthHelioPositionAU);
        }
        const inv: [number, number, number] = [-fallbackSunDirection[0], -fallbackSunDirection[1], -fallbackSunDirection[2]];
        return [inv[0] * ORBIT_AU_SCALE, inv[1] * ORBIT_AU_SCALE, inv[2] * ORBIT_AU_SCALE];
    }, [earthHelioPositionAU, fallbackSunDirection]);

    // Sun direction AS SEEN FROM EARTH, in scene axes. Used both for the directional light and for
    // orienting Earth's day/night terminator. Sun lives at the origin, so the unit vector from
    // Earth to Sun is simply −normalize(earthScenePos).
    const sunDirFromEarth = useMemo<[number, number, number]>(() => {
        const len = Math.hypot(earthScenePos[0], earthScenePos[1], earthScenePos[2]) || 1;
        return [-earthScenePos[0] / len, -earthScenePos[1] / len, -earthScenePos[2] / len];
    }, [earthScenePos]);

    // Orbit ellipse (Sun-centered AU), built once per elements set.
    const orbitPoints = useMemo(
        () => buildHeliocentricOrbit(elements, 256),
        [elements],
    );

    // Asteroid current heliocentric position via Kepler propagation. Recompute on a slow tick so
    // the marker drifts realistically without forcing a per-frame solve.
    const [asteroidScenePos, setAsteroidScenePos] = useState<[number, number, number] | null>(() => {
        const p = heliocentricPositionAU(elements, new Date());
        return p ? helioAUToSunCenteredScene(p) : null;
    });
    useEffect(() => {
        const tick = () => {
            const p = heliocentricPositionAU(elements, new Date());
            setAsteroidScenePos(p ? helioAUToSunCenteredScene(p) : null);
        };
        tick();
        const id = window.setInterval(tick, 60 * 1000);
        return () => window.clearInterval(id);
    }, [elements]);

    return (
        <group>
            {/* Sun at scene origin: directional light + warm point light, plus the same shader Sun
                sphere used in the radar scene (just placed at the origin via SunAtOrigin). */}
            <directionalLight position={[0, 0, 0]} intensity={2.2} color="#fff6e8" />
            <pointLight position={[0, 0, 0]} intensity={0.5} distance={ORBIT_AU_SCALE * 8} color="#ffdca8" />
            <SunAtOrigin radius={SUN_RADIUS_HELIO} locale={locale} />

            {/* Earth at its real heliocentric position. Same day/night shader as the radar — the Sun
                direction from Earth's frame is just −earthScenePos. Subsolar lat/lon keeps the
                correct continents on the day side. */}
            <group position={earthScenePos} scale={EARTH_VISUAL_SCALE_HELIO}>
                <Earth
                    onFocus={() => { /* no-op: focusing Earth from the helio scene isn't meaningful */ }}
                    sunDirection={sunDirFromEarth}
                    subsolarLatDeg={subsolarLatDeg}
                    subsolarLonDeg={subsolarLonDeg}
                    showLabel
                    protectLabelFromFocus={false}
                />
            </group>

            {/* 1 AU Earth-orbit reference ring (linear AU). Drawn as a circle centered on the Sun
                in the ecliptic plane. */}
            <EarthOrbitRingHelio />

            {/* The asteroid's full Kepler orbit, with Sun at the true focus, exact shape. The whole
                ellipse is rendered brightly so the orbit reads as a continuous path; the marker
                position already signals where "now" is on it. */}
            {orbitPoints ? <OrbitLineHelio points={orbitPoints} color={color} opacity={0.95} /> : null}

            {/* The asteroid itself, propagated by Kepler — by construction sits on the ellipse. */}
            {asteroidScenePos ? (
                <group position={asteroidScenePos}>
                    <mesh>
                        <sphereGeometry args={[ASTEROID_RADIUS_HELIO, 24, 24]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.7} />
                    </mesh>
                    <ScreenLabel position={[0, ASTEROID_RADIUS_HELIO + 0.18, 0]} emphasized protectFromFocus={false}>
                        <span className="font-semibold">{asteroidName}</span>
                    </ScreenLabel>
                </group>
            ) : (
                <FocusProtectedHtml position={[0, ORBIT_AU_SCALE * 0.4, 0]}>
                    <div className="rounded-md border border-amber-400/40 bg-space-950/90 px-3 py-2 text-[12px] text-amber-100">
                        {en
                            ? 'Position on this orbit unavailable — elements lack a perihelion epoch.'
                            : 'Posição nesta órbita indisponível — elementos sem época de periélio.'}
                    </div>
                </FocusProtectedHtml>
            )}
        </group>
    );
}

/** Sun at the scene origin. Reuses the radar Sun's shaders — same look, no Earth-direction offset. */
function SunAtOrigin({ radius, locale }: { radius: number; locale: 'pt-BR' | 'en' }) {
    const en = locale === 'en';
    const surfaceMat = useRef<THREE.ShaderMaterial>(null);
    const surfaceMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: SUN_VERT,
            fragmentShader: SUN_FRAG,
        }),
        [],
    );
    const glowMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color('#ffb84d') } },
            vertexShader: SUN_GLOW_VERT,
            fragmentShader: SUN_GLOW_FRAG,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
        [],
    );
    useFrame(({ clock }) => {
        if (surfaceMat.current) surfaceMat.current.uniforms.uTime.value = clock.getElapsedTime();
    });

    return (
        <group>
            <mesh>
                <sphereGeometry args={[radius, 160, 96]} />
                <primitive ref={surfaceMat} object={surfaceMaterial} attach="material" />
            </mesh>
            <mesh scale={1.018}>
                <sphereGeometry args={[radius, 96, 64]} />
                <meshBasicMaterial color="#ffd27a" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh scale={1.18}>
                <sphereGeometry args={[radius, 96, 64]} />
                <primitive object={glowMaterial} attach="material" />
            </mesh>
            <SunProminences radius={radius} />
            <ScreenLabel position={[0, radius + 0.42, 0]} protectFromFocus={false}>
                <span className="font-semibold">{en ? 'Sun' : 'Sol'}</span>
            </ScreenLabel>
        </group>
    );
}

function SunProminences({ radius }: { radius: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const arcs = useMemo(() => {
        const configs = [
            { start: 0.35, height: 0.18, span: 0.36, tilt: 0.1 },
            { start: 2.15, height: 0.13, span: 0.28, tilt: -0.18 },
            { start: 4.7, height: 0.16, span: 0.32, tilt: 0.22 },
        ];

        return configs.map((config) => {
            const points: THREE.Vector3[] = [];
            for (let i = 0; i <= 28; i += 1) {
                const t = i / 28;
                const a = config.start + (t - 0.5) * config.span;
                const lift = Math.sin(Math.PI * t) * config.height * radius;
                points.push(new THREE.Vector3(
                    Math.cos(a) * (radius + lift),
                    Math.sin(config.tilt) * lift + Math.sin(a * 1.7) * radius * 0.04,
                    Math.sin(a) * (radius + lift),
                ));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: '#ffb45c',
                transparent: true,
                opacity: 0.42,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const line = new THREE.Line(geometry, material);
            return line;
        });
    }, [radius]);

    useEffect(() => () => {
        arcs.forEach((line) => {
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        });
    }, [arcs]);

    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.012;
    });

    return (
        <group ref={groupRef}>
            {arcs.map((line, index) => (
                <primitive key={index} object={line} />
            ))}
        </group>
    );
}

function EarthOrbitRingHelio() {
    const lineObject = useMemo(() => {
        const segments = 192;
        const radius = ORBIT_AU_SCALE; // 1 AU
        const pts: number[] = [];
        for (let i = 0; i <= segments; i += 1) {
            const a = (i / segments) * Math.PI * 2;
            pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
        const material = new THREE.LineBasicMaterial({ color: '#ffcf6e', transparent: true, opacity: 0.3 });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        return line;
    }, []);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return (
        <group>
            <primitive object={lineObject} />
        </group>
    );
}

function OrbitLineHelio({ points, color, opacity = 0.85 }: { points: Float32Array; color: string; opacity?: number }) {
    const lineObject = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        return line;
    }, [points, color, opacity]);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return <primitive object={lineObject} />;
}

// --------------- Scene ---------------

type SceneProps = {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    orbitMode: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    onResetView: () => void;
    onClearSelection: () => void;
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    bodyFocusRequest: { body: 'earth' | 'moon'; nonce: number } | null;
    ephemeris: SceneEphemeris | null;
    /** Server-seeded Sun direction used until the ephemeris resolves. Never an arbitrary vector. */
    fallbackSunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
};

function Scene({ closestNowObjects, selectedId, orbitMode, onSelect, onResetView, onClearSelection, view, viewNonce, focusTarget, bodyFocusRequest, ephemeris, fallbackSunDirection, locale }: SceneProps) {
    const hasSelection = selectedId !== null;
    const focusedObject = useMemo(
        () => closestNowObjects.find((object) => object.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );
    // Selection shows the local geocentric trajectory. The solar Kepler orbit appears only after
    // the user asks for the pulled-back orbit framing.
    const selectedHasOrbit = useMemo(
        () => closestNowObjects.some((object) => object.approach.id === selectedId && Boolean(object.trajectory?.orbitalElements)),
        [closestNowObjects, selectedId],
    );
    // Real Sun direction (Earth→Sun, unit). Falls back to a fixed pleasant angle until the
    // ephemeris resolves. This single vector drives the directional light AND the day/night
    // terminator on Earth and the Moon phase, so everything stays consistent.
    const sunDir = useMemo<[number, number, number]>(
        () => ephemeris?.sunDirection ?? fallbackSunDirection,
        [ephemeris, fallbackSunDirection],
    );
    // Real Moon position (scene units). Falls back to the +X / 1 DL placeholder until resolved.
    const moonPos = useMemo<[number, number, number]>(() => {
        const p = ephemeris?.moonScenePosition;
        // moonScenePosition is in LINEAR DL (~1). Run it through the shared radial log compression,
        // same as the asteroid vectors and the heliocentric orbit, so one rule governs everything.
        if (!p) return [compressDistanceDl(1), 0, 0];
        return compressSceneVector(p);
    }, [ephemeris]);
    // Real orbital-plane normal of the Moon. Fallback: ecliptic-north (flat ring) until resolved.
    const moonOrbitNormal = useMemo<[number, number, number]>(
        () => ephemeris?.moonOrbitNormal ?? [0, 1, 0],
        [ephemeris],
    );
    const compactLabels = useCompactLabelMode();

    // Clicking Earth or Moon re-frames the camera on that body without "selecting" it. Both use the
    // same close framing (framingForBody) so the behavior is identical whether triggered from the
    // 3D scene, the ring buttons, or the side list. An object selection (focusTarget) always wins
    // and clears any body focus.
    const [bodyFocus, setBodyFocus] = useState<{ body: 'earth' | 'moon'; framing: FocusFraming; nonce: number } | null>(null);
    const focusEarth = () => {
        onClearSelection();
        setBodyFocus({ body: 'earth', framing: framingForBody(new THREE.Vector3(0, 0, 0), EARTH_RADIUS_DL), nonce: Date.now() });
    };
    const focusMoon = () => setBodyFocus({ body: 'moon', framing: framingForBody(new THREE.Vector3(...moonPos), MOON_RADIUS_DL), nonce: Date.now() });

    // React to an Earth/Moon focus requested from the side list. Keyed by the request's nonce so the
    // same body can be re-focused; uses the close framing for both (the list means "take me there").
    useEffect(() => {
        if (!bodyFocusRequest) return;
        if (bodyFocusRequest.body === 'earth') {
            setBodyFocus({ body: 'earth', framing: framingForBody(new THREE.Vector3(0, 0, 0), EARTH_RADIUS_DL), nonce: bodyFocusRequest.nonce });
        } else {
            setBodyFocus({ body: 'moon', framing: framingForBody(new THREE.Vector3(...moonPos), MOON_RADIUS_DL), nonce: bodyFocusRequest.nonce });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bodyFocusRequest?.nonce]);

    // Selecting an object clears any pending body focus so the two don't fight.
    useEffect(() => {
        if (focusTarget) setBodyFocus(null);
    }, [focusTarget]);

    // Picking a preset view (Top/Side/Reset) clears any active body focus so the view buttons win.
    useEffect(() => {
        setBodyFocus(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewNonce]);

    // Object selection takes precedence; otherwise a body focus; otherwise the preset view.
    const activeFocus = focusTarget ?? bodyFocus?.framing ?? null;
    const focusNonce = focusTarget ? -1 : bodyFocus?.nonce ?? 0;
    const orbitLabelsOnly = orbitMode && selectedHasOrbit;
    const focusedObjectPosition = focusedObject ? currentPositionInScene(focusedObject) : null;
    const labelOccluder = bodyFocus?.body === 'earth'
        ? { center: new THREE.Vector3(0, 0, 0), radius: EARTH_RADIUS_DL * 1.35 }
        : bodyFocus?.body === 'moon'
          ? { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL * 1.9 }
          : focusedObjectPosition
            ? { center: new THREE.Vector3(...focusedObjectPosition), radius: 0.18 }
          : null;

    // Mode arbitration: orbit-solar takes over the whole scene when (a) the user asked for orbit
    // mode AND (b) the selected object has osculating elements with a usable epoch (tpJd ≠ 0).
    // Otherwise we stay in the geocentric radar layer. Mixing both layers in the same frame was
    // the bug fixed by the modes-separation effort: the asteroid would never sit on its drawn
    // ellipse because they lived in two different rulers.
    const focusedElements = focusedObject?.trajectory?.orbitalElements ?? null;
    const focusedPalette = focusedObject
        ? OBJECT_PALETTE[Math.max(0, closestNowObjects.findIndex((o) => o.approach.id === focusedObject.approach.id)) % OBJECT_PALETTE.length]
        : OBJECT_PALETTE[0];
    const useHelioScene = orbitMode && selectedHasOrbit && Boolean(focusedElements && Number.isFinite(focusedElements.tpJd) && focusedElements.tpJd !== 0);

    return (
        <LabelOccluderContext.Provider value={labelOccluder}>
            <color attach="background" args={['#03060d']} />
            <ambientLight intensity={0.16} />

            {useHelioScene && focusedElements && focusedObject ? (
                <HeliocentricScene
                    elements={focusedElements}
                    earthHelioPositionAU={ephemeris?.earthHelioPositionAU ?? null}
                    fallbackSunDirection={fallbackSunDirection}
                    subsolarLatDeg={ephemeris?.subsolarLatDeg ?? 0}
                    subsolarLonDeg={ephemeris?.subsolarLonDeg ?? 0}
                    asteroidName={focusedObject.approach.displayName ?? focusedObject.approach.name}
                    color={focusedPalette.future}
                    locale={locale}
                />
            ) : (
                <>
                    <Sun direction={sunDir} locale={locale} />
                    <Earth
                        onFocus={focusEarth}
                        sunDirection={sunDir}
                        subsolarLatDeg={ephemeris?.subsolarLatDeg ?? 0}
                        subsolarLonDeg={ephemeris?.subsolarLonDeg ?? 0}
                        showLabel={!orbitLabelsOnly}
                        protectLabelFromFocus={bodyFocus?.body !== 'earth'}
                    />
                    <Moon onFocus={focusMoon} position={moonPos} sunDirection={sunDir} compactLabel={compactLabels} showLabel={!orbitLabelsOnly} protectLabelFromFocus={bodyFocus?.body !== 'moon'} isApproximate={!ephemeris} locale={locale} />
                    <MoonOrbit moonPos={moonPos} orbitNormal={moonOrbitNormal} />
                    <RingsLayer onEarthFocus={focusEarth} showLabels={!compactLabels && !orbitLabelsOnly} />
                    {!orbitLabelsOnly ? (
                        <SunOrbitGuide sunDirection={sunDir} />
                    ) : null}

                    {/* Geocentric markers (near Earth). Selection never moves the rock. */}
                    {closestNowObjects.map((object, index) => (
                        <AsteroidMarker
                            key={object.approach.id}
                            object={object}
                            palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                            isSelected={object.approach.id === selectedId}
                            dimmed={hasSelection && object.approach.id !== selectedId}
                            onSelect={onSelect}
                            compactLabel={compactLabels}
                            showLabel={!orbitLabelsOnly || object.approach.id === selectedId}
                            protectLabelFromFocus={object.approach.id !== selectedId}
                            locale={locale}
                        />
                    ))}

                    {/* Local geocentric "now" trajectories — only meaningful in the radar layer. */}
                    {closestNowObjects
                        .map((object, index) => ({ object, palette: OBJECT_PALETTE[index % OBJECT_PALETTE.length] }))
                        .filter(({ object }) => object.trajectory && object.trajectory.status === 'available')
                        .map(({ object, palette }) => {
                            const activeTrajectory = object.approach.id === selectedId;
                            return (
                                <NowTrajectory
                                    key={`traj-${object.approach.id}`}
                                    trajectory={object.trajectory as AsteroidTrajectory}
                                    palette={palette}
                                    emphasized={activeTrajectory}
                                    dimmed={hasSelection && !activeTrajectory}
                                    locale={locale}
                                />
                            );
                        })}
                </>
            )}

            <OrbitControls
                makeDefault
                enablePan
                enableDamping
                // Lower damping = longer, smoother glide after rotate/pan input.
                dampingFactor={0.05}
                // Zoom is handled by <InertialZoom> below (coasting dolly toward the cursor), so the
                // built-in wheel zoom is disabled to avoid two systems fighting over the dolly.
                enableZoom={false}
                // Don't let the camera dive into Earth: keep min distance above the Earth glow.
                minDistance={EARTH_RADIUS_DL * 2.2}
                // Pull back far enough to see complete selected asteroid orbits.
                maxDistance={MAX_CAMERA_DISTANCE}
                target={[0, 0, 0]}
                rotateSpeed={0.8}
                panSpeed={0.6}
            />

            <InertialZoom minDistance={EARTH_RADIUS_DL * 2.2} maxDistance={MAX_CAMERA_DISTANCE} />

            <CameraRig view={view} viewNonce={viewNonce} focusTarget={activeFocus} focusNonce={focusNonce} />
        </LabelOccluderContext.Provider>
    );
}

/**
 * Builds a camera framing centered on a single body (Earth or Moon) at scene position `center`
 * with visual radius `radius`. Used for the "click Earth/Moon" view shortcut. Backs off along a
 * gentle 3/4 angle far enough to see the body comfortably without clipping it.
 */
function framingForBody(center: THREE.Vector3, radius: number): FocusFraming {
    const dir = new THREE.Vector3(0.4, 0.45, 0.8).normalize();
    const distance = Math.max(radius * 20, 0.2);
    return { target: center.clone(), position: center.clone().add(dir.multiplyScalar(distance)) };
}

function framingForOverview(): FocusFraming {
    return { target: new THREE.Vector3(0, 0, 0), position: CAMERA_VIEWS.perspective.clone() };
}

// --------------- Sun ---------------

/**
 * The Sun as a light reference, placed in the compact heliocentric layer.
 */
function Sun({ direction, locale }: { direction: [number, number, number]; locale: 'pt-BR' | 'en' }) {
    const en = locale === 'en';
    const pos: [number, number, number] = [
        direction[0] * SUN_DISPLAY_DL,
        direction[1] * SUN_DISPLAY_DL,
        direction[2] * SUN_DISPLAY_DL,
    ];

    const surfaceMat = useRef<THREE.ShaderMaterial>(null);
    const glowMat = useRef<THREE.ShaderMaterial>(null);

    // Animated photosphere (granulation + sunspots) — a star with life, not a flat disc.
    const surfaceMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: SUN_VERT,
            fragmentShader: SUN_FRAG,
        }),
        [],
    );

    // Corona glow as a single fresnel shell: a back-facing sphere whose opacity falls off smoothly
    // toward the rim. This gives a soft halo that fades to nothing — no hard translucent disc that
    // smears across the screen as a yellow blob when the Sun sits off-frame.
    const glowMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color('#ffb84d') } },
            vertexShader: SUN_GLOW_VERT,
            fragmentShader: SUN_GLOW_FRAG,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
        [],
    );

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (surfaceMat.current) surfaceMat.current.uniforms.uTime.value = t;
    });

    return (
        <group>
            {/* Key light + a warm point light along the real Sun direction. */}
            <directionalLight position={pos} intensity={2.2} color="#fff6e8" />
            <pointLight position={pos} intensity={0.5} distance={80} color="#ffdca8" />

            <group position={pos}>
                {/* Radiant photosphere with procedural granulation + sunspots. */}
                <mesh>
                    <sphereGeometry args={[SUN_RADIUS_SCENE, 160, 96]} />
                    <primitive ref={surfaceMat} object={surfaceMaterial} attach="material" />
                </mesh>
                {/* A thin bright rim just above the surface for a crisp limb. */}
                <mesh scale={1.018}>
                    <sphereGeometry args={[SUN_RADIUS_SCENE, 96, 64]} />
                    <meshBasicMaterial color="#ffd27a" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
                </mesh>
                {/* Soft fresnel corona that fades to nothing — replaces the old hard halo discs. */}
                <mesh scale={1.18}>
                    <sphereGeometry args={[SUN_RADIUS_SCENE, 96, 64]} />
                    <primitive ref={glowMat} object={glowMaterial} attach="material" />
                </mesh>
                <SunProminences radius={SUN_RADIUS_SCENE} />
                <ScreenLabel position={[0, SUN_RADIUS_SCENE + 0.42, 0]}>
                    <span className="font-semibold">{en ? 'Sun' : 'Sol'}</span>
                </ScreenLabel>
            </group>
        </group>
    );
}

// Sun surface shader: value-noise granulation + a fresnel limb brighten, drifting with uTime so
// it shimmers like a star's photosphere. Kept cheap (a few octaves of hash noise).
const SUN_VERT = /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        float t = uTime * 0.08;
        vec3 unit = normalize(position);
        float boil =
            sin(unit.x * 18.0 + t) * 0.006 +
            sin(unit.y * 23.0 - t * 1.4) * 0.004 +
            sin(unit.z * 29.0 + t * 0.7) * 0.003;
        vec3 displaced = position + normal * boil;
        vPos = displaced;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
    }
`;

const SUN_FRAG = /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vView;

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    // Fractal brownian motion: several octaves of noise summed → rich, organic granulation.
    float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.02;
            a *= 0.5;
        }
        return v;
    }
    void main() {
        vec3 p = normalize(vPos);
        float t = uTime * 0.12;

        float latBand = sin((p.y + fbm(p * 2.0)) * 9.0 + t * 0.5) * 0.08;
        float gran = fbm(p * 12.0 + vec3(t, t * 0.6, -t));
        float fil = fbm(p * 34.0 - vec3(t * 1.4, t, t * 0.5));
        float cells = abs(gran - 0.5) * 2.0;
        float n = gran * 0.48 + fil * 0.34 + cells * 0.16 + latBand;

        // Color ramp: deep orange troughs → bright yellow-white peaks.
        vec3 deep = vec3(0.78, 0.22, 0.035);
        vec3 mid  = vec3(1.0, 0.48, 0.08);
        vec3 hot  = vec3(1.0, 0.9, 0.58);
        vec3 whiteHot = vec3(1.0, 0.98, 0.86);
        vec3 col = mix(deep, mid, smoothstep(0.22, 0.52, n));
        col = mix(col, hot, smoothstep(0.48, 0.78, n));
        col = mix(col, whiteHot, smoothstep(0.78, 0.96, n));

        // Sunspots: sparse dark cooler patches from a low-frequency noise threshold.
        float spotField = fbm(p * 3.4 + vec3(9.0, 3.0, 13.0));
        float spotMask = smoothstep(0.76, 0.86, spotField) * smoothstep(0.08, 0.55, abs(p.y));
        col *= mix(1.0, 0.36, spotMask);

        // Subtle magnetic lanes.
        float lanes = smoothstep(0.66, 0.95, fil) * 0.22;
        col += lanes * vec3(1.0, 0.55, 0.18);

        // Fresnel limb brightening for a glowing edge.
        float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.5);
        col += fres * vec3(1.0, 0.62, 0.24) * 0.42;

        gl_FragColor = vec4(col, 1.0);
    }
`;

// Sun corona glow: a back-facing shell whose alpha falls off smoothly toward the rim (fresnel), so
// the halo fades to nothing instead of being a hard translucent disc that smears across the screen.
const SUN_GLOW_VERT = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
    }
`;

const SUN_GLOW_FRAG = /* glsl */ `
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.8);
        float coreFade = smoothstep(0.12, 0.95, rim);
        float alpha = coreFade * 0.24;
        vec3 col = mix(uColor, vec3(1.0, 0.86, 0.55), rim);
        gl_FragColor = vec4(col, alpha);
    }
`;

function SunOrbitGuide({
    sunDirection,
}: {
    sunDirection: [number, number, number];
}) {
    const orbit = useMemo(() => {
        const center = sunEclipticDisplayPosition(sunDirection);
        const radius = center.length() || SUN_DISPLAY_DL;
        const earthDir = center.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x).normalize();
        const segments = 192;
        const pts: number[] = [];
        for (let i = 0; i <= segments; i += 1) {
            const a = (i / segments) * Math.PI * 2;
            const p = center.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * radius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * radius));
            pts.push(p.x, p.y, p.z);
        }
        const labelAngle = Math.PI * 0.18;
        const label = center.clone()
            .add(earthDir.clone().multiplyScalar(Math.cos(labelAngle) * radius))
            .add(tangent.clone().multiplyScalar(Math.sin(labelAngle) * radius));
        return { points: new Float32Array(pts), label: [label.x, label.y, label.z] as [number, number, number] };
    }, [sunDirection]);

    // Real THREE.Line so we can disable frustum culling — this 1 AU Earth-orbit reference must not
    // vanish when the camera pulls back to frame the heliocentric layer.
    const lineObject = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(orbit.points, 3));
        const material = new THREE.LineBasicMaterial({ color: '#ffcf6e', transparent: true, opacity: 0.3 });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        return line;
    }, [orbit.points]);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return (
        <group>
            <primitive object={lineObject} />
        </group>
    );
}

// --------------- Earth ---------------

function Earth({
    onFocus,
    sunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    showLabel,
    protectLabelFromFocus,
}: {
    onFocus: () => void;
    sunDirection: [number, number, number];
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
}) {
    const day = useEarthTexture('/images/earth/blue-marble-land-shallow-topo-2048.jpg', 'raw');
    const night = useEarthTexture('/images/earth/earth-night-lights-2048.jpg', 'raw');
    const clouds = useEarthTexture('/images/earth/earth-clouds-2048.jpg', 'srgb');

    const groupRef = useRef<THREE.Group>(null);
    const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const [hovered, setHovered] = useState(false);

    // Cloud shell shader: the (greyscale) cloud map drives both brightness AND opacity, and the same
    // honest dot(normal, sun) lighting darkens clouds on the night side so they don't glow in the
    // dark. Sits just above the surface inside the oriented group, so clouds track the globe.
    const cloudsMaterial = useMemo(() => {
        if (!clouds) return null;
        return new THREE.ShaderMaterial({
            uniforms: { cloudMap: { value: clouds }, sunDir: { value: new THREE.Vector3(...sunDirection) } },
            vertexShader: EARTH_VERT,
            fragmentShader: CLOUDS_FRAG,
            transparent: true,
            depthWrite: false,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clouds]);

    // Coherence approach: day/night in the shader is the honest dot(worldNormal, sunDir), so the
    // lit hemisphere ALWAYS faces the visible Sun. To put the CORRECT continents on that lit
    // hemisphere, we orient the globe so the real subsolar point (lat/lon where the Sun is
    // overhead now) physically points at the Sun. orientEarth() builds that rotation from the
    // subsolar point + Sun direction, with the texture's UV convention baked in. Result: both
    // "lit side faces Sun" and "right continents are lit" hold at once, tracking real UTC time.
    const material = useMemo(() => {
        if (!day || !night) return null;
        return new THREE.ShaderMaterial({
            uniforms: {
                dayMap: { value: day },
                nightMap: { value: night },
                sunDir: { value: new THREE.Vector3(...sunDirection) },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: EARTH_FRAG,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, night]);

    useFrame(() => {
        if (groupRef.current) {
            orientEarth(groupRef.current, sunDirection, subsolarLatDeg, subsolarLonDeg);
        }
        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }
        if (cloudsMatRef.current) {
            (cloudsMatRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }
    });

    return (
        <group>
            {/* Oriented globe: the group's rotation is set each frame by orientEarth() so the real
                subsolar point faces the Sun. The glow shells and hitbox stay axis-aligned. */}
            <group ref={groupRef}>
                <mesh>
                    <sphereGeometry args={[EARTH_RADIUS_DL, 64, 64]} />
                    {material ? (
                        <primitive ref={matRef} object={material} attach="material" />
                    ) : (
                        // Lit blue fallback while textures load — never a black sphere.
                        <meshStandardMaterial color="#2f6fb0" emissive="#0a2a4a" emissiveIntensity={0.5} roughness={0.85} />
                    )}
                </mesh>
                {/* Cloud shell, just above the surface; only on the day side (shader-lit). */}
                {cloudsMaterial ? (
                    <mesh>
                        <sphereGeometry args={[EARTH_RADIUS_DL * 1.012, 64, 64]} />
                        <primitive ref={cloudsMatRef} object={cloudsMaterial} attach="material" />
                    </mesh>
                ) : null}
            </group>

            {/* Atmospheric glow — two soft backside shells for a fresnel-ish rim. */}
            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * 1.06, 48, 48]} />
                <meshBasicMaterial color="#6fd0ff" transparent opacity={0.16} side={THREE.BackSide} />
            </mesh>
            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * 1.18, 48, 48]} />
                <meshBasicMaterial color="#3aa0ff" transparent opacity={0.06} side={THREE.BackSide} />
            </mesh>

            {/* Invisible hitbox — easy hover/click. Clicking Earth re-centers the camera on it
                (a view shortcut); Earth is context, so it doesn't open the focus panel. */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
                onClick={(e) => { e.stopPropagation(); onFocus(); }}
            >
                <sphereGeometry args={[EARTH_HITBOX_DL, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLabel ? (
                <ScreenLabel position={[0, EARTH_RADIUS_DL + 0.14, 0]} emphasized={hovered} protectFromFocus={protectLabelFromFocus} onClick={onFocus} title="Voltar para a visão geral">
                    <span className="font-semibold">Terra</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}

// Day/night Earth shader. World-space normal vs. Sun direction gives a soft terminator; the night
// map's brightness is used as a city-lights mask that only shows on the dark hemisphere.
const EARTH_VERT = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const EARTH_FRAG = /* glsl */ `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform vec3 sunDir;
    varying vec2 vUv;
    varying vec3 vWorldNormal;

    // The day/night maps are sampled as RAW sRGB-encoded data (we deliberately don't tag them as
    // sRGB textures, see useEarthTexture), so we convert sRGB → linear here, light in linear, then
    // back to sRGB for output. Doing the conversion ourselves is what stops the day side from
    // rendering near-black (the previous double-decode darkened the oceans into looking like night).
    vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
    vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

    void main() {
        float lambert = dot(normalize(vWorldNormal), normalize(sunDir));
        // Tight terminator centered on the limb. The audit flagged the previous ±0.20 as visibly
        // wider than the real ~0.5° penumbra; ±0.05 keeps the day/night line crisp without
        // hard-edged stepping.
        float dayAmount = smoothstep(-0.05, 0.05, lambert);

        vec3 dayColor = toLinear(texture2D(dayMap, vUv).rgb);
        vec3 nightTex = toLinear(texture2D(nightMap, vUv).rgb);

        // Day side: bright, near-full daylight with a higher ambient floor so the lit hemisphere
        // reads vividly (was too dim before). Gentle gamma on lambert keeps the terminator soft.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = dayColor * (0.62 + 0.95 * pow(lit, 0.7));

        // Night side: very dim base + city lights, only on the dark hemisphere.
        vec3 cityLights = nightTex * (1.0 - dayAmount) * 1.2;
        vec3 nightLit = dayColor * 0.025 + cityLights;

        vec3 color = mix(nightLit, dayLit, dayAmount);
        gl_FragColor = vec4(toSRGB(color), 1.0);
    }
`;

// Cloud shell: the greyscale cloud map's brightness is both the cloud color and its opacity, so the
// black sky-areas of the map render fully transparent. Clouds are lit by the same sun dot and fade
// out on the night side so they never glow in the dark.
const CLOUDS_FRAG = /* glsl */ `
    uniform sampler2D cloudMap;
    uniform vec3 sunDir;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
        float c = texture2D(cloudMap, vUv).r;          // cloud density 0..1
        float lambert = dot(normalize(vWorldNormal), normalize(sunDir));
        float dayAmount = smoothstep(-0.05, 0.3, lambert);
        float light = 0.15 + 0.9 * clamp(lambert, 0.0, 1.0);
        float alpha = c * dayAmount * 0.85;            // transparent where no cloud / on night side
        gl_FragColor = vec4(vec3(light), alpha);
    }
`;

/**
 * Loads the Earth texture imperatively. We avoid drei/R3F's `useLoader` here because it suspends
 * (a thrown try/catch around it is a no-op) and gives no clean error path — in the Docker dev
 * setup a failed/slow load left the globe black. This returns null until the bitmap is decoded,
 * so the caller can paint a lit blue fallback in the meantime, then swaps in the real map.
 */
function useEarthTexture(url: string, colorSpace: 'srgb' | 'raw' = 'srgb'): THREE.Texture | null {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let active = true;
        const loader = new TextureLoader();
        loader.load(
            url,
            (tex) => {
                if (!active) { tex.dispose(); return; }
                // 'srgb' for materials that decode sRGB themselves (meshStandardMaterial.map, e.g.
                // the Moon). 'raw' for our custom Earth shader, which does the sRGB↔linear math by
                // hand — tagging it sRGB there would double-decode and darken the day side.
                tex.colorSpace = colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                setTexture(tex);
            },
            undefined,
            () => { /* leave null → lit blue fallback */ },
        );
        return () => { active = false; };
    }, [url, colorSpace]);

    return texture;
}

// --------------- Moon ---------------

function Moon({
    onFocus,
    position,
    sunDirection,
    compactLabel,
    showLabel,
    protectLabelFromFocus,
    isApproximate,
    locale,
}: {
    onFocus: () => void;
    position: [number, number, number];
    sunDirection: [number, number, number];
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    /** True until astronomy-engine resolves and provides the real lunar geocentric vector. */
    isApproximate: boolean;
    locale: 'pt-BR' | 'en';
}) {
    const en = locale === 'en';
    const [hovered, setHovered] = useState(false);
    // Real lunar photo texture (2K). Procedural bump still adds crater relief on top.
    const texture = useEarthTexture('/images/moon/moon-2048.jpg');
    const bump = useMemo(() => {
        try { return buildMoonBump(512); } catch { return null; }
    }, []);

    // Tidal locking: the same hemisphere always faces Earth. We orient the textured mesh each
    // frame so the lunar near-side faces the scene origin (Earth). Built as a target basis, same
    // approach as orientEarth() — keeps the lunar north pole as close to scene +Y as possible.
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (meshRef.current) orientMoonTidal(meshRef.current, position);
    });

    // The Moon's phase/shadow is produced for free by real lighting: the Sun light comes from the
    // true Sun direction and the Moon sits at its true position, so the lit hemisphere faces the
    // Sun exactly like the real Moon. We add a faint fill aimed opposite the Sun so the dark limb
    // isn't pure black (earthshine-ish), without washing out the terminator.
    const fillPos: [number, number, number] = [
        position[0] - sunDirection[0] * 3,
        position[1] - sunDirection[1] * 3,
        position[2] - sunDirection[2] * 3,
    ];

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <sphereGeometry args={[MOON_RADIUS_DL, 64, 64]} />
                {texture ? (
                    <meshStandardMaterial
                        key="moon-textured"
                        map={texture}
                        bumpMap={bump ?? undefined}
                        bumpScale={0.012}
                        roughness={0.95}
                        metalness={0.0}
                    />
                ) : (
                    <meshStandardMaterial key="moon-fallback" color="#c2c4c8" roughness={0.95} metalness={0.02} />
                )}
            </mesh>

            {/* Soft earthshine fill so the unlit side keeps a hint of shape. Scoped tight to the
                Moon by distance so it doesn't leak onto Earth/asteroids. */}
            <pointLight position={fillPos} intensity={0.05} distance={MOON_RADIUS_DL * 6} color="#3a4a6a" />

            {/* Invisible hitbox for easy hover/click. Clicking the Moon re-centers the camera
                on it (view shortcut); the Moon is context, so it doesn't open the focus panel. */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
                onClick={(e) => { e.stopPropagation(); onFocus(); }}
            >
                <sphereGeometry args={[MOON_HITBOX_DL, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLabel ? (
                <DistanceCulledScreenLabel
                    anchor={position}
                    maxCameraDistance={5.2}
                    position={moonLabelOffset(position, compactLabel)}
                    emphasized={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={onFocus}
                    title={isApproximate
                        ? (en ? 'Lunar position loading (server fallback)' : 'Posição lunar carregando (estimativa do servidor)')
                        : (en ? 'Focus on the Moon' : 'Focar na Lua')}
                >
                    <span className="font-semibold">{en ? 'Moon' : 'Lua'}</span>
                    {isApproximate ? (
                        <span className="ml-1 text-[10px] font-normal text-amber-200/80">
                            {en ? '· loading' : '· carregando'}
                        </span>
                    ) : null}
                </DistanceCulledScreenLabel>
            ) : null}
        </group>
    );
}

function moonLabelOffset(position: [number, number, number], compactLabel: boolean): [number, number, number] {
    if (!compactLabel) return [0, MOON_RADIUS_DL + 0.1, 0];

    const awayFromEarth = new THREE.Vector3(...position);
    if (awayFromEarth.lengthSq() < 1e-6) {
        return [0.16, MOON_RADIUS_DL + 0.06, 0];
    }

    awayFromEarth.normalize().multiplyScalar(0.18);
    awayFromEarth.y += MOON_RADIUS_DL + 0.04;
    return [awayFromEarth.x, awayFromEarth.y, awayFromEarth.z];
}

// --------------- DL rings ---------------

function RingsLayer({ onEarthFocus, showLabels }: { onEarthFocus: () => void; showLabels: boolean }) {
    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            {/* Optional inner rings (currently none). */}
            {RING_STOPS_DL.map((ld) => (
                <mesh key={ld}>
                    <ringGeometry
                        args={[
                            compressDistanceDl(ld) - 0.006,
                            compressDistanceDl(ld) + 0.006,
                            128,
                        ]}
                    />
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.2}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
            {/* Faint guide rings beyond 1 DL so distant asteroids still have a distance cue,
                without competing visually with the Earth-Moon zone. */}
            {GUIDE_RING_STOPS_DL.map((ld) => (
                <mesh key={`guide-${ld}`}>
                    <ringGeometry
                        args={[
                            compressDistanceDl(ld) - 0.01,
                            compressDistanceDl(ld) + 0.01,
                            160,
                        ]}
                    />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
                </mesh>
            ))}
            {/* "1 DL" lives on the Moon orbit line. Keep only broader guide labels here. */}
            {showLabels ? GUIDE_RING_STOPS_DL.map((ld) => (
                <SceneLabel
                    key={`glabel-${ld}`}
                    position={[
                        Math.cos(Math.PI * 0.85) * compressDistanceDl(ld),
                        Math.sin(Math.PI * 0.85) * compressDistanceDl(ld),
                        0,
                    ]}
                    tier="ring"
                    onClick={onEarthFocus}
                    title="Focar na Terra"
                >
                    {ld} DL
                </SceneLabel>
            )) : null}
        </group>
    );
}

/**
 * The Moon's orbit, drawn as a circle in the Moon's REAL orbital plane (from position × velocity,
 * supplied as `orbitNormal`) — not an arbitrary tilt. The Moon visibly sits ON this 1 DL line.
 *
 * Radius = the Moon geocentric distance after the compact DL scale. The first basis vector is the Moon's
 * own position, so the rendered line passes exactly through the rendered Moon.
 */
function MoonOrbit({
    moonPos,
    orbitNormal,
}: {
    moonPos: [number, number, number];
    orbitNormal: [number, number, number];
}) {
    const orbit = useMemo(() => {
        const m = new THREE.Vector3(...moonPos);
        const radius = m.length() || 1;
        if (radius < 1e-6) return null;

        const a = m.clone().normalize();
        let n = new THREE.Vector3(...orbitNormal).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        n = n.sub(a.clone().multiplyScalar(n.dot(a)));
        if (n.lengthSq() < 1e-6) {
            n = up.sub(a.clone().multiplyScalar(up.dot(a)));
        }
        n.normalize();
        const b = new THREE.Vector3().crossVectors(n, a).normalize();

        const segments = 128;
        const pts: number[] = [];
        for (let i = 0; i <= segments; i += 1) {
            const ang = (i / segments) * Math.PI * 2;
            const p = a.clone().multiplyScalar(Math.cos(ang) * radius).add(b.clone().multiplyScalar(Math.sin(ang) * radius));
            pts.push(p.x, p.y, p.z);
        }
        const labelAngle = Math.PI * 0.16;
        const label = a.clone()
            .multiplyScalar(Math.cos(labelAngle) * radius)
            .add(b.clone().multiplyScalar(Math.sin(labelAngle) * radius));

        return { points: new Float32Array(pts), label: [label.x, label.y, label.z] as [number, number, number] };
    }, [moonPos, orbitNormal]);

    if (!orbit) return null;
    return (
        <group>
            <line>
                <bufferGeometry attach="geometry">
                    <bufferAttribute attach="attributes-position" args={[orbit.points, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#cbd5e1" transparent opacity={0.3} />
            </line>
        </group>
    );
}

// --------------- Asteroid marker ---------------

type Palette = (typeof OBJECT_PALETTE)[number];

type AsteroidMarkerProps = {
    object: ClosestNowObject;
    palette: Palette;
    isSelected: boolean;
    dimmed: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    locale: 'pt-BR' | 'en';
};

function AsteroidMarker({ object, isSelected, dimmed, onSelect, compactLabel, showLabel, protectLabelFromFocus, locale }: AsteroidMarkerProps) {
    const position = currentPositionInScene(object);
    const [hovered, setHovered] = useState(false);
    const rockRef = useRef<THREE.Group>(null);

    // Famous real-shape assets only when identity matches. Everything else gets a generic rock
    // variant chosen from its estimated physical size.
    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    // Slow tumble so the body reads as 3D without looking restless.
    useFrame((_, delta) => {
        if (rockRef.current) {
            rockRef.current.rotation.y += delta * 0.045;
            rockRef.current.rotation.x += delta * 0.018;
        }
    });

    if (!position) return null;

    // Markers are enlarged for interaction — NOT physical size. The selected one is a bit bigger.
    const rockScale = 0.045;
    const opacity = dimmed ? 0.4 : 1;
    const nearbyClosestApproach = closestApproachNearPosition(object.trajectory, new THREE.Vector3(...position));
    const en = locale === 'en';

    return (
        <group position={position}>
            {/* Real GLB for known bodies; generic size-class rocks for everything else. */}
            <group ref={rockRef} scale={rockScale}>
                <pointLight position={[1.5, 1.2, 1.8]} intensity={0.18} distance={2.4} color="#f2f7ff" />
                {renderModel.kind === 'real' ? (
                    <RealAsteroidModel asset={renderModel.asset} opacity={opacity} />
                ) : (
                    <ProceduralAsteroidRock seed={object.approach.id} variant={renderModel.variant} opacity={opacity} />
                )}
            </group>

            {/* Invisible hitbox — large, easy click/hover target. */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
                onClick={(e) => { e.stopPropagation(); onSelect(object.approach); }}
            >
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLabel ? (
                <ScreenLabel
                    position={[0, 0.16, 0]}
                    emphasized={isSelected || hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={() => onSelect(object.approach)}
                    title={`Focar ${object.approach.displayName ?? object.approach.name}`}
                >
                <div className="font-semibold">{object.approach.displayName ?? object.approach.name}</div>
                {!compactLabel ? (
                    <div className="text-white/65">
                        {compactKm(object.currentDistanceKm)} ·{' '}
                        {object.currentDistanceLD !== null ? `${object.currentDistanceLD.toFixed(2)} DL` : '—'}
                    </div>
                ) : null}
                {nearbyClosestApproach ? (
                    <div className="mt-1 rounded border border-signal-cyan/35 bg-signal-cyan/10 px-2 py-1 text-[12px] font-semibold text-signal-cyan">
                        {en ? 'Closest approach now' : 'Máxima aproximação hoje'}
                    </div>
                ) : null}
                </ScreenLabel>
            ) : null}
        </group>
    );
}

function RealAsteroidModel({ asset, opacity }: { asset: AsteroidModelAsset; opacity: number }) {
    const gltf = useGLTF(asset.url) as { scene: THREE.Group };
    const { model, scale } = useMemo(() => {
        const clone = gltf.scene.clone(true);
        const box = new THREE.Box3().setFromObject(clone);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        clone.position.copy(center).multiplyScalar(-1);
        clone.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const styledMaterials = sourceMaterials.map((material) => {
                const styled = material.clone();
                styled.transparent = opacity < 1;
                styled.opacity = opacity;
                styled.depthWrite = opacity >= 0.75;
                if ('roughness' in styled) {
                    (styled as THREE.MeshStandardMaterial).roughness = Math.max((styled as THREE.MeshStandardMaterial).roughness ?? 0, 0.92);
                }
                if ('metalness' in styled) {
                    (styled as THREE.MeshStandardMaterial).metalness = Math.min((styled as THREE.MeshStandardMaterial).metalness ?? 0, 0.03);
                }
                return styled;
            });
            mesh.material = Array.isArray(mesh.material) ? styledMaterials : styledMaterials[0];
        });

        return { model: clone, scale: 2 / maxAxis };
    }, [gltf.scene, opacity]);

    return (
        <group rotation={asset.rotation} scale={scale}>
            <primitive object={model} />
        </group>
    );
}

function ProceduralAsteroidRock({ seed, variant, opacity }: { seed: string; variant: GenericAsteroidVariant; opacity: number }) {
    const rockGeometry = useMemo(() => buildAsteroidGeometry(seed, variant), [seed, variant]);
    useEffect(() => () => rockGeometry.dispose(), [rockGeometry]);
    const surface = useMemo(() => { try { return buildAsteroidSurfaceTextures(seed, variant, 512); } catch { return null; } }, [seed, variant]);
    useEffect(() => () => {
        surface?.map.dispose();
        surface?.bump.dispose();
        surface?.roughness.dispose();
    }, [surface]);

    return (
        <mesh geometry={rockGeometry}>
            <meshStandardMaterial
                color="#f2f0e7"
                vertexColors
                map={surface?.map ?? undefined}
                bumpMap={surface?.bump ?? undefined}
                bumpScale={0.032}
                roughnessMap={surface?.roughness ?? undefined}
                emissive="#38342c"
                emissiveIntensity={0.28}
                roughness={0.82}
                metalness={0.0}
                flatShading={false}
                transparent
                opacity={opacity}
            />
        </mesh>
    );
}

function asteroidRenderableModelFor(object: ClosestNowObject): AsteroidRenderableModel {
    const realAsset = realAsteroidModelFor(object);
    if (realAsset) return { kind: 'real', asset: realAsset };

    return { kind: 'generic', variant: genericAsteroidVariantFor(object) };
}

/**
 * Resolves a real shape-model GLB (Bennu, Ceres, Eros, Itokawa, Vesta) for an asteroid ONLY when
 * the object is unambiguously that body. Two independent matchers:
 *
 *   - Alias matcher: the asset's alias (e.g. "ceres", "bennu") must appear as a whole word in one
 *     of the text fields. Substring matching was wrong — "2026 KD1" contains "1" but is not Ceres,
 *     and "Ceres-1A" should not silently become Ceres. Word boundaries (\b) handle hyphens, spaces
 *     and parentheses correctly: "(1) Ceres" matches, "AstroCeres" does not.
 *
 *   - Number matcher: the asset's IAU permanent number must be EQUAL to a canonical numeric field
 *     (permanentNumber or spkId), optionally surrounded by parentheses. Critically, we do NOT scan
 *     `name`/`designation`/`detailIdentifier` for digits — provisional designations such as
 *     "2026 KD1" end in "1" and were being mis-matched to Ceres (whose IAU number is 1). Catalog
 *     numbers are atomic identifiers, not arbitrary digit hits.
 *
 * If neither matcher fires, the asteroid falls through to the generic procedural variant. We never
 * default to "Ceres because the diameter is large" — the real GLBs belong only to the real bodies.
 */
function realAsteroidModelFor(object: ClosestNowObject): AsteroidModelAsset | null {
    const textFields = [
        object.approach.name,
        object.approach.displayName,
        object.approach.rawName,
        object.approach.properName,
        object.approach.designation,
        object.approach.provisionalDesignation,
        object.approach.detailIdentifier,
        ...(object.approach.aliases ?? []),
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    // Only canonical catalog-number fields are eligible for numeric matching.
    const catalogNumberFields = [
        object.approach.permanentNumber,
        object.approach.spkId,
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    for (const asset of REAL_ASTEROID_MODELS) {
        if (asset.aliases.some((alias) => textFields.some((field) => fieldContainsWord(field, alias)))) {
            return asset;
        }

        if (asset.numbers.some((number) => catalogNumberFields.some((field) => fieldEqualsCatalogNumber(field, number)))) {
            return asset;
        }
    }

    return null;
}

/** True when `needle` appears as a whole word in `field` — bounded by start/end or a non-alphanumeric. */
function fieldContainsWord(field: string, needle: string): boolean {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(field);
}

/**
 * True when the canonical numeric field IS exactly the catalog number, allowing optional
 * surrounding parentheses (e.g. "(1)" or "1" both match number "1", but "2026 kd1" does NOT —
 * that string contains other digits, so the catalog number is not the field's entire identity).
 */
function fieldEqualsCatalogNumber(field: string, number: string): boolean {
    const trimmed = field.trim().replace(/^\((\d+)\)$/, '$1');
    return trimmed === number;
}

function genericAsteroidVariantFor(object: ClosestNowObject): GenericAsteroidVariant {
    const diameter = asteroidDiameterMeters(object);
    if (diameter === null) return 'unknown';
    if (diameter < 40) return 'tiny';
    if (diameter < 150) return 'small';
    if (diameter < 600) return 'medium';
    return 'large';
}

function asteroidDiameterMeters(object: ClosestNowObject): number | null {
    const direct = object.approach.diameterMeters;
    if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) return direct;

    const min = object.approach.estimatedDiameterMinMeters;
    const max = object.approach.estimatedDiameterMaxMeters;
    if (
        typeof min === 'number' &&
        typeof max === 'number' &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min > 0 &&
        max > 0
    ) {
        return (min + max) / 2;
    }

    return null;
}

/**
 * Builds a noise-deformed icosahedron that reads as an irregular rock. Seeded by the object id so
 * the shape is stable across renders and distinct per asteroid. Unit-ish radius; the caller scales
 * it. The point isn't physical accuracy — it's "looks like a rock, not a dot".
 *
 * Higher subdivision + layered noise (broad lobes → medium lumps → fine grain) gives a believable
 * irregular silhouette, and a few gouged "craters" break the surface up so it reads as a real
 * weathered body rather than a smooth blob.
 */
function buildAsteroidGeometry(seed: string, variant: GenericAsteroidVariant = 'unknown'): THREE.IcosahedronGeometry {
    const profile = genericAsteroidProfile(variant);
    const geo = new THREE.IcosahedronGeometry(1, profile.detail);
    const rng = mulberry32(hashString(seed));
    const axes = new THREE.Vector3(
        profile.axes[0] * (0.92 + rng() * 0.16),
        profile.axes[1] * (0.92 + rng() * 0.16),
        profile.axes[2] * (0.92 + rng() * 0.16),
    );
    // Pre-roll a few random phase offsets so each asteroid is distinct but deterministic.
    const ph = Array.from({ length: 9 }, () => rng() * 6.28);
    // A handful of crater centers on the unit sphere.
    const craters = Array.from({ length: profile.craterCount + Math.floor(rng() * 3) }, () => {
        const u = rng(); const w = rng();
        const theta = Math.acos(2 * u - 1); const phi = 2 * Math.PI * w;
        return {
            dir: new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)),
            radius: profile.craterRadius[0] + rng() * (profile.craterRadius[1] - profile.craterRadius[0]),
            depth: profile.craterDepth[0] + rng() * (profile.craterDepth[1] - profile.craterDepth[0]),
        };
    });

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i);
        const dir = v.clone().normalize();

        // Layered lumpiness: broad lobes, medium bumps, fine grain.
        const broad =
            profile.roughness * Math.sin(dir.x * 1.7 + ph[0]) +
            profile.roughness * 0.9 * Math.sin(dir.y * 2.1 + ph[1]) +
            profile.roughness * 0.8 * Math.sin(dir.z * 1.9 + ph[2]);
        const medium =
            profile.roughness * 0.45 * Math.sin(dir.x * 4.3 + ph[3]) +
            profile.roughness * 0.4 * Math.sin(dir.y * 5.1 + ph[4]) +
            profile.roughness * 0.35 * Math.sin(dir.z * 4.7 + ph[5]);
        const fine =
            profile.roughness * 0.18 * Math.sin(dir.x * 9.7 + ph[6]) +
            profile.roughness * 0.15 * Math.sin(dir.y * 11.3 + ph[7]) +
            profile.roughness * 0.14 * Math.sin(dir.z * 10.1 + ph[8]);
        let r = 1 + broad + medium + fine;

        // Carve craters: a smooth depression where the vertex direction is close to a crater center.
        for (const c of craters) {
            const d = dir.angleTo(c.dir);
            if (d < c.radius) {
                const t = 1 - d / c.radius;          // 1 at center → 0 at rim
                r -= c.depth * t * t * (3 - 2 * t);  // smoothstep falloff
            }
        }

        v.copy(dir).multiplyScalar(Math.max(0.55, r)).multiply(axes);
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    addAsteroidVertexColors(geo, seed, variant);
    return geo;
}

function addAsteroidVertexColors(geo: THREE.BufferGeometry, seed: string, variant: GenericAsteroidVariant): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const rng = mulberry32(hashString(`${seed}:${variant}:color`));
    const baseHue = 0.095 + rng() * 0.02;
    const sat = 0.02 + rng() * 0.035;
    const baseLight = variant === 'tiny' ? 0.55 : variant === 'large' ? 0.46 : 0.51;
    const v = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i).normalize();
        const grain =
            Math.sin(v.x * 8.7 + rng() * 6.28) * 0.025 +
            Math.cos(v.y * 10.3 + rng() * 6.28) * 0.018 +
            Math.sin(v.z * 13.1 + rng() * 6.28) * 0.014;
        const latitudeShade = v.y * 0.018;
        c.setHSL(baseHue + grain * 0.035, sat, THREE.MathUtils.clamp(baseLight + grain * 0.55 + latitudeShade, 0.34, 0.68));
        colors.push(c.r, c.g, c.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function buildAsteroidSurfaceTextures(
    seed: string,
    variant: GenericAsteroidVariant,
    size: number,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
    const width = size;
    const height = size / 2;
    const colorCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    colorCanvas.width = bumpCanvas.width = roughCanvas.width = width;
    colorCanvas.height = bumpCanvas.height = roughCanvas.height = height;

    const colorCtx = colorCanvas.getContext('2d')!;
    const bumpCtx = bumpCanvas.getContext('2d')!;
    const roughCtx = roughCanvas.getContext('2d')!;
    const rng = mulberry32(hashString(`${seed}:${variant}:surface`));
    const baseHue = 38 + rng() * 8;
    const baseSat = 3 + rng() * 5;
    const baseLight = variant === 'tiny' ? 58 : variant === 'large' ? 50 : 55;

    const image = colorCtx.createImageData(width, height);
    const bump = bumpCtx.createImageData(width, height);
    const rough = roughCtx.createImageData(width, height);
    const phase = Array.from({ length: 8 }, () => rng() * Math.PI * 2);

    for (let y = 0; y < height; y += 1) {
        const v = y / height;
        for (let x = 0; x < width; x += 1) {
            const u = x / width;
            const idx = (y * width + x) * 4;
            const large =
                Math.sin(u * Math.PI * 5.0 + phase[0]) * 0.5 +
                Math.cos(v * Math.PI * 7.0 + phase[1]) * 0.35 +
                Math.sin((u + v) * Math.PI * 9.0 + phase[2]) * 0.25;
            const fine =
                Math.sin(u * Math.PI * 47.0 + phase[3]) * 0.12 +
                Math.cos(v * Math.PI * 53.0 + phase[4]) * 0.1 +
                Math.sin((u - v) * Math.PI * 71.0 + phase[5]) * 0.08;
            const grain = large + fine + (rng() - 0.5) * 0.22;
            const light = THREE.MathUtils.clamp(baseLight + grain * 7, 40, 74);
            const sat = THREE.MathUtils.clamp(baseSat + fine * 6, 1, 10);
            const color = new THREE.Color(`hsl(${baseHue + grain * 3}, ${sat}%, ${light}%)`);
            image.data[idx] = Math.round(color.r * 255);
            image.data[idx + 1] = Math.round(color.g * 255);
            image.data[idx + 2] = Math.round(color.b * 255);
            image.data[idx + 3] = 255;

            const bumpValue = THREE.MathUtils.clamp(132 + grain * 42 + fine * 70, 42, 220);
            bump.data[idx] = bump.data[idx + 1] = bump.data[idx + 2] = bumpValue;
            bump.data[idx + 3] = 255;

            const roughValue = THREE.MathUtils.clamp(218 + Math.abs(fine) * 80 - large * 10, 170, 255);
            rough.data[idx] = rough.data[idx + 1] = rough.data[idx + 2] = roughValue;
            rough.data[idx + 3] = 255;
        }
    }

    colorCtx.putImageData(image, 0, 0);
    bumpCtx.putImageData(bump, 0, 0);
    roughCtx.putImageData(rough, 0, 0);

    const craterCount = genericAsteroidProfile(variant).craterCount + 8;
    for (let i = 0; i < craterCount; i += 1) {
        const x = rng() * width;
        const y = rng() * height;
        const r = (6 + rng() * 28) * (variant === 'tiny' ? 0.65 : variant === 'large' ? 1.25 : 1);
        const colorGrad = colorCtx.createRadialGradient(x, y, r * 0.08, x, y, r);
        colorGrad.addColorStop(0, 'rgba(58, 56, 52, 0.18)');
        colorGrad.addColorStop(0.58, 'rgba(112, 108, 99, 0.08)');
        colorGrad.addColorStop(0.78, 'rgba(232, 224, 204, 0.14)');
        colorGrad.addColorStop(1, 'rgba(128,128,128,0)');
        colorCtx.fillStyle = colorGrad;
        colorCtx.beginPath();
        colorCtx.arc(x, y, r, 0, Math.PI * 2);
        colorCtx.fill();

        const bumpGrad = bumpCtx.createRadialGradient(x, y, r * 0.04, x, y, r);
        bumpGrad.addColorStop(0, 'rgba(24,24,24,0.55)');
        bumpGrad.addColorStop(0.66, 'rgba(70,70,70,0.26)');
        bumpGrad.addColorStop(0.82, 'rgba(235,235,235,0.24)');
        bumpGrad.addColorStop(1, 'rgba(128,128,128,0)');
        bumpCtx.fillStyle = bumpGrad;
        bumpCtx.beginPath();
        bumpCtx.arc(x, y, r, 0, Math.PI * 2);
        bumpCtx.fill();
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    const roughness = new THREE.CanvasTexture(roughCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [map, bumpMap, roughness]) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
    }

    return { map, bump: bumpMap, roughness };
}

function genericAsteroidProfile(variant: GenericAsteroidVariant): {
    detail: number;
    axes: [number, number, number];
    roughness: number;
    craterCount: number;
    craterRadius: [number, number];
    craterDepth: [number, number];
} {
    switch (variant) {
        case 'tiny':
            return { detail: 5, axes: [1.55, 0.62, 0.72], roughness: 0.18, craterCount: 2, craterRadius: [0.18, 0.34], craterDepth: [0.03, 0.075] };
        case 'small':
            return { detail: 5, axes: [1.28, 0.78, 0.92], roughness: 0.16, craterCount: 4, craterRadius: [0.2, 0.42], craterDepth: [0.04, 0.095] };
        case 'medium':
            return { detail: 6, axes: [1.08, 0.95, 0.88], roughness: 0.13, craterCount: 5, craterRadius: [0.22, 0.48], craterDepth: [0.045, 0.11] };
        case 'large':
            return { detail: 6, axes: [1.42, 0.86, 0.96], roughness: 0.11, craterCount: 7, craterRadius: [0.24, 0.56], craterDepth: [0.04, 0.1] };
        case 'unknown':
        default:
            return { detail: 5, axes: [1.14, 0.88, 0.94], roughness: 0.145, craterCount: 4, craterRadius: [0.2, 0.44], craterDepth: [0.04, 0.095] };
    }
}

/**
 * A deterministic, muted STONE color for an asteroid (cool grey ↔ warm taupe by seed). Kept dark
 * and desaturated so the body reads as rock; identity color lives on the halo/cone, not here.
 */
function stoneTint(seed: string): THREE.Color {
    const rng = mulberry32(hashString(seed) ^ 0x9e3779b9);
    const hue = 0.06 + rng() * 0.04;       // narrow warm band (brownish)
    const sat = 0.05 + rng() * 0.10;       // nearly grey
    const light = 0.34 + rng() * 0.12;     // mid-dark stone
    return new THREE.Color().setHSL(hue, sat, light);
}

function hashString(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// --------------- Trajectory ---------------

type NowTrajectoryProps = {
    trajectory: AsteroidTrajectory;
    palette: Palette;
    emphasized: boolean;
    dimmed: boolean;
    locale: 'pt-BR' | 'en';
};

function NowTrajectory({ trajectory, palette, emphasized, dimmed, locale }: NowTrajectoryProps) {
    const pastVecs = useMemo(
        () => (trajectory.pastPoints ?? []).map(toVec3),
        [trajectory.pastPoints],
    );
    // Same source points whether selected or not — the non-selected "stub" is literally the FIRST
    // part of the very same curve. Only the length clip below differs, so selecting an object just
    // grows the stub into the full arc (no jump, no different geometry).
    const futureVecs = useMemo(
        () => (trajectory.futurePoints ?? []).map(toVec3),
        [trajectory.futurePoints],
    );
    const currentVec = useMemo(
        () => (trajectory.currentPoint ? toVec3(trajectory.currentPoint) : null),
        [trajectory.currentPoint],
    );

    // Closest-approach marker: scan ALL points (past + future) and pick the one with the
    // smallest distanceKm. This is what the user wants to see — the moment of closest approach
    // — and Horizons already tags each point with its range, so we just take the minimum.
    const closestApproach = useMemo(() => findClosestApproachPoint(trajectory), [trajectory]);

    // The Horizons window is now ~50 days (-15d/+35d), wide enough that the trajectory visibly
    // CURVES. We draw essentially the whole arc — the cap is large and only exists so a very fast
    // outlier can't shoot infinitely off-scene. Showing the full arc also keeps the closest-
    // approach marker ON the drawn line instead of floating off as an orphan dot.
    // Non-selected objects show only a SHORT direction-of-travel stub, just enough to read which way
    // they're heading without long vectors streaking across the whole scene. The selected one gets
    // the full arc. Both clip the SAME curve, so the stub is exactly its opening segment.
    //
    // NOTE: the clip length is measured in SCENE UNITS (the points are already log-compressed), not
    // raw DL — so this is a visual length on screen, kept small so the stub barely leaves the marker.
    const PAST_REACH_DL = 1.25;
    // Non-selected: a short lead of the SAME curve (just clipped short) so the grey dashed stub in
    // front of the cone matches the full orbit you see once it's selected.
    const FUTURE_REACH_DL = 1.8;

    // Bridge past[-1] → current → future[0] so the curve has no visible break at "now". Past is
    // chronological (oldest → newest); future is chronological (now → later).
    const fullPast = useMemo(() => {
        const joined = currentVec && pastVecs.length > 0 ? [...pastVecs, currentVec] : pastVecs;
        // Clip from the "now" end backward, then restore chronological order.
        return clipPolylineByLength([...joined].reverse(), PAST_REACH_DL).reverse();
    }, [pastVecs, currentVec]);

    const fullFuture = useMemo(() => {
        const joined = currentVec && futureVecs.length > 0 ? [currentVec, ...futureVecs] : futureVecs;
        return clipPolylineByLength(joined, FUTURE_REACH_DL);
    }, [futureVecs, currentVec]);

    // Only show the closest-approach marker when its point actually falls within the drawn portion
    // of the trajectory — otherwise it reads as a floating orphan dot disconnected from any line.
    const closestApproachOnPath = useMemo(() => {
        if (!closestApproach) return false;
        const onSegment = (pts: THREE.Vector3[]) =>
            pts.some((p) => p.distanceToSquared(closestApproach.vec) < 0.25 * 0.25);
        return onSegment(fullPast) || onSegment(fullFuture);
    }, [closestApproach, fullPast, fullFuture]);

    // Non-selected objects show NO trajectory line — only a small 3D direction cone sitting right at
    // the asteroid, pointing the way it's heading. Direction priority: the real Horizons velocity
    // vector (works even when there are no future samples — fixes objects like JW3 that had no
    // arrow), falling back to the first future segment.
    const endArrow = useMemo(() => {
        if (!currentVec) return null;
        const tip = currentVec.clone();

        const cp = trajectory.currentPoint;
        let direction: THREE.Vector3 | null = null;
        if (cp && typeof cp.vx === 'number' && typeof cp.vy === 'number') {
            // Velocity is in ecliptic (x,y,z); scene axes swap to (x, z, y). Magnitude is irrelevant
            // (we normalize), so no unit conversion needed — only the direction matters.
            const v = new THREE.Vector3(cp.vx, cp.vz ?? 0, cp.vy);
            if (v.lengthSq() > 1e-12) direction = v.normalize();
        }
        if (!direction && fullFuture.length >= 2) {
            const d = fullFuture[1].clone().sub(fullFuture[0]);
            if (d.lengthSq() > 1e-8) direction = d.normalize();
        }
        if (!direction) return null;
        return { tip, direction };
    }, [currentVec, trajectory.currentPoint, fullFuture]);

    // Subtle temporal ticks at -24h / +24h / +72h relative to now, when those samples exist.
    const timeTicks = useMemo(() => {
        if (!emphasized) return [];
        const drawn = [...fullPast, ...fullFuture];
        return collectTimeTicks(trajectory).filter((tick) =>
            drawn.some((p) => p.distanceToSquared(tick.vec) < 0.35 * 0.35),
        );
    }, [emphasized, trajectory, fullPast, fullFuture]);

    // Selected → strong & vivid (the full curved arc stands out). Everything else stays faint &
    // discreet so the 5 long 50-day arcs don't clutter the scene. `dimmed` (another object is
    // selected) pushes them even fainter so the selected arc clearly wins attention.
    const pastDotOpacity = emphasized ? 0.34 : dimmed ? 0.1 : 0.2;
    const futureDotOpacity = emphasized ? 0.42 : dimmed ? 0.16 : 0.3;
    const coneOpacity = emphasized ? 0.95 : dimmed ? 0.5 : 0.85;

    return (
        <group>
            {fullPast.length >= 2 ? (
                <DashedLeadLine points={fullPast} color={palette.past} opacity={pastDotOpacity} dashSize={0.055} gapSize={0.13} />
            ) : null}

            {/* Dotted future direction, shown for selected and non-selected objects. */}
            {fullFuture.length >= 2 ? (
                <DashedLeadLine points={fullFuture} color={palette.future} opacity={futureDotOpacity} dashSize={0.075} gapSize={0.12} />
            ) : null}

            {/* Selected → several "->" arrows along the future path.
                Others → a direction cone at the asteroid + a short grey dashed lead in front of it,
                tracing the start of the very same curve the full orbit shows when selected. */}
            {endArrow ? (
                <ElegantEndArrow tip={endArrow.tip} direction={endArrow.direction} color={palette.future} opacity={coneOpacity} />
            ) : null}

            {/* Temporal ticks — only on the emphasized (selected) object, to avoid clutter. */}
            {emphasized
                ? timeTicks.map((tick) => (
                      <TimeTick key={tick.label} vec={tick.vec} label={tick.label} color={palette.future} />
                  ))
                : null}

            {closestApproach && (emphasized || closestApproachOnPath) ? (
                <ClosestApproachMarker
                    point={closestApproach}
                    color={palette.current}
                    emphasized={emphasized}
                    dimmed={dimmed}
                    locale={locale}
                    showLabel={false}
                />
            ) : null}
        </group>
    );
}

/**
 * A trajectory polyline. Horizons gives us only a handful of sparse samples, so drawing straight
 * segments between them looks like jagged "elbows" that aren't physically there. We fit a
 * Catmull-Rom curve through the real samples (passing through every one) and resample it densely,
 * so the rendered path reads as the smooth arc the object actually follows in 3D.
 *
 * `lineWidth` is a best-effort hint — WebGL core lines ignore width > 1 on most platforms — so
 * emphasis is carried mostly by opacity/color.
 */
function TrajectoryLine({
    points,
    color,
    opacity,
    lineWidth,
}: {
    points: THREE.Vector3[];
    color: string;
    opacity: number;
    lineWidth: number;
}) {
    const positions = useMemo(() => {
        if (points.length < 3) {
            return new Float32Array(points.flatMap((v) => [v.x, v.y, v.z]));
        }
        // centripetal Catmull-Rom avoids the cusps/overshoot the uniform variant produces on
        // unevenly spaced samples — exactly our case near closest approach.
        const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
        const divisions = Math.min(220, Math.max(40, points.length * 24));
        const sampled = curve.getPoints(divisions);
        return new Float32Array(sampled.flatMap((v) => [v.x, v.y, v.z]));
    }, [points]);

    // Key by vertex count so the geometry's draw range is rebuilt cleanly when the sample count
    // changes (R3F otherwise can keep a stale count on the existing bufferAttribute).
    const count = positions.length / 3;

    return (
        <line key={count}>
            <bufferGeometry attach="geometry">
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={lineWidth} />
        </line>
    );
}

/**
 * A direction marker for a non-selected asteroid: a solid 3D cone sitting at the body, pointing
 * along its real direction of travel. Being true 3D geometry, it rotates naturally with the scene
 * (no screen-projection trickery that made the old flat glyph wobble as the camera orbited) and it
 * renders for every object that has a velocity, so none are left without an arrow.
 */
function ElegantEndArrow({
    tip,
    direction,
    color,
    opacity,
}: {
    tip: THREE.Vector3;
    direction: THREE.Vector3;
    color: string;
    opacity: number;
}) {
    // A cone's default axis is +Y; build the quaternion that turns +Y onto the travel direction, and
    // offset the cone slightly forward so its base doesn't sit inside the rock marker.
    const coneLength = 0.13;
    const coneRadius = 0.036;
    const airGapFromRock = 0.13;
    const { quaternion, position } = useMemo(() => {
        const dir = direction.clone().normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const pos = tip.clone().add(dir.multiplyScalar(airGapFromRock + coneLength * 0.5));
        return { quaternion: q, position: pos };
    }, [airGapFromRock, coneLength, direction, tip]);

    return (
        <mesh position={position} quaternion={quaternion}>
            <coneGeometry args={[coneRadius, coneLength, 18]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
    );
}

/**
 * A short grey, dashed lead line in front of a non-selected asteroid's direction cone. It traces the
 * opening of the SAME real trajectory curve drawn in full when the object is selected (it receives
 * those exact points, just clipped short) — so the little dashes read as a preview of the full path.
 *
 * Built as a real THREE.Line via <primitive>: LineDashedMaterial needs computeLineDistances(), and
 * the <line> JSX tag's TS types resolve to SVG (rejecting three.js props). frustumCulled stays on —
 * these are tiny and near the markers, so culling them when off-screen is fine.
 */
function DashedLeadLine({
    points,
    color = '#9fb0bf',
    opacity,
    dashSize = 0.12,
    gapSize = 0.1,
}: {
    points: THREE.Vector3[];
    color?: string;
    opacity: number;
    dashSize?: number;
    gapSize?: number;
}) {
    const lineObject = useMemo(() => {
        // Smooth the sparse samples the same way TrajectoryLine does, so the dashes hug the curve.
        const curve = points.length >= 3
            ? new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
            : null;
        const sampled = curve ? curve.getPoints(48) : points;
        const geometry = new THREE.BufferGeometry().setFromPoints(sampled);
        const material = new THREE.LineDashedMaterial({
            color,
            transparent: true,
            opacity,
            dashSize,
            gapSize,
            depthWrite: false,
        });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances(); // required for the dashes to show
        return line;
    }, [points, color, opacity, dashSize, gapSize]);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return <primitive object={lineObject} />;
}

function TimeTick({ vec, label, color }: { vec: THREE.Vector3; label: string; color: string }) {
    return (
        <group position={vec}>
            <mesh>
                <sphereGeometry args={[0.012, 12, 12]} />
                <meshBasicMaterial color={color} transparent opacity={0.85} />
            </mesh>
            <FocusProtectedHtml position={[0, 0.055, 0]} center distanceFactor={7} zIndexRange={[6, 0]}>
                <span className="pointer-events-none select-none whitespace-nowrap rounded-full bg-space-950/70 px-1.5 py-0.5 text-[10px] font-medium text-white/75 backdrop-blur">
                    {label}
                </span>
            </FocusProtectedHtml>
        </group>
    );
}

function ClosestApproachMarker({
    point,
    color,
    emphasized,
    dimmed,
    locale,
    showLabel = true,
}: {
    point: { vec: THREE.Vector3; distanceKm: number; distanceLD: number | null; timestamp: string };
    color: string;
    emphasized: boolean;
    dimmed: boolean;
    locale: 'pt-BR' | 'en';
    showLabel?: boolean;
}) {
    const en = locale === 'en';
    const opacity = dimmed ? 0.3 : 0.85;
    return (
        <group position={point.vec}>
            <mesh>
                <sphereGeometry args={[0.016, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>
            {emphasized && showLabel ? (
                <FocusProtectedHtml position={[0, 0.09, 0]} center distanceFactor={5} zIndexRange={[8, 0]}>
                    <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-space-950/92 px-2 py-1 text-[11px] text-white/90 shadow-glow backdrop-blur">
                        <div className="text-[9px] uppercase tracking-wide text-white/55">
                            {en ? 'Closest approach' : 'Máxima aproximação'}
                        </div>
                        <div className="font-semibold">
                            {point.distanceLD !== null ? `${point.distanceLD.toFixed(2)} DL` : '—'}{' '}
                            <span className="font-normal text-white/60">· {compactKm(point.distanceKm)}</span>
                        </div>
                        <div className="text-[9px] text-white/50">{formatTimestamp(point.timestamp, locale)}</div>
                    </div>
                </FocusProtectedHtml>
            ) : null}
        </group>
    );
}

// --------------- Camera ---------------

type FocusFraming = {
    /** Where the camera should look. */
    target: THREE.Vector3;
    /** Where the camera should sit. */
    position: THREE.Vector3;
};

/**
 * Inertial zoom toward the current focus. Replaces OrbitControls' built-in wheel zoom (disabled
 * above) so the dolly has momentum: each wheel notch adds to a velocity that decays exponentially,
 * so the camera keeps gliding a moment after you stop scrolling, and easing back out gives a
 * little push too. In a big 3D volume that coasting makes traversal feel less twitchy.
 *
 * Direction: the dolly always moves along the camera → OrbitControls-target ray. By default that
 * target is Earth (the scene origin), so zoom heads toward Earth. When the user selects the Moon
 * or an asteroid, CameraRig moves the target onto that body, so the zoom then heads toward it —
 * exactly the requested behavior, with no cursor aiming. Distance is clamped to [min, max].
 */
function InertialZoom({ minDistance, maxDistance }: { minDistance: number; maxDistance: number }) {
    const { camera } = useThree();
    const gl = useThree((s) => s.gl);
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; dispatchEvent?: (e: { type: string }) => void }
        | null;

    // Accumulated zoom velocity in "log-distance" units (negative = zooming in).
    const velocity = useRef(0);

    useEffect(() => {
        const el = gl.domElement;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault(); // don't scroll the page while zooming the scene

            // Treat a scroll as user interaction so CameraRig (which listens for 'start') hands
            // control back mid-transition instead of fighting the dolly.
            controls?.dispatchEvent?.({ type: 'start' });

            // deltaY is ~±100 per notch; scale into a gentle per-notch velocity bump. Normalizing
            // by line/page delta modes keeps trackpads and mice comparable.
            const rect = el.getBoundingClientRect();
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
            velocity.current += (event.deltaY * unit) * 0.00018;
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [gl, controls]);

    useFrame(() => {
        if (Math.abs(velocity.current) < 1e-4) {
            velocity.current = 0;
            return;
        }

        const target = controls?.target ?? new THREE.Vector3();

        // Dolly straight along the camera → target ray. Exponential step so the feel is uniform at
        // any scale (a notch zooms by the same %, whether you're close or far).
        const toTarget = camera.position.clone().sub(target);
        const dist = toTarget.length();
        const newDist = THREE.MathUtils.clamp(dist * Math.exp(velocity.current), minDistance, maxDistance);
        if (dist > 1e-6) {
            camera.position.copy(target).add(toTarget.multiplyScalar(newDist / dist));
        }
        controls?.update();

        // Exponential decay → the "coast". Lower = glides longer.
        velocity.current *= 0.82;
    });

    return null;
}

/**
 * Drives the camera ONLY during an explicit transition (a view-shortcut click or an object/body
 * focus). Outside a transition it does nothing, so OrbitControls owns the camera completely and
 * there's zero fighting on small drags.
 *
 * A transition starts when `viewNonce`/`focusNonce`/`focusTarget` change. It ends when either the
 * camera arrives near the goal OR the user grabs the controls (the OrbitControls 'start' event).
 * That's what fixes the "it snaps back when I nudge it" feeling.
 */
function CameraRig({
    view,
    viewNonce,
    focusTarget,
    focusNonce,
}: {
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    focusNonce: number;
}) {
    // OrbitControls registers itself here via `makeDefault`. Typed loosely because R3F's default
    // `controls` slot is intentionally untyped (it can host any controls implementation).
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; addEventListener: (t: string, fn: () => void) => void; removeEventListener: (t: string, fn: () => void) => void }
        | null;

    // Desired camera position + look target for the current transition.
    const desired = useMemo(() => {
        if (focusTarget) return { position: focusTarget.position.clone(), target: focusTarget.target.clone() };
        return { position: CAMERA_VIEWS[view].clone(), target: new THREE.Vector3(0, 0, 0) };
        // nonces participate so re-issuing the same intent restarts the tween.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, focusTarget, focusNonce]);

    const tweening = useRef(false);
    useEffect(() => {
        tweening.current = true; // a new intent → start steering
    }, [desired]);

    // Any user interaction immediately cancels the tween and hands control back.
    useEffect(() => {
        if (!controls?.addEventListener) return undefined;
        const cancel = () => { tweening.current = false; };
        controls.addEventListener('start', cancel);
        return () => controls.removeEventListener('start', cancel);
    }, [controls]);

    useFrame(({ camera }) => {
        if (!tweening.current) return;

        camera.position.lerp(desired.position, 0.1);
        if (controls?.target) {
            controls.target.lerp(desired.target, 0.1);
            controls.update();
        } else {
            camera.lookAt(desired.target);
        }

        // Arrived close enough → stop steering and release the camera to the user.
        const posClose = camera.position.distanceToSquared(desired.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(desired.target) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}

/**
 * Camera framing for a selected asteroid.
 *   - orbitMode = false: a CLOSE-UP on the geocentric rock — the radar (log) scene is in play.
 *   - orbitMode = true: frame the object's full Kepler orbit around the Sun in the HELIOCENTRIC
 *     scene (Sun at origin, linear AU). The bounding sphere covers the orbit ellipse, the Sun,
 *     Earth's heliocentric position (if known), and the asteroid's propagated position.
 */
function computeFocusFraming(
    object: ClosestNowObject,
    orbitMode = false,
    earthHelioPositionAU: { x: number; y: number; z: number } | null = null,
): FocusFraming | null {
    if (orbitMode && object.trajectory?.orbitalElements) {
        const elements = object.trajectory.orbitalElements;
        const orbitPoints = buildHeliocentricOrbit(elements, 256);
        if (orbitPoints) {
            const box = new THREE.Box3();
            for (let i = 0; i < orbitPoints.length; i += 3) {
                box.expandByPoint(new THREE.Vector3(orbitPoints[i], orbitPoints[i + 1], orbitPoints[i + 2]));
            }

            // Sun (origin) and Earth (~1 AU on its orbit) are scene anchors in the heliocentric layer.
            box.expandByPoint(new THREE.Vector3(0, 0, 0));
            if (earthHelioPositionAU) {
                const earth = helioAUToSunCenteredScene(earthHelioPositionAU);
                box.expandByPoint(new THREE.Vector3(earth[0], earth[1], earth[2]));
            }
            // Asteroid current position — by construction it sits on the ellipse, but include it
            // explicitly so the framing never misses it under degenerate elements.
            const asteroidHelio = heliocentricPositionAU(elements, new Date());
            if (asteroidHelio) {
                const a = helioAUToSunCenteredScene(asteroidHelio);
                box.expandByPoint(new THREE.Vector3(a[0], a[1], a[2]));
            }

            const sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV_DEG);
            const distance = THREE.MathUtils.clamp(
                (sphere.radius / Math.sin(fovRad * 0.5)) * 1.12,
                ORBIT_AU_SCALE * 1.2,
                MAX_CAMERA_DISTANCE,
            );
            const dir = new THREE.Vector3(0.32, 0.72, 0.62).normalize();
            return { target: sphere.center, position: sphere.center.clone().add(dir.multiplyScalar(distance)) };
        }

        // Elements rejected the orbit builder. Fall through to the close-up so something is shown.
    }

    // Geocentric close-up on the rock. The radar (log) scene is in play, so we use the same
    // log-compressed position the marker uses.
    const current = currentPositionInScene(object);
    if (!current) return null;
    const target = new THREE.Vector3(...current);
    const distance = 2.1;
    const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
    const position = target.clone().add(dir.multiplyScalar(distance));
    return { target, position };
}

// --------------- Focus card (HTML overlay, not 3D) ---------------

type FocusTab = 'summary' | 'physical' | 'approach';

function FocusCard({
    object,
    onOpenFocus,
    onClose,
    orbitMode,
    hasOrbit,
    canShowOrbitPosition,
    onShowOrbit,
    onShowCloseUp,
    locale,
}: {
    object: ClosestNowObject;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    onClose: () => void;
    orbitMode: boolean;
    /** Osculating elements present — orbit *shape* is drawable. */
    hasOrbit: boolean;
    /**
     * Whether we can place the asteroid on its drawn orbit. Requires a usable tpJd (perihelion
     * epoch) so the Kepler propagation has a time origin. Without it, the shape is drawable but
     * the "current" point on it is not — we keep the orbit button disabled rather than show a
     * fake position alongside the ellipse.
     */
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    locale: 'pt-BR' | 'en';
}) {
    const en = locale === 'en';
    const a = object.approach;
    const [tab, setTab] = useState<FocusTab>('summary');
    const ldText = object.currentDistanceLD !== null ? `${object.currentDistanceLD.toFixed(2)} DL` : '—';
    const auText = formatDistanceAU(object.currentDistanceKm, locale);
    const motion = motionLabel(object.trajectory?.motionState, en);
    const risk = riskAssessment(a, en);
    const summary = humanSummary(object, en);

    return (
        <div className="pointer-events-auto absolute left-3 top-[56%] z-20 flex max-h-[76%] w-[min(24rem,48%)] -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-signal-cyan/25 bg-space-950/92 shadow-glow backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
                <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-white/45">
                        {orbitMode
                            ? (en ? 'On its orbit around the Sun' : 'Em sua órbita ao redor do Sol')
                            : (en ? 'Approach in focus' : 'Aproximação em foco')}
                    </div>
                    <div className="mt-0.5 truncate text-base font-semibold text-white">
                        {a.displayName ?? a.name}
                    </div>
                    {a.subtitle ? (
                        <div className="truncate text-[12px] text-white/55">{a.subtitle}</div>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1 -mt-1 rounded-full p-1 text-white/55 transition outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    aria-label={en ? 'Close focus card' : 'Fechar painel'}
                >
                    ×
                </button>
            </div>

            {/* Risk badge — prominent, color-coded by hazard. */}
            <div className="mt-2 px-3">
                <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${risk.className}`}>
                    <span className="text-base">{risk.icon}</span>
                    <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-tight">{risk.title}</div>
                        <div className="text-[11px] leading-tight opacity-80">{risk.subtitle}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-2.5 flex gap-1 border-b border-white/10 px-3">
                <FocusTabButton active={tab === 'summary'} onClick={() => setTab('summary')}>{en ? 'Summary' : 'Resumo'}</FocusTabButton>
                <FocusTabButton active={tab === 'physical'} onClick={() => setTab('physical')}>{en ? 'Physical' : 'Físico'}</FocusTabButton>
                <FocusTabButton active={tab === 'approach'} onClick={() => setTab('approach')}>{en ? 'Approach' : 'Aproximação'}</FocusTabButton>
            </div>

            {/* Tab content (scrolls if tall) */}
            <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {tab === 'summary' ? (
                    <div className="space-y-2">
                        <p className="text-[13px] leading-relaxed text-white/80">{summary}</p>
                        <dl className="space-y-1.5 text-[13px]">
                            <Row label={en ? 'Distance from Earth' : 'Distância da Terra'}>
                                {compactKm(object.currentDistanceKm)} <span className="text-white/55">· {ldText} · {auText}</span>
                            </Row>
                            {motion ? (
                                <Row label={en ? 'Status' : 'Status'}>
                                    <span className={motion.className}>{motion.text}</span>
                                </Row>
                            ) : null}
                        </dl>
                    </div>
                ) : null}

                {tab === 'physical' ? (
                    <dl className="space-y-1.5 text-[13px]">
                        <Row label={en ? 'Diameter' : 'Diâmetro'}>
                            {a.diameterMeters
                                ? `${Math.round(a.diameterMeters)} m`
                                : a.estimatedDiameterMinMeters !== null
                                  ? `${Math.round(a.estimatedDiameterMinMeters)}–${Math.round(a.estimatedDiameterMaxMeters ?? 0)} m`
                                  : '—'}
                        </Row>
                        <Row label={en ? 'Size compared to' : 'Tamanho comparável a'}>
                            {sizeComparison(a.diameterMeters ?? a.estimatedDiameterMaxMeters, en)}
                        </Row>
                        <Row label={en ? 'Absolute magnitude (H)' : 'Magnitude absoluta (H)'}>
                            {a.absoluteMagnitude !== null ? a.absoluteMagnitude.toFixed(1) : '—'}
                        </Row>
                        <Row label={en ? 'Type' : 'Tipo'}>
                            {a.objectType === 'comet' ? (en ? 'Comet' : 'Cometa') : (en ? 'Asteroid' : 'Asteroide')}
                        </Row>
                    </dl>
                ) : null}

                {tab === 'approach' ? (
                    <dl className="space-y-1.5 text-[13px]">
                        {a.relativeVelocityKph !== null ? (
                            <Row label={en ? 'Velocity' : 'Velocidade'}>
                                {new Intl.NumberFormat(locale).format(Math.round(a.relativeVelocityKph))} km/h
                            </Row>
                        ) : null}
                        {a.approachDate ? (
                            <Row label={en ? 'Closest approach' : 'Máxima aproximação'}>
                                {formatTimestamp(a.approachDate, locale)}
                            </Row>
                        ) : null}
                        <Row label={en ? 'Min. distance' : 'Distância mínima'}>
                            {a.nominalDistanceKm !== null ? compactKm(a.nominalDistanceKm) : '—'}
                            {a.lunarDistance !== null ? <span className="text-white/55"> · {a.lunarDistance.toFixed(2)} DL</span> : null}
                        </Row>
                        <Row label={en ? 'Source' : 'Fonte'}>JPL/Horizons</Row>
                    </dl>
                ) : null}
            </div>

            {/* Actions — the orbit toggle is the primary CTA; the dossier is secondary. */}
            <div className="space-y-1.5 border-t border-white/10 px-3 py-2.5">
                {hasOrbit ? (
                    <button
                        type="button"
                        onClick={orbitMode ? onShowCloseUp : onShowOrbit}
                        disabled={!orbitMode && !canShowOrbitPosition}
                        title={!orbitMode && !canShowOrbitPosition
                            ? (en
                                ? 'Heliocentric orbit elements incomplete for this object (missing perihelion epoch).'
                                : 'Elementos da órbita heliocêntrica incompletos para este objeto (sem época de periélio).')
                            : undefined}
                        className={[
                            'inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            !orbitMode && !canShowOrbitPosition
                                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                                : orbitMode
                                    ? 'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10'
                                    : 'bg-signal-cyan text-space-950 shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:bg-signal-cyan/90',
                        ].join(' ')}
                    >
                        {orbitMode
                            ? (en ? '↩ Back to the asteroid' : '↩ Voltar ao asteroide')
                            : (en ? '🛰 See its orbit around the Sun' : '🛰 Ver a órbita ao redor do Sol')}
                    </button>
                ) : null}
                {onOpenFocus ? (
                    <button
                        type="button"
                        onClick={() => onOpenFocus(a)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[12px] font-medium text-white/70 transition outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    >
                        {en ? 'Open full dossier' : 'Abrir dossiê completo'}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function FocusTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                '-mb-px border-b-2 px-2 py-1.5 text-[13px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'border-signal-cyan text-white' : 'border-transparent text-white/55 hover:text-white/80',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">{label}</dt>
            <dd className="text-right font-medium text-white/85">{children}</dd>
        </div>
    );
}

/**
 * Color-coded risk read-out from the NASA/JPL hazard flag + distance. We are careful NOT to imply
 * impact: a "potentially hazardous" object is just one big & close enough to be monitored. The copy
 * stays factual and reassuring.
 */
function riskAssessment(a: UnifiedApproach, en: boolean): { icon: string; title: string; subtitle: string; className: string } {
    if (a.hazardFlag) {
        return {
            icon: '⚠️',
            title: en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL',
            subtitle: en ? 'Classified “potentially hazardous” — watched, not on impact course.' : 'Classificado “potencialmente perigoso” — vigiado, sem rota de impacto.',
            className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
        };
    }
    return {
        icon: '✓',
        title: en ? 'No impact risk' : 'Sem risco de impacto',
        subtitle: en ? 'A routine close pass — not flagged as hazardous.' : 'Passagem próxima rotineira — não sinalizado como perigoso.',
        className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    };
}

/**
 * A plain-language, one-paragraph summary built from the numbers we already have — no external
 * source needed. Makes the object feel concrete: size, how close, how fast, where it's heading.
 */
function humanSummary(object: ClosestNowObject, en: boolean): string {
    const a = object.approach;
    const d = a.diameterMeters ?? a.estimatedDiameterMaxMeters;
    const sizePt = d ? `de cerca de ${Math.round(d)} metros` : 'de tamanho ainda incerto';
    const sizeEn = d ? `about ${Math.round(d)} meters across` : 'of still-uncertain size';
    const ld = object.currentDistanceLD;
    const distPt = ld !== null ? `a ${ld.toFixed(1)} distâncias lunares da Terra` : 'a uma distância em apuração';
    const distEn = ld !== null ? `${ld.toFixed(1)} lunar distances from Earth` : 'at a distance being refined';
    const vel = a.relativeVelocityKph;
    const velPt = vel !== null ? `, viajando a ${new Intl.NumberFormat('pt-BR').format(Math.round(vel))} km/h` : '';
    const velEn = vel !== null ? `, traveling at ${new Intl.NumberFormat('en').format(Math.round(vel))} km/h` : '';
    const motionPt = object.trajectory?.motionState === 'approaching' ? ' Está se aproximando agora.'
        : object.trajectory?.motionState === 'receding' ? ' Já está se afastando.'
        : object.trajectory?.motionState === 'near_closest' ? ' Está perto da máxima aproximação.' : '';
    const motionEn = object.trajectory?.motionState === 'approaching' ? ' It is approaching now.'
        : object.trajectory?.motionState === 'receding' ? ' It is already receding.'
        : object.trajectory?.motionState === 'near_closest' ? ' It is near its closest approach.' : '';
    const safePt = a.hazardFlag ? ' É monitorado, mas não está em rota de impacto.' : ' Não representa risco de impacto.';
    const safeEn = a.hazardFlag ? ' It is monitored, but not on an impact course.' : ' It poses no impact risk.';

    return en
        ? `A rock ${sizeEn}, currently ${distEn}${velEn}.${motionEn}${safeEn}`
        : `Uma rocha ${sizePt}, atualmente ${distPt}${velPt}.${motionPt}${safePt}`;
}

/** A relatable size comparison for a diameter in meters. */
function sizeComparison(meters: number | null, en: boolean): string {
    if (!meters) return '—';
    if (meters < 25) return en ? 'a house' : 'uma casa';
    if (meters < 60) return en ? 'a basketball court' : 'uma quadra de basquete';
    if (meters < 120) return en ? 'a football pitch' : 'um campo de futebol';
    if (meters < 250) return en ? 'a city block' : 'um quarteirão';
    if (meters < 500) return en ? 'a cruise ship' : 'um navio de cruzeiro';
    if (meters < 1000) return en ? 'a small mountain' : 'uma pequena montanha';
    return en ? 'larger than a kilometer' : 'maior que um quilômetro';
}

function motionLabel(
    state: AsteroidTrajectory['motionState'] | undefined,
    en: boolean,
): { text: string; className: string } | null {
    switch (state) {
        case 'approaching':
            return { text: en ? 'Approaching' : 'Aproximando', className: 'text-amber-200' };
        case 'receding':
            return { text: en ? 'Receding' : 'Afastando', className: 'text-emerald-200' };
        case 'near_closest':
            return { text: en ? 'Near closest approach' : 'Perto da máxima aproximação', className: 'text-sky-200' };
        default:
            return null;
    }
}

