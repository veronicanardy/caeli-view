import { scaleLinear, scaleLog, ScaleLinear } from 'd3-scale';
import { forceCollide, forceSimulation, forceY, SimulationNodeDatum } from 'd3-force';

import type { HorizonsReferenceMode, SunDirection, UnifiedApproach } from '@/types';
import type { RadarObject } from '@/lib/radarData';

// ------------------------------------------------------------
// Public types
// ------------------------------------------------------------

export type RadarLayoutInput = {
    width: number;
    height: number;
    mode: HorizonsReferenceMode;
    zoom: number;
    objects: RadarObject[];
    selectedId: string | null;
    sun: SunDirection | null;
    ringsLD: number[];
    closestApproachTrajectory: TrajectoryInput | null;
    /** When provided, each object's real past/present/future trajectory is drawn instead of
     * the synthetic ±30min tangent vector. Used by the "5 closest now" mode. */
    nowTrajectories?: NowTrajectoryInput[];
};

export type TrajectoryPointKm = { x: number; y: number; z?: number | null; distanceKm?: number; timestamp: string };

export type TrajectoryInput = {
    objectId: string;
    /** Points already in ecliptic XY (km). Y axis grows toward ecliptic north pole, like JPL Horizons. */
    points: TrajectoryPointKm[];
    closestApproachTime: string | null;
};

export type NowTrajectoryInput = {
    objectId: string;
    /** Points strictly before "now" — drawn as a faint dashed polyline. Chronological order. */
    past: TrajectoryPointKm[];
    /** Points strictly after "now" — drawn as a solid polyline ending in an arrow. */
    future: TrajectoryPointKm[];
    /** Current point (closest sample to now). Used as the highlighted dot and as the arrow start. */
    current: TrajectoryPointKm | null;
};

export type LayoutCenter = { x: number; y: number };

export type LayoutEarth = { x: number; y: number; radiusPx: number };

export type LayoutMoon = {
    x: number;
    y: number;
    radiusPx: number;
    distanceFromCenterPx: number;
    label: LayoutLabel;
};

export type LayoutRing = {
    ld: number;
    radiusPx: number;
    label: LayoutLabel | null;
    emphasize: boolean;
    /** Visual weight tier — primary (4 main rings), guide (outer references). */
    tier: 'primary' | 'guide';
};

export type LayoutObject = {
    id: string;
    approach: UnifiedApproach;
    x: number;
    y: number;
    radiusPx: number;
    /** Radius (in px) of the orbital ring at this object's distance — used to draw the secondary DL hint ring. */
    orbitRadiusPx: number;
    /** The exact LD value used to draw the secondary ring around this object. Null if no distance. */
    secondaryRingLD: number | null;
    isClosest: boolean;
    isSelected: boolean;
    hasHorizonsPosition: boolean;
    isSymbolicFallback: boolean;
    classification: RadarObject['classification'];
    label: LayoutLabel | null;
    source: RadarObject;
};

export type LayoutVector = {
    objectId: string;
    /** Tail: where the object is coming from. */
    past: { x: number; y: number };
    /** Head: where the object is going. */
    future: { x: number; y: number };
    /** Current point (same as object.x/y but exposed for renderers that want it standalone). */
    current: { x: number; y: number };
    /** How strongly the renderer should draw this. 0..1. Mode-aware. */
    intensity: number;
};

export type LayoutTrajectory = {
    objectId: string;
    pathPx: string;
    closestPoint: { x: number; y: number } | null;
    closestLabel: LayoutLabel | null;
};

export type LayoutNowTrajectory = {
    objectId: string;
    /** SVG path for the past segment (timestamps ≤ now). Drawn faint/dashed. */
    pastPathPx: string | null;
    /** SVG path for the future segment (timestamps > now). Drawn solid, with an arrow at the end. */
    futurePathPx: string | null;
    /** Highlighted "now" dot. */
    currentPoint: { x: number; y: number } | null;
    /** Tip of the arrow pointing from current toward the very next future sample. */
    arrowTip: { x: number; y: number } | null;
};

export type LayoutLabel = {
    id: string;
    text: string;
    x: number;
    y: number;
    /** Anchor for text-anchor SVG attribute. */
    anchor: 'start' | 'middle' | 'end';
    /** Final visibility — false when collision detection hides it. */
    visible: boolean;
    priority: number;
    fontSizePx: number;
    kind: 'ring' | 'ring-guide' | 'moon' | 'object' | 'closest' | 'sun';
};

export type LayoutSun = {
    visible: boolean;
    x: number;
    y: number;
    radiusPx: number;
    opacity: number;
};

export type RadarLayoutResult = {
    center: LayoutCenter;
    canvasRadiusPx: number;
    earth: LayoutEarth;
    moon: LayoutMoon;
    rings: LayoutRing[];
    objects: LayoutObject[];
    vectors: LayoutVector[];
    trajectory: LayoutTrajectory | null;
    /** One real Horizons-derived trajectory per object, segmented past/future around "now".
     * Populated only when the page is in "closest-5-now" mode and supplies trajectories. */
    nowTrajectories: LayoutNowTrajectory[];
    sun: LayoutSun;
    radialScale: ScaleLinear<number, number>;
    /** All labels in render order. Already collision-resolved. */
    labels: LayoutLabel[];
    /** True when the chosen scale visibly compresses radial distance — render a small note. */
    scaleCompressed: boolean;
};

// ------------------------------------------------------------
// Tunables (visual constants, in px or unitless ratios)
// ------------------------------------------------------------

const MIN_VECTOR_LEN_PX = 14;
const MAX_VECTOR_LEN_PX = 64;
const TANGENT_SECONDS = 30 * 60; // ±30 min

// Now-trajectory targets: keeps every object's arrow visually comparable on screen, regardless
// of whether the underlying Horizons window covers a wide arc or a tight one.
const NOW_TRAJ_FUTURE_TARGET_PX = 80;
const NOW_TRAJ_PAST_TARGET_PX = 52;
const NOW_TRAJ_MIN_PX = 20;
const KM_TO_LD = 1 / 384400;

const PRIMARY_RINGS = new Set([0.5, 1, 5, 20]);

const RING_PRIORITY: Record<number, number> = {
    0.5: 80,
    1: 100,
    5: 75,
    20: 70,
    50: 50,
    100: 45,
    150: 100, // outer boundary: same emphasis level as 1 DL
};

// ------------------------------------------------------------
// Main entry
// ------------------------------------------------------------

export function buildRadarLayout(input: RadarLayoutInput): RadarLayoutResult {
    const { width, height, mode, zoom, objects, selectedId, sun, ringsLD, closestApproachTrajectory, nowTrajectories } = input;

    const cx = width / 2;
    const cy = height / 2;
    const safePadding = Math.max(24, Math.min(width, height) * 0.04);
    const canvasRadiusPx = Math.max(60, Math.min(width, height) / 2 - safePadding);

    // The outer ring should reach the canvas edge. Use 150 DL as the visual reference outer
    // boundary; if any object in the scene is farther, push the boundary out to encompass it.
    const dataMaxLD = objects.reduce((acc, o) => Math.max(acc, o.distanceLD ?? 0), 0);
    const referenceMaxLD = Math.max(150, ...ringsLD);
    const outerLD = Math.max(referenceMaxLD, dataMaxLD * 1.05);
    const radialScale = buildRadialScale(outerLD, canvasRadiusPx);

    // Earth: presence-first. Scale generously with the canvas, then cap so the 0.5 DL ring still breathes.
    // The 0.5 DL ring sits at scale(0.5) px from center; we want Earth radius < 0.7 * that.
    const halfLunarPx = radialScale(0.5);
    const earthRadiusPx = Math.max(28, Math.min(canvasRadiusPx * 0.13, halfLunarPx * 0.7));
    const earth: LayoutEarth = { x: cx, y: cy, radiusPx: earthRadiusPx };

    // Moon position: comes from the SAME scale used by the rings — single source of truth.
    const moonRadiusFromCenter = radialScale(1);
    const moonGlyphRadiusPx = Math.max(9, earthRadiusPx * 0.28);
    const moon: LayoutMoon = {
        x: cx + moonRadiusFromCenter,
        y: cy,
        radiusPx: moonGlyphRadiusPx,
        distanceFromCenterPx: moonRadiusFromCenter,
        label: {
            id: 'moon',
            text: '1 DL · Lua',
            x: cx + moonRadiusFromCenter,
            y: cy + moonGlyphRadiusPx + 16,
            anchor: 'middle',
            visible: true,
            priority: 100,
            fontSizePx: 12,
            kind: 'moon',
        },
    };

    const rings = buildRings(ringsLD, radialScale, cx, cy, canvasRadiusPx);
    const layoutObjects = buildObjects(objects, radialScale, cx, cy, selectedId);
    const builtNowTrajectories: LayoutNowTrajectory[] = (nowTrajectories ?? [])
        .map((traj) => buildNowTrajectory(traj, radialScale, cx, cy))
        .filter((traj): traj is LayoutNowTrajectory => traj !== null);
    // Skip the synthetic ±30min tangents whenever we have a real trajectory for the object,
    // so the radar never overlays "fake" arrows on top of "real" ones.
    const idsWithRealTrajectory = new Set(builtNowTrajectories.map((traj) => traj.objectId));
    const vectors = buildVectors(layoutObjects, radialScale, cx, cy, mode)
        .filter((vector) => !idsWithRealTrajectory.has(vector.objectId));
    const trajectory = closestApproachTrajectory
        ? buildTrajectory(closestApproachTrajectory, radialScale, cx, cy, mode)
        : null;
    const sunLayout = buildSun(sun, mode, cx, cy, canvasRadiusPx, zoom);

    // Collect every label and resolve collisions.
    const objectLabels = layoutObjects.map((object) => object.label).filter((label): label is LayoutLabel => label !== null);
    const ringLabels = rings.map((ring) => ring.label).filter((label): label is LayoutLabel => label !== null);
    const trajectoryLabels = trajectory?.closestLabel ? [trajectory.closestLabel] : [];

    const labels = resolveLabelCollisions([
        moon.label,
        ...ringLabels,
        ...objectLabels,
        ...trajectoryLabels,
    ]);

    // Scale is "compressed" whenever the outer band uses the log piece (i.e. any object beyond 5 DL,
    // which is the breakpoint where buildRadialScale switches to log). Also true when objects
    // exceed the 150 DL reference and we widen the outer band.
    const scaleCompressed = objects.some((o) => (o.distanceLD ?? 0) > 5) || dataMaxLD > 150;

    return {
        center: { x: cx, y: cy },
        canvasRadiusPx,
        earth,
        moon,
        rings,
        objects: layoutObjects,
        vectors,
        trajectory,
        nowTrajectories: builtNowTrajectories,
        sun: sunLayout,
        radialScale,
        labels,
        scaleCompressed,
    };
}


// ------------------------------------------------------------
// Scale — three-piece hybrid: linear · linear · log
// ------------------------------------------------------------

/**
 * Radial scale: distance in LD → radius in px.
 *
 * Three contiguous pieces, each picked to make the resulting map feel honest:
 *
 *  - 0 → 1 LD     : linear. The "inside the Moon" region. Earth + lunar ring need room.
 *  - 1 → 5 LD     : linear, but tighter (smaller slope than 0→1). Vizinhança imediata.
 *                   1 DL and 5 DL must read as clearly different distances.
 *  - 5 → outer LD : log. Compresses 5 → 150+ DL into the remaining ring band so a 91 DL
 *                   object still sits closer to the edge than a 20 DL object, but doesn't
 *                   demand 18× more radius than it.
 *
 * The pieces are joined so the function is continuous at the breakpoints — an object at
 * "exactly 1 DL" and an object at "1.0001 DL" land at essentially the same pixel radius.
 */
function buildRadialScale(outerLD: number, canvasRadiusPx: number): ScaleLinear<number, number> {
    // Keep near-Earth readability, then apply proportional spacing by ratio
    // using a continuous logarithmic progression after 5 DL.
    const earthClearance = canvasRadiusPx * 0.14;
    const lunarRingPx = canvasRadiusPx * 0.33;
    const fiveLDPx = canvasRadiusPx * 0.50;
    const outerPx = canvasRadiusPx * 0.992;

    // Piece 1: 0 -> 1 DL (linear).
    const inner = scaleLinear<number>().domain([0, 1]).range([earthClearance, lunarRingPx]);
    // Piece 2: 1 -> 5 DL (linear transition for local readability).
    const mid = scaleLinear<number>().domain([1, 5]).range([lunarRingPx, fiveLDPx]);
    // Piece 3: 5 -> outer DL (logarithmic, ratio-proportional spacing).
    const farUpper = Math.max(outerLD, 150);
    const far = scaleLog<number>().domain([5, farUpper]).range([fiveLDPx, outerPx]);

    const fn = ((ld: number): number => {
        if (!Number.isFinite(ld) || ld <= 0) return earthClearance;
        if (ld <= 1) return inner(ld);
        if (ld <= 5) return mid(ld);
        if (ld >= farUpper) return outerPx;
        return far(ld);
    }) as ScaleLinear<number, number>;

    fn.domain = (() => [0, farUpper]) as ScaleLinear<number, number>['domain'];
    fn.range = (() => [earthClearance, outerPx]) as ScaleLinear<number, number>['range'];
    fn.copy = (() => fn) as ScaleLinear<number, number>['copy'];
    fn.invert = ((px: number): number => {
        if (px <= lunarRingPx) return inner.invert(px);
        if (px <= fiveLDPx) return mid.invert(px);
        return far.invert(px);
    }) as ScaleLinear<number, number>['invert'];
    return fn;
}

// ------------------------------------------------------------
// Rings
// ------------------------------------------------------------

function buildRings(
    ringsLD: number[],
    scale: ScaleLinear<number, number>,
    cx: number,
    cy: number,
    canvasRadiusPx: number,
): LayoutRing[] {
    return ringsLD
        .filter((ld) => ld > 0)
        .sort((a, b) => a - b)
        .map<LayoutRing>((ld) => {
            const radius = scale(ld);
            const priority = RING_PRIORITY[ld] ?? 30;
            const isPrimary = PRIMARY_RINGS.has(ld);
            const emphasize = ld === 1 || ld === 150;
            const tier: LayoutRing['tier'] = isPrimary ? 'primary' : 'guide';
            // Spread labels around the upper arc (between -120° and -45°) instead of stacking them
            // all on the same diagonal — that's what caused the collision pileups before.
            const labelAngle = labelAngleForRing(ld);
            // Pull guide-tier labels just inside the ring so they don't crowd the bezel.
            const inset = isPrimary ? 0 : Math.max(8, canvasRadiusPx * 0.012);
            const labelRadius = Math.max(0, radius - inset);
            const label: LayoutLabel = {
                id: `ring-${ld}`,
                text: formatRingLabel(ld),
                x: cx + labelRadius * Math.cos(labelAngle),
                y: cy + labelRadius * Math.sin(labelAngle),
                anchor: labelAngle > -Math.PI / 2 ? 'start' : 'end',
                visible: true,
                priority,
                fontSizePx: isPrimary ? (emphasize ? 13 : 12) : 10,
                kind: isPrimary ? 'ring' : 'ring-guide',
            };
            return { ld, radiusPx: radius, label, emphasize, tier };
        });
}

function labelAngleForRing(ld: number): number {
    // Place each ring label at a deliberate angle around the upper hemisphere so they don't
    // pile up on the same diagonal. Angles in radians; 0 is 3 o'clock; negative goes up.
    switch (ld) {
        case 0.5: return -Math.PI * 0.42;   // ~ upper-left of moon
        case 1:   return -Math.PI * 0.55;   // upper
        case 5:   return -Math.PI * 0.68;   // upper-left
        case 20:  return -Math.PI * 0.78;   // farther upper-left
        case 50:  return -Math.PI * 0.87;   // near 9 o'clock-ish, but still upper
        case 100: return -Math.PI * 0.18;   // upper-right (4-5 o'clock above horizon)
        case 150: return -Math.PI * 0.08;   // near 3 o'clock above horizon
        default:  return -Math.PI / 3;
    }
}

function formatRingLabel(ld: number): string {
    if (ld >= 1) return `${ld} DL`;
    return `${ld.toString().replace('.', ',')} DL`;
}

// ------------------------------------------------------------
// Objects
// ------------------------------------------------------------

function buildObjects(
    objects: RadarObject[],
    scale: ScaleLinear<number, number>,
    cx: number,
    cy: number,
    selectedId: string | null,
): LayoutObject[] {
    // Closest of the day by physical distance.
    let closestId: string | null = null;
    {
        let bestKm = Number.POSITIVE_INFINITY;
        for (const o of objects) {
            if (o.distanceKm !== null && o.distanceKm < bestKm) {
                bestKm = o.distanceKm;
                closestId = o.approach.id;
            }
        }
    }

    // Symbolic objects get angles distributed among themselves to avoid stacking.
    const symbolicTotal = objects.filter((o) => !o.hasHorizonsPosition).length;
    let symbolicIndex = 0;

    return objects.map<LayoutObject>((source) => {
        const ld = source.distanceLD ?? null;

        let x: number;
        let y: number;
        let radius: number;

        if (source.hasHorizonsPosition && source.horizonsXY) {
            // Cylindrical-radar projection (shared with the trajectory polylines): radius is the
            // 3D range to Earth, angle is the ecliptic azimuth. Means the marker, the trajectory's
            // current dot, AND the DL ring are all locked together — an object at 60 DL lands on
            // the 60 DL ring even when its ecliptic inclination would compress sqrt(x²+y²).
            const projected = projectKmPoint(source.horizonsXY, scale, cx, cy);
            x = projected.x;
            y = projected.y;
            radius = ld !== null ? scale(ld) : Math.hypot(x - cx, y - cy);
        } else {
            radius = ld !== null ? scale(ld) : scale(0.5);
            // Distribute symbolic angle around the circle but skip the 3-o'clock region (Moon) and 9-o'clock (label gutter).
            const safeStart = Math.PI / 6; // 30°
            const theta = safeStart + ((symbolicIndex + 0.5) / Math.max(1, symbolicTotal)) * (Math.PI * 2);
            symbolicIndex += 1;
            x = cx + Math.cos(theta) * radius;
            // Canvas Y grows downward; ecliptic Y north is up — invert.
            y = cy - Math.sin(theta) * radius;
        }

        const sizePx = sizeForClassification(source.classification, source.isSymbolicFallback);
        const isSelected = source.approach.id === selectedId;
        const isClosest = source.approach.id === closestId;

        return {
            id: source.approach.id,
            approach: source.approach,
            x,
            y,
            radiusPx: sizePx,
            orbitRadiusPx: radius,
            secondaryRingLD: ld,
            isClosest,
            isSelected,
            hasHorizonsPosition: source.hasHorizonsPosition,
            isSymbolicFallback: source.isSymbolicFallback,
            classification: source.classification,
            label: null, // object labels are revealed via marker hover, not as floating SVG text
            source,
        };
    });
}

function sizeForClassification(classification: RadarObject['classification'], symbolic: boolean): number {
    const base = classification === 'within-lunar' ? 17
        : classification === 'near-moon' ? 15
        : classification === 'beyond-moon' ? 13
        : 11;
    return symbolic ? base - 1 : base;
}

// ------------------------------------------------------------
// Vectors (motion tangents)
// ------------------------------------------------------------

function buildVectors(
    objects: LayoutObject[],
    scale: ScaleLinear<number, number>,
    cx: number,
    cy: number,
    mode: HorizonsReferenceMode,
): LayoutVector[] {
    return objects
        .map<LayoutVector | null>((object) => {
            const source = object.source;
            if (!source.hasHorizonsPosition || !source.velocityKmS || !source.horizonsXY) return null;

            const dx = source.velocityKmS.vx * TANGENT_SECONDS;
            const dy = source.velocityKmS.vy * TANGENT_SECONDS;
            const before = { x: source.horizonsXY.x - dx, y: source.horizonsXY.y - dy };
            const after = { x: source.horizonsXY.x + dx, y: source.horizonsXY.y + dy };

            const past = projectKmPoint(before, scale, cx, cy);
            const future = projectKmPoint(after, scale, cx, cy);

            // Enforce visual length bounds. If the tangent is too short or too long, scale it relative to current.
            const adjustedFuture = clampVectorLength({ from: { x: object.x, y: object.y }, to: future });
            const adjustedPast = clampVectorLength({ from: { x: object.x, y: object.y }, to: past });

            return {
                objectId: object.id,
                current: { x: object.x, y: object.y },
                past: adjustedPast,
                future: adjustedFuture,
                intensity: mode === 'current' ? 1 : 0.35,
            };
        })
        .filter((vector): vector is LayoutVector => vector !== null);
}

/**
 * Geocentric "radar" projection: the radius is the REAL 3D range to Earth (sqrt(x²+y²+z²)),
 * the angle is the azimuth in the ecliptic plane (atan2(y, x)). This is a cylindrical-style
 * projection, not an orthographic one — it sacrifices the literal "shadow on the ecliptic"
 * to gain the property a viewer expects from a radar: "the ring at N DL means the object is
 * N DL away from Earth in 3D, period." Without this, an object at 60 DL with high ecliptic
 * inclination would land between the 1 DL and 5 DL rings, which is misleading.
 *
 * Trajectory polylines and per-object markers share this function so they stay locked together.
 */
function projectKmPoint(
    point: { x: number; y: number; z?: number | null; distanceKm?: number | null },
    scale: ScaleLinear<number, number>,
    cx: number,
    cy: number,
): { x: number; y: number } {
    // Prefer the canonical distanceKm Horizons gave us (range), then fall back to sqrt(x²+y²+z²),
    // then to the 2D magnitude as a last resort.
    let distanceKm: number;
    if (typeof point.distanceKm === 'number' && Number.isFinite(point.distanceKm)) {
        distanceKm = point.distanceKm;
    } else if (typeof point.z === 'number' && Number.isFinite(point.z)) {
        distanceKm = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
    } else {
        distanceKm = Math.sqrt(point.x ** 2 + point.y ** 2);
    }
    const ld = distanceKm * KM_TO_LD;
    const radius = scale(ld);
    const theta = Math.atan2(point.y, point.x);
    return { x: cx + Math.cos(theta) * radius, y: cy - Math.sin(theta) * radius };
}

function clampVectorLength(segment: { from: { x: number; y: number }; to: { x: number; y: number } }): { x: number; y: number } {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return segment.from;
    const clamped = Math.min(MAX_VECTOR_LEN_PX, Math.max(MIN_VECTOR_LEN_PX, length));
    const k = clamped / length;
    return { x: segment.from.x + dx * k, y: segment.from.y + dy * k };
}

// ------------------------------------------------------------
// Trajectory (detailed, focused object)
// ------------------------------------------------------------

function buildTrajectory(
    input: TrajectoryInput,
    scale: ScaleLinear<number, number>,
    cx: number,
    cy: number,
    mode: HorizonsReferenceMode,
): LayoutTrajectory | null {
    if (input.points.length < 2) return null;

    const projected = input.points.map((point) => projectKmPoint(point, scale, cx, cy));
    const path = projected
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');

    // Pick the closest-approach point (point nearest the closestApproachTime).
    let closestIndex = -1;
    if (input.closestApproachTime) {
        const target = new Date(input.closestApproachTime).getTime();
        if (!Number.isNaN(target)) {
            let bestDelta = Number.POSITIVE_INFINITY;
            input.points.forEach((point, index) => {
                const stamp = new Date(point.timestamp).getTime();
                if (Number.isNaN(stamp)) return;
                const delta = Math.abs(stamp - target);
                if (delta < bestDelta) { bestDelta = delta; closestIndex = index; }
            });
        }
    }
    if (closestIndex < 0) {
        let bestDistance = Number.POSITIVE_INFINITY;
        input.points.forEach((point, index) => {
            const distance = point.distanceKm ?? Math.hypot(point.x, point.y);
            if (distance < bestDistance) { bestDistance = distance; closestIndex = index; }
        });
    }

    const closestPoint = closestIndex >= 0 ? projected[closestIndex] : null;
    const showLabel = mode === 'closest_approach' && closestPoint !== null;
    const closestLabel: LayoutLabel | null = showLabel && closestPoint !== null ? {
        id: 'trajectory-closest',
        text: 'Máxima aproximação',
        x: closestPoint.x,
        y: closestPoint.y - 20,
        anchor: 'middle',
        visible: true,
        priority: 95,
        fontSizePx: 12,
        kind: 'closest',
    } : null;

    return { objectId: input.objectId, pathPx: path, closestPoint, closestLabel };
}

/**
 * Builds the per-object "now" trajectory: a real past+future polyline derived from JPL Horizons
 * VECTORS. The renderer draws past faint/dashed and future solid, with the arrow tip pointing
 * from the current sample toward the very next future sample (so the heading is data-driven,
 * not synthesized from a ±30min velocity extrapolation).
 */
function buildNowTrajectory(
    input: NowTrajectoryInput,
    scale: ScaleLinear<number, number>,
    cx: number,
    cy: number,
): LayoutNowTrajectory | null {
    const pastProjected = input.past.map((point) => projectKmPoint(point, scale, cx, cy));
    const futureProjected = input.future.map((point) => projectKmPoint(point, scale, cx, cy));

    // We need at least one segment with 2+ points to draw something useful.
    if (pastProjected.length < 2 && futureProjected.length < 2 && !input.current) {
        return null;
    }

    const currentPoint = input.current ? projectKmPoint(input.current, scale, cx, cy) : null;

    // Past: trim to ~NOW_TRAJ_PAST_TARGET_PX walking backward from the most recent sample so
    // every object's "tail" reads at roughly the same visual length.
    const anchorForPast = currentPoint ?? pastProjected[pastProjected.length - 1] ?? null;
    const pastTrimmed = trimSegmentByPxLength(pastProjected, anchorForPast, NOW_TRAJ_PAST_TARGET_PX, 'backward');

    // Future: trim to ~NOW_TRAJ_FUTURE_TARGET_PX walking forward from current.
    const anchorForFuture = currentPoint ?? futureProjected[0] ?? null;
    const futureTrimmed = trimSegmentByPxLength(futureProjected, anchorForFuture, NOW_TRAJ_FUTURE_TARGET_PX, 'forward');

    // Connect past[last] -> current -> future[0] so the polyline doesn't visually break at "now".
    const pastWithBridge = currentPoint && pastTrimmed.length > 0
        ? [...pastTrimmed, currentPoint]
        : pastTrimmed;
    const futureWithBridge = currentPoint && futureTrimmed.length > 0
        ? [currentPoint, ...futureTrimmed]
        : futureTrimmed;

    const pastPathPx = pathFromPoints(pastWithBridge);
    const futurePathPx = pathFromPoints(futureWithBridge);

    // Arrow tip: the first future point ahead of "current". Lets the renderer place a small
    // arrowhead pointing along the direction of motion.
    const arrowTip = futureTrimmed[0] ?? null;

    return {
        objectId: input.objectId,
        pastPathPx,
        futurePathPx,
        currentPoint,
        arrowTip,
    };
}

/**
 * Walks the polyline from `anchor` outward and keeps points until the cumulative pixel length
 * crosses `targetPx`. Then inserts a final synthetic point exactly at `targetPx` along the last
 * segment, so every trajectory ends at a consistent visual length on the canvas — the curve
 * stays real, only the *visible portion* is normalized.
 *
 * `direction`:
 *   - 'forward': walk the array head→tail (used for future points, in chronological order)
 *   - 'backward': walk tail→head (used for past points; we want the freshest few samples)
 *
 * The result is always returned in chronological order.
 */
function trimSegmentByPxLength(
    points: Array<{ x: number; y: number }>,
    anchor: { x: number; y: number } | null,
    targetPx: number,
    direction: 'forward' | 'backward',
): Array<{ x: number; y: number }> {
    if (points.length === 0 || !anchor) return [];

    const ordered = direction === 'forward' ? points : [...points].reverse();
    const kept: Array<{ x: number; y: number }> = [];
    let prev = anchor;
    let total = 0;

    for (const point of ordered) {
        const segLen = Math.hypot(point.x - prev.x, point.y - prev.y);
        if (total + segLen <= targetPx) {
            kept.push(point);
            total += segLen;
            prev = point;
            continue;
        }
        const remaining = targetPx - total;
        if (remaining > NOW_TRAJ_MIN_PX * 0.25) {
            const k = remaining / segLen;
            kept.push({ x: prev.x + (point.x - prev.x) * k, y: prev.y + (point.y - prev.y) * k });
        }
        break;
    }

    // Force at least one visible step so very-slow objects still produce a small tick.
    if (kept.length === 0 && ordered[0]) {
        const point = ordered[0];
        const segLen = Math.hypot(point.x - prev.x, point.y - prev.y);
        if (segLen > 0) {
            const k = Math.min(1, NOW_TRAJ_MIN_PX / segLen);
            kept.push({ x: prev.x + (point.x - prev.x) * k, y: prev.y + (point.y - prev.y) * k });
        }
    }

    return direction === 'forward' ? kept : kept.reverse();
}

/**
 * Builds an SVG path from a list of projected points. Two points → straight line. Three or more
 * → Catmull-Rom-to-Bezier spline, so the curve passes through every point without sharp kinks.
 *
 * Why the spline matters: the cylindrical-radar projection (radius=3D, angle=ecliptic azimuth)
 * loses the Z component. When an object's azimuth shifts faster than its range (typical for
 * close encounters), straight segments between projected points end up looking like sudden
 * direction changes that aren't physically there. A spline smooths those visual artifacts
 * back into something closer to the real curved path through 3D space.
 */
function pathFromPoints(points: Array<{ x: number; y: number }>): string | null {
    if (points.length < 2) return null;
    if (points.length === 2) {
        return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
    }
    return catmullRomToBezier(points);
}

/**
 * Catmull-Rom spline expressed as cubic Bezier segments. Tension 0.5 (centripetal-ish) gives
 * smooth curves without overshoot. The endpoints are mirrored so the curve still hits the
 * first and last points exactly.
 */
function catmullRomToBezier(points: Array<{ x: number; y: number }>): string {
    const n = points.length;
    const parts: string[] = [];
    parts.push(`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`);

    for (let i = 0; i < n - 1; i += 1) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;
        // 1/6 = standard Catmull-Rom-to-Bezier coefficient (uniform parameterization).
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        parts.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
    }

    return parts.join(' ');
}

// ------------------------------------------------------------
// Sun
// ------------------------------------------------------------

function buildSun(sun: SunDirection | null, mode: HorizonsReferenceMode, cx: number, cy: number, canvasRadiusPx: number, zoom: number): LayoutSun {
    if (!sun) return { visible: false, x: 0, y: 0, radiusPx: 0, opacity: 0 };
    const baseOpacity = mode === 'closest_approach' ? 0.6 : 0.4;
    const opacity = Math.min(1, baseOpacity * zoom);
    const radiusFromCenter = canvasRadiusPx * 0.965;
    return {
        visible: true,
        x: cx + sun.x * radiusFromCenter,
        y: cy - sun.y * radiusFromCenter,
        radiusPx: 11,
        opacity,
    };
}

// ------------------------------------------------------------
// Label collision (d3-force)
// ------------------------------------------------------------

type LabelNode = SimulationNodeDatum & {
    id: string;
    label: LayoutLabel;
    originalX: number;
    originalY: number;
};

function resolveLabelCollisions(labels: LayoutLabel[]): LayoutLabel[] {
    if (labels.length <= 1) return labels;

    // Build collision nodes for ring/moon/closest labels — the layout-driven ones prone to overlap.
    const candidates = labels.filter((label) =>
        label.kind === 'ring' || label.kind === 'ring-guide' || label.kind === 'moon' || label.kind === 'closest'
    );
    if (candidates.length <= 1) return labels;

    const nodes: LabelNode[] = candidates.map((label) => ({
        id: label.id,
        label,
        originalX: label.x,
        originalY: label.y,
        x: label.x,
        y: label.y,
    }));

    forceSimulation<LabelNode>(nodes)
        .force('collide', forceCollide<LabelNode>((node) => labelCollisionRadius(node.label)).strength(0.85))
        .force('y', forceY<LabelNode>((node) => node.originalY).strength(0.55))
        .stop()
        .tick(60);

    // Decide visibility: by priority, hide nodes whose center drifted too far AND that overlap a higher-priority one.
    const sortedByPriority = [...nodes].sort((a, b) => b.label.priority - a.label.priority);
    const visibleIds = new Set<string>();
    for (const node of sortedByPriority) {
        const drift = Math.hypot((node.x ?? 0) - node.originalX, (node.y ?? 0) - node.originalY);
        const maxDrift = labelCollisionRadius(node.label) * 1.6;
        if (drift <= maxDrift) {
            visibleIds.add(node.id);
        }
    }

    const adjustments = new Map<string, { x: number; y: number; visible: boolean }>();
    for (const node of nodes) {
        adjustments.set(node.id, {
            x: node.x ?? node.originalX,
            y: node.y ?? node.originalY,
            visible: visibleIds.has(node.id),
        });
    }

    return labels.map((label) => {
        const adjustment = adjustments.get(label.id);
        if (!adjustment) return label;
        return { ...label, x: adjustment.x, y: adjustment.y, visible: adjustment.visible };
    });
}

function labelCollisionRadius(label: LayoutLabel): number {
    const approxWidth = label.text.length * (label.fontSizePx * 0.55);
    return Math.max(label.fontSizePx, approxWidth / 2 + 6);
}

