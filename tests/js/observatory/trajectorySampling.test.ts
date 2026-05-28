import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, TrajectoryPoint } from '@/types';
import {
    CLOSEST_APPROACH_MERGE_DISTANCE_SCENE,
    clipPolylineByLength,
    closestApproachNearPosition,
    collectTimeTicks,
    currentPositionInScene,
    findClosestApproachPoint,
} from '@/lib/observatory/trajectorySampling';
import { KM_PER_LD } from '@/lib/sceneEphemeris';

function makePoint(over: Partial<TrajectoryPoint> = {}): TrajectoryPoint {
    return {
        timestamp: '2026-05-28T12:00:00Z',
        x: 0,
        y: 0,
        z: 0,
        vx: null,
        vy: null,
        vz: null,
        rangeKm: null,
        rangeRateKmS: null,
        distanceKm: 0,
        distanceLunar: 0,
        ...over,
    };
}

function makeTrajectory(over: Partial<AsteroidTrajectory> = {}): AsteroidTrajectory {
    return {
        objectId: 'test',
        objectName: 'Test',
        source: 'JPL Horizons',
        center: 'Earth',
        projection: '2D simplified',
        closestApproachTime: null,
        points: [],
        pastPoints: [],
        futurePoints: [],
        currentPoint: null,
        currentDistanceKm: null,
        currentDistanceLD: null,
        referencePoint: null,
        motionState: 'unknown',
        orbitalElements: null,
        status: 'available',
        note: null,
        anchor: 'now',
        anchorTime: '2026-05-28T12:00:00Z',
        ...over,
    } as AsteroidTrajectory;
}

describe('clipPolylineByLength', () => {
    it('returns the input unchanged when no clipping is needed', () => {
        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 0, 0)];
        const kept = clipPolylineByLength(pts, 10);
        expect(kept).toHaveLength(3);
        expect(kept[2].x).toBeCloseTo(2, 9);
    });

    it('returns at least the first point when the polyline is a single point', () => {
        const pts = [new THREE.Vector3(0, 0, 0)];
        const kept = clipPolylineByLength(pts, 5);
        expect(kept).toHaveLength(1);
    });

    it('inserts an interpolated endpoint exactly at the requested length', () => {
        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)];
        const kept = clipPolylineByLength(pts, 3);
        expect(kept).toHaveLength(2);
        expect(kept[1].x).toBeCloseTo(3, 9);
        expect(kept[1].y).toBeCloseTo(0, 9);
        expect(kept[1].z).toBeCloseTo(0, 9);
    });

    it('skips zero-length segments without going into an infinite loop', () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0), // duplicate
            new THREE.Vector3(2, 0, 0),
        ];
        const kept = clipPolylineByLength(pts, 5);
        expect(kept.at(-1)?.x).toBeCloseTo(2, 9);
    });
});

describe('currentPositionInScene', () => {
    it('returns null when no current point is present', () => {
        const object = { trajectory: makeTrajectory({ currentPoint: null }) } as unknown as ClosestNowObject;
        expect(currentPositionInScene(object)).toBeNull();
    });

    it('returns null when the current point has missing coordinates', () => {
        const object = { trajectory: makeTrajectory({ currentPoint: { ...makePoint(), x: null as unknown as number } }) } as unknown as ClosestNowObject;
        expect(currentPositionInScene(object)).toBeNull();
    });

    it('returns a 3-tuple when the current point has valid coordinates', () => {
        const object = {
            trajectory: makeTrajectory({
                currentPoint: makePoint({ x: KM_PER_LD, y: 0, z: 0 }),
            }),
        } as unknown as ClosestNowObject;
        const pos = currentPositionInScene(object);
        expect(pos).not.toBeNull();
        expect(pos![0]).toBeCloseTo(1, 9);
    });
});

describe('findClosestApproachPoint', () => {
    it('returns null when the trajectory has no points', () => {
        expect(findClosestApproachPoint(makeTrajectory())).toBeNull();
    });

    it('finds the minimum across past + current + future', () => {
        const trajectory = makeTrajectory({
            pastPoints: [makePoint({ distanceKm: 5e6, timestamp: '2026-05-27T00:00:00Z' })],
            currentPoint: makePoint({ distanceKm: 1e6, timestamp: '2026-05-28T12:00:00Z' }),
            futurePoints: [makePoint({ distanceKm: 3e6, timestamp: '2026-05-29T00:00:00Z' })],
        });
        const best = findClosestApproachPoint(trajectory);
        expect(best).not.toBeNull();
        expect(best!.distanceKm).toBeCloseTo(1e6, 6);
        expect(best!.timestamp).toBe('2026-05-28T12:00:00Z');
    });

    it('falls back to Euclidean norm when distanceKm is missing', () => {
        const trajectory = makeTrajectory({
            pastPoints: [makePoint({ x: 3, y: 4, z: 0, distanceKm: undefined as unknown as number })],
        });
        const best = findClosestApproachPoint(trajectory);
        expect(best!.distanceKm).toBeCloseTo(5, 9);
    });
});

describe('closestApproachNearPosition', () => {
    it('returns null when trajectory is missing', () => {
        expect(closestApproachNearPosition(null, new THREE.Vector3())).toBeNull();
    });

    it('returns null when position is missing', () => {
        expect(closestApproachNearPosition(makeTrajectory(), null)).toBeNull();
    });

    it('returns the closest sample only when within the snap threshold', () => {
        const trajectory = makeTrajectory({
            currentPoint: makePoint({ x: 0, y: 0, z: 0, distanceKm: 1 }),
        });
        // Position at origin → scene vector for (0,0,0) input is also origin → distance 0 < threshold.
        expect(closestApproachNearPosition(trajectory, new THREE.Vector3(0, 0, 0))).not.toBeNull();
        // Position far away → returns null.
        const farAway = new THREE.Vector3(CLOSEST_APPROACH_MERGE_DISTANCE_SCENE * 2, 0, 0);
        expect(closestApproachNearPosition(trajectory, farAway)).toBeNull();
    });
});

describe('collectTimeTicks', () => {
    it('returns empty when there is no anchor time on currentPoint', () => {
        expect(collectTimeTicks(makeTrajectory())).toEqual([]);
    });

    it('returns ticks for samples within 6h of the −24h/+24h/+72h targets', () => {
        const HOUR = 3_600_000;
        const now = new Date('2026-05-28T12:00:00Z').getTime();
        const at = (offsetHours: number) => new Date(now + offsetHours * HOUR).toISOString();

        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: at(0) }),
            pastPoints: [makePoint({ timestamp: at(-24) })],
            futurePoints: [makePoint({ timestamp: at(24) }), makePoint({ timestamp: at(72) })],
        });

        const ticks = collectTimeTicks(trajectory);
        expect(ticks.map((t) => t.label)).toEqual(['−24h', '+24h', '+72h']);
    });

    it('skips ticks when no sample is within 6h of the target', () => {
        const HOUR = 3_600_000;
        const now = new Date('2026-05-28T12:00:00Z').getTime();
        const at = (offsetHours: number) => new Date(now + offsetHours * HOUR).toISOString();

        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: at(0) }),
            // Only an explicit "now" sample, no neighbours. None of the target ticks should appear.
            pastPoints: [],
            futurePoints: [],
        });
        // The currentPoint itself is included in `all`, but it's 24h+ away from every target.
        const ticks = collectTimeTicks(trajectory);
        expect(ticks).toEqual([]);
    });
});
