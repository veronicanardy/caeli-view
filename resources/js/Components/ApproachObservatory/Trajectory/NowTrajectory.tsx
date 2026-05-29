import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory } from '@/types';
import { compactKm } from '@/lib/format';
import { formatTimestamp } from '@/lib/observatory/format';
import type { Palette } from '@/lib/observatory/palette';
import { clipPolylineByLength, collectTimeTicks, findClosestApproachPoint, toVec3 } from '@/lib/observatory/trajectorySampling';
import { FocusProtectedHtml } from '../Overlays/SceneLabels';
// --------------- Trajectory ---------------

type NowTrajectoryProps = {
    trajectory: AsteroidTrajectory;
    palette: Palette;
    emphasized: boolean;
    dimmed: boolean;
    locale: 'pt-BR' | 'en';
    /** Quando true, renderiza apenas o cone de direção — sem linhas de trajetória.
     *  Usado com 15/30 objetos para indicar direção sem poluir a cena. */
    coneOnly?: boolean;
};

export function NowTrajectory({ trajectory, palette, emphasized, dimmed, locale, coneOnly = false }: NowTrajectoryProps) {
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
            {/* coneOnly: só o cone de direção, sem linhas. Usado com 15/30 objetos. */}
            {!coneOnly && fullPast.length >= 2 ? (
                <DashedLeadLine points={fullPast} color={palette.past} opacity={pastDotOpacity} dashSize={0.055} gapSize={0.13} />
            ) : null}

            {!coneOnly && fullFuture.length >= 2 ? (
                <DashedLeadLine points={fullFuture} color={palette.future} opacity={futureDotOpacity} dashSize={0.075} gapSize={0.12} />
            ) : null}

            {endArrow ? (
                <ElegantEndArrow tip={endArrow.tip} direction={endArrow.direction} color={palette.future} opacity={coneOpacity} />
            ) : null}

            {!coneOnly && emphasized
                ? timeTicks.map((tick) => (
                      <TimeTick key={tick.label} vec={tick.vec} label={tick.label} color={palette.future} />
                  ))
                : null}

            {!coneOnly && closestApproach && (emphasized || closestApproachOnPath) ? (
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
