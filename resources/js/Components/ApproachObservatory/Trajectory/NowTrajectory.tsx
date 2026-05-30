import { useMemo } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory } from '@/types';
import { compactKm } from '@/lib/format';
import { formatTimestamp } from '@/lib/observatory/format';
import type { Palette } from '@/lib/observatory/palette';
import { clipPolylineByLength, collectTimeTicks, findClosestApproachPoint, toVec3, type EarthHelioAU } from '@/lib/observatory/trajectorySampling';
import { FocusProtectedHtml } from '../Overlays/SceneLabels';
// --------------- Trajectory ---------------

type NowTrajectoryProps = {
    trajectory: AsteroidTrajectory;
    palette: Palette;
    emphasized: boolean;
    dimmed: boolean;
    locale: 'pt-BR' | 'en';
    earthHelioAU: EarthHelioAU;
    /** Quando true, renderiza apenas o cone de direção — sem linhas de trajetória.
     *  Usado com 15/30 objetos para indicar direção sem poluir a cena. */
    coneOnly?: boolean;
};

export function NowTrajectory({ trajectory, palette, emphasized, dimmed, locale, earthHelioAU, coneOnly = false }: NowTrajectoryProps) {
    const pastVecs = useMemo(
        () => (trajectory.pastPoints ?? []).map((p) => toVec3(p, earthHelioAU)),
        [trajectory.pastPoints, earthHelioAU],
    );
    const futureVecs = useMemo(
        () => (trajectory.futurePoints ?? []).map((p) => toVec3(p, earthHelioAU)),
        [trajectory.futurePoints, earthHelioAU],
    );
    const currentVec = useMemo(
        () => (trajectory.currentPoint ? toVec3(trajectory.currentPoint, earthHelioAU) : null),
        [trajectory.currentPoint, earthHelioAU],
    );

    const closestApproach = useMemo(() => findClosestApproachPoint(trajectory, earthHelioAU), [trajectory, earthHelioAU]);

    // Line reaches further for selected objects; non-selected get a shorter but still visible arc.
    // Both clip the same underlying Catmull-Rom curve so selecting just extends what's already drawn.
    const PAST_REACH_SELECTED = 3.5;
    const FUTURE_REACH_SELECTED = 4.5;
    const PAST_REACH_OTHER = 1.8;
    const FUTURE_REACH_OTHER = 2.2;

    const pastReach  = emphasized ? PAST_REACH_SELECTED  : PAST_REACH_OTHER;
    const futureReach = emphasized ? FUTURE_REACH_SELECTED : FUTURE_REACH_OTHER;

    const fullPast = useMemo(() => {
        const joined = currentVec && pastVecs.length > 0 ? [...pastVecs, currentVec] : pastVecs;
        return clipPolylineByLength([...joined].reverse(), pastReach).reverse();
    }, [pastVecs, currentVec, pastReach]);

    const fullFuture = useMemo(() => {
        const joined = currentVec && futureVecs.length > 0 ? [currentVec, ...futureVecs] : futureVecs;
        return clipPolylineByLength(joined, futureReach);
    }, [futureVecs, currentVec, futureReach]);

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
            // Velocity is in ecliptic (x,y,z); scene axes: x→x, z→y, −y→z. Magnitude is irrelevant
            // (we normalize), so no unit conversion needed — only the direction matters.
            const v = new THREE.Vector3(cp.vx, cp.vz ?? 0, -(cp.vy ?? 0));
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
        return collectTimeTicks(trajectory, earthHelioAU).filter((tick) =>
            drawn.some((p) => p.distanceToSquared(tick.vec) < 0.35 * 0.35),
        );
    }, [emphasized, trajectory, fullPast, fullFuture]);

    // Peak opacity at the rock end of each segment. Dimmed state (another object selected) pulls
    // everything back so the selected arc clearly wins. Non-selected objects stay readable but quiet.
    const pastPeakOpacity   = emphasized ? 0.55 : dimmed ? 0.12 : 0.32;
    const futurePeakOpacity = emphasized ? 0.75 : dimmed ? 0.18 : 0.45;
    const coneOpacity = emphasized ? 0.95 : dimmed ? 0.5 : 0.85;

    return (
        <group>
            {/* coneOnly: só o cone de direção, sem linhas. Usado com 15/30 objetos. */}
            {!coneOnly && fullPast.length >= 2 ? (
                <GradientLine
                    points={fullPast}
                    color={palette.past}
                    peakOpacity={pastPeakOpacity}
                    peakAtEnd
                />
            ) : null}

            {!coneOnly && fullFuture.length >= 2 ? (
                <GradientLine
                    points={fullFuture}
                    color={palette.future}
                    peakOpacity={futurePeakOpacity}
                    peakAtEnd={false}
                />
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
 * Solid polyline with a linear opacity gradient along its length.
 * `peakAtEnd = true`  → fades in from 0 at start to peakOpacity at the last point (past trail,
 *                        anchored at the rock).
 * `peakAtEnd = false` → peakOpacity at the first point fading out to 0 (future trail, leaving rock).
 *
 * Achieved with per-vertex colors (rgba via vertexColors) on a Catmull-Rom resampled curve so the
 * sparse Horizons samples read as a smooth arc rather than jagged elbows.
 */
function GradientLine({
    points,
    color,
    peakOpacity,
    peakAtEnd,
}: {
    points: THREE.Vector3[];
    color: string;
    peakOpacity: number;
    peakAtEnd: boolean;
}) {
    const { positions, colors } = useMemo(() => {
        const base = new THREE.Color(color);
        const sampled = points.length >= 3
            ? new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
                .getPoints(Math.min(180, Math.max(40, points.length * 20)))
            : points;
        const n = sampled.length;
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 4); // rgba per vertex
        for (let i = 0; i < n; i++) {
            const v = sampled[i];
            pos[i * 3]     = v.x;
            pos[i * 3 + 1] = v.y;
            pos[i * 3 + 2] = v.z;
            // t=0 → tip away from rock, t=1 → near rock
            const t = peakAtEnd ? i / (n - 1) : 1 - i / (n - 1);
            // Ease-in so the fade starts slow and punches up near the rock
            const alpha = peakOpacity * (t * t);
            col[i * 4]     = base.r;
            col[i * 4 + 1] = base.g;
            col[i * 4 + 2] = base.b;
            col[i * 4 + 3] = alpha;
        }
        return { positions: pos, colors: col };
    }, [points, color, peakOpacity, peakAtEnd]);

    const count = positions.length / 3;

    return (
        <line key={count}>
            <bufferGeometry attach="geometry">
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 4]} />
            </bufferGeometry>
            <lineBasicMaterial vertexColors transparent depthWrite={false} />
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
