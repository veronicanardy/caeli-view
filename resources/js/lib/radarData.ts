import { HorizonsFailureKind, HorizonsPositionResult, UnifiedApproach } from '@/types';
import { LUNAR_DISTANCE_KM, lunarDistanceFromKm } from '@/lib/format';

export type RadarClassification = 'within-lunar' | 'near-moon' | 'beyond-moon' | 'far';

export type RadarObject = {
    approach: UnifiedApproach;

    distanceKm: number | null;
    distanceLD: number | null;
    classification: RadarClassification;

    closestApproachTime: string | null;
    relativeVelocityKph: number | null;
    diameterMeters: number | null;

    hasHorizonsPosition: boolean;
    isSymbolicFallback: boolean;
    positionKind: 'horizons_current' | 'symbolic_distance_only';

    /** Velocity components (km/s) in the ecliptic XY frame. Null when no Horizons data. */
    velocityKmS: { vx: number; vy: number } | null;
    /** Geocentric ecliptic coordinates (km) of the object plus the 3D range distance.
     *  The layout projects the marker via cylindrical-radar: angle from atan2(y, x), radius
     *  from distanceKm (3D), so an inclined-orbit asteroid lands at the right DL ring. */
    horizonsXY: { x: number; y: number; z: number | null; distanceKm: number | null } | null;

    positionSource: HorizonsPositionResult['positionSource'];
    distanceSource: HorizonsPositionResult['distanceSource'];
    failureReason: HorizonsPositionResult['failureReason'];
    horizonsFailureKind: HorizonsFailureKind | null;

    currentPositionTime: string | null;

    note: string | null;
};

export function classifyDistance(distanceLD: number | null): RadarClassification {
    if (distanceLD === null || !Number.isFinite(distanceLD)) {
        return 'far';
    }
    if (distanceLD < 1) return 'within-lunar';
    if (distanceLD <= 2) return 'near-moon';
    if (distanceLD <= 20) return 'beyond-moon';
    return 'far';
}

export function bestDistanceKm(approach: UnifiedApproach, position?: HorizonsPositionResult): number | null {
    if (position?.closestApproachDistanceKm !== undefined && position?.closestApproachDistanceKm !== null) {
        return position.closestApproachDistanceKm;
    }
    return approach.nominalDistanceKm;
}

export function bestDistanceLD(approach: UnifiedApproach, position?: HorizonsPositionResult): number | null {
    if (position?.closestApproachDistanceLD !== undefined && position?.closestApproachDistanceLD !== null) {
        return position.closestApproachDistanceLD;
    }
    const km = approach.nominalDistanceKm;
    return km !== null ? km / LUNAR_DISTANCE_KM : (approach.lunarDistance ?? lunarDistanceFromKm(km));
}

export function diameterMeters(approach: UnifiedApproach): number | null {
    if (approach.diameterMeters !== null) return approach.diameterMeters;
    const min = approach.estimatedDiameterMinMeters;
    const max = approach.estimatedDiameterMaxMeters;
    if (min !== null && max !== null) return (min + max) / 2;
    return min ?? max ?? null;
}

export function buildRadarObjects(
    approaches: UnifiedApproach[],
    positionsById: Record<string, HorizonsPositionResult>,
): RadarObject[] {
    return approaches.map((approach) => {
        const pos = positionsById[approach.id];
        const hasHorizons = pos?.status === 'available' && pos?.x !== null && pos?.y !== null;

        const distanceKm = bestDistanceKm(approach, pos);
        const distanceLD = bestDistanceLD(approach, pos);
        const classification = classifyDistance(distanceLD);

        let velocityKmS: { vx: number; vy: number } | null = null;
        let horizonsXY: { x: number; y: number; z: number | null; distanceKm: number | null } | null = null;

        if (hasHorizons && pos) {
            horizonsXY = {
                x: pos.x as number,
                y: pos.y as number,
                z: typeof pos.z === 'number' ? pos.z : null,
                distanceKm: pos.closestApproachDistanceKm ?? null,
            };
            if (pos.vx !== null && pos.vy !== null && (pos.vx !== 0 || pos.vy !== 0)) {
                velocityKmS = { vx: pos.vx as number, vy: pos.vy as number };
            }
        }

        return {
            approach,
            distanceKm,
            distanceLD,
            classification,
            closestApproachTime: pos?.closestApproachTime ?? approach.approachDate ?? null,
            relativeVelocityKph: approach.relativeVelocityKph,
            diameterMeters: diameterMeters(approach),
            hasHorizonsPosition: hasHorizons,
            isSymbolicFallback: !hasHorizons,
            positionKind: hasHorizons ? 'horizons_current' : 'symbolic_distance_only',
            velocityKmS,
            horizonsXY,
            positionSource: pos?.positionSource ?? 'unavailable',
            distanceSource: pos?.distanceSource ?? 'fallback',
            failureReason: pos?.failureReason ?? null,
            horizonsFailureKind: pos?.horizonsFailureKind ?? null,
            currentPositionTime: pos?.currentPositionTime ?? null,
            note: pos?.note ?? null,
        };
    });
}

export function radarQualityCounts(objects: RadarObject[]) {
    let withHorizons = 0;
    let symbolic = 0;
    let withinLunar = 0;
    for (const object of objects) {
        if (object.hasHorizonsPosition) withHorizons += 1;
        else symbolic += 1;
        if (object.classification === 'within-lunar') withinLunar += 1;
    }
    return { total: objects.length, withHorizons, symbolic, withinLunar };
}
