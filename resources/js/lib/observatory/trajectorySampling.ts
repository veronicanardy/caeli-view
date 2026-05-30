/**
 * Pure helpers for sampling and clipping geocentric trajectories before they are handed to the
 * scene. Everything here operates on plain data + THREE.Vector3 — no R3F, no React.
 */

import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, TrajectoryPoint } from '@/types';
import { KM_PER_LD } from '@/lib/sceneEphemeris';
import { horizonsToScene } from './coordinates';

export type EarthHelioAU = { x: number; y: number; z: number };

/** Snap threshold (scene units) used by closestApproachNearPosition. */
export const CLOSEST_APPROACH_MERGE_DISTANCE_SCENE = 0.45;

// NEOs can be at most ~5 AU geocentric (e.g. Eros aphelion ~1.78 AU + Earth ~1 AU ≈ 2.8 AU).
// Beyond 750 M km the Horizons vector is almost certainly wrong (barycentre mis-centring or
// unit confusion), so we discard it rather than placing the object at a nonsensical position.
const MAX_GEOCENTRIC_KM = 750_000_000;

export function currentPositionInScene(object: ClosestNowObject): [number, number, number] | null {
    const point = object.trajectory?.currentPoint;
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return null;
    const distKm = Math.hypot(point.x, point.y, point.z ?? 0);
    if (distKm > MAX_GEOCENTRIC_KM) return null;
    return horizonsToScene(point.x, point.y, point.z ?? 0);
}

export function toVec3(point: { x: number; y: number; z?: number | null }): THREE.Vector3 {
    const [x, y, z] = horizonsToScene(point.x, point.y, point.z ?? 0);
    return new THREE.Vector3(x, y, z);
}

/**
 * Walks a polyline from its FIRST point and keeps points until the accumulated length reaches
 * `maxLengthDL`, inserting a final interpolated point exactly at that length. Used to clip the
 * visible trajectory to a readable span around "now" without distorting its shape — the kept
 * portion is the true path, just shorter. Returns at least the first two points when available.
 */
export function clipPolylineByLength(points: THREE.Vector3[], maxLengthDL: number): THREE.Vector3[] {
    if (points.length <= 1) return points;
    const kept: THREE.Vector3[] = [points[0]];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
        const seg = points[i].clone().sub(points[i - 1]);
        const segLen = seg.length();
        if (segLen < 1e-9) continue;
        if (total + segLen <= maxLengthDL) {
            kept.push(points[i]);
            total += segLen;
            continue;
        }
        const remaining = maxLengthDL - total;
        kept.push(points[i - 1].clone().add(seg.multiplyScalar(remaining / segLen)));
        break;
    }
    return kept;
}

export type ClosestApproachSample = {
    vec: THREE.Vector3;
    distanceKm: number;
    distanceLD: number | null;
    timestamp: string;
};

export function findClosestApproachPoint(trajectory: AsteroidTrajectory): ClosestApproachSample | null {
    const candidates: TrajectoryPoint[] = [
        ...(trajectory.pastPoints ?? []),
        ...(trajectory.futurePoints ?? []),
    ];
    if (trajectory.currentPoint) candidates.push(trajectory.currentPoint);
    if (candidates.length === 0) return null;

    let best: TrajectoryPoint | null = null;
    let bestKm = Number.POSITIVE_INFINITY;
    for (const point of candidates) {
        const km = typeof point.distanceKm === 'number'
            ? point.distanceKm
            : Math.sqrt(point.x ** 2 + point.y ** 2 + (point.z ?? 0) ** 2);
        if (km < bestKm) {
            bestKm = km;
            best = point;
        }
    }
    if (!best) return null;

    return {
        vec: toVec3(best),
        distanceKm: bestKm,
        distanceLD: typeof best.distanceLunar === 'number' ? best.distanceLunar : bestKm / KM_PER_LD,
        timestamp: best.timestamp,
    };
}

export function closestApproachNearPosition(
    trajectory: AsteroidTrajectory | null | undefined,
    position: THREE.Vector3 | null,
): ClosestApproachSample | null {
    if (!trajectory || !position) return null;
    const closest = findClosestApproachPoint(trajectory);
    if (!closest) return null;

    return closest.vec.distanceToSquared(position) <= CLOSEST_APPROACH_MERGE_DISTANCE_SCENE * CLOSEST_APPROACH_MERGE_DISTANCE_SCENE
        ? closest
        : null;
}

/**
 * Picks the trajectory samples closest to now-24h, now+24h and now+72h and returns their scene
 * positions + short labels. "now" is the currentPoint's timestamp (the instant Horizons anchored
 * the trajectory to). Only ticks with a real sample within ~6h of the target time are emitted.
 */
export function collectTimeTicks(trajectory: AsteroidTrajectory): Array<{ vec: THREE.Vector3; label: string }> {
    const now = trajectory.currentPoint?.timestamp ? new Date(trajectory.currentPoint.timestamp).getTime() : NaN;
    if (Number.isNaN(now)) return [];

    const all: TrajectoryPoint[] = [
        ...(trajectory.pastPoints ?? []),
        ...(trajectory.currentPoint ? [trajectory.currentPoint] : []),
        ...(trajectory.futurePoints ?? []),
    ];
    if (all.length === 0) return [];

    const HOUR = 3_600_000;
    const targets: Array<{ deltaH: number; label: string }> = [
        { deltaH: -24, label: '−24h' },
        { deltaH: 24, label: '+24h' },
        { deltaH: 72, label: '+72h' },
    ];

    const ticks: Array<{ vec: THREE.Vector3; label: string }> = [];
    for (const { deltaH, label } of targets) {
        const targetTime = now + deltaH * HOUR;
        let best: TrajectoryPoint | null = null;
        let bestDelta = Number.POSITIVE_INFINITY;
        for (const point of all) {
            const stamp = new Date(point.timestamp).getTime();
            if (Number.isNaN(stamp)) continue;
            const delta = Math.abs(stamp - targetTime);
            if (delta < bestDelta) { bestDelta = delta; best = point; }
        }
        // Only show the tick if we actually have a sample within 6h of the target.
        if (best && bestDelta <= 6 * HOUR) {
            ticks.push({ vec: toVec3(best), label });
        }
    }
    return ticks;
}
