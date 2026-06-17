import { describe, expect, it } from 'vitest';
import type { AsteroidTrajectory, ClosestNowObject, TrajectoryPoint, UnifiedApproach } from '@/types';
import {
    bestDistanceKm,
    bestDistanceLD,
    buildRadarObjects,
    classifyDistance,
    hasCurrentHorizonsPosition,
    radarQualityCounts,
} from '@/lib/radarData';
import { LUNAR_DISTANCE_KM } from '@/lib/physicalConstants';

/**
 * `radarData` deriva a leitura de QUALIDADE DE DADOS do radar (objeto do momento, vizinhança lunar,
 * cobertura Horizons vs. simbólica) a partir dos objetos do closest-now. Não posiciona nada na cena.
 * Os testes protegem as fronteiras de classificação, a prioridade distância-real > nominal e o
 * comportamento de fallback simbólico — qualquer regressão muda o card de qualidade.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeApproach(over: Partial<UnifiedApproach> = {}): UnifiedApproach {
    return {
        id: 'test-id',
        source: 'cad',
        sourceLabel: 'CAD',
        name: 'Test Asteroid',
        rawName: 'Test Asteroid',
        displayName: null,
        subtitle: null,
        designation: null,
        spkId: null,
        permanentNumber: null,
        properName: null,
        provisionalDesignation: null,
        aliases: [],
        objectType: 'asteroid',
        approachDate: '2026-06-15',
        approachBody: 'Earth',
        nominalDistanceKm: null,
        nominalDistanceMiles: null,
        lunarDistance: null,
        relativeVelocityKph: null,
        relativeVelocityKms: null,
        estimatedDiameterMinMeters: null,
        estimatedDiameterMaxMeters: null,
        diameterMeters: null,
        hazardFlag: false,
        detailIdentifier: 'test-id',
        detailSource: 'cad',
        detailRoute: '/small-bodies/test-id',
        orbitId: null,
        absoluteMagnitude: null,
        distanceContext: {
            kilometers: null,
            miles: null,
            lunarDistance: null,
            lunarReferenceKm: LUNAR_DISTANCE_KM,
            earthDiametersApprox: null,
            proximityBand: 'unknown',
            headline: '',
            comparison: '',
        },
        ...over,
    } as UnifiedApproach;
}

function makeTrajectory(over: Partial<AsteroidTrajectory> = {}): AsteroidTrajectory {
    const currentPoint: TrajectoryPoint = { timestamp: '2026-06-15T00:00:00Z', x: 100_000, y: 200_000, z: 50_000 };
    return {
        objectId: 'test-id',
        objectName: 'Test Asteroid',
        source: 'JPL Horizons',
        center: 'Earth',
        projection: '3D ecliptic J2000',
        closestApproachTime: '2026-06-15T06:00:00Z',
        points: [currentPoint],
        currentPoint,
        status: 'available',
        ...over,
    };
}

/** Monta um ClosestNowObject com (ou sem) trajetória/distância real do Horizons. */
function makeObject(over: Partial<ClosestNowObject> = {}): ClosestNowObject {
    return {
        approach: makeApproach(),
        trajectory: makeTrajectory(),
        currentDistanceKm: 300_000,
        currentDistanceLD: 300_000 / LUNAR_DISTANCE_KM,
        hasRealCurrentDistance: true,
        ...over,
    };
}

/** Objeto simbólico: sem trajetória, só distância nominal na aproximação. */
function makeSymbolicObject(over: Partial<UnifiedApproach> = {}): ClosestNowObject {
    return {
        approach: makeApproach(over),
        trajectory: null,
        currentDistanceKm: null,
        currentDistanceLD: null,
        hasRealCurrentDistance: false,
    };
}

// ─── classifyDistance ─────────────────────────────────────────────────────────

describe('classifyDistance', () => {
    it('retorna "far" para null', () => {
        expect(classifyDistance(null)).toBe('far');
    });

    it('retorna "far" para NaN e Infinity', () => {
        expect(classifyDistance(NaN)).toBe('far');
        expect(classifyDistance(Infinity)).toBe('far');
    });

    it('retorna "within-lunar" para distância < 1 DL', () => {
        expect(classifyDistance(0)).toBe('within-lunar');
        expect(classifyDistance(0.5)).toBe('within-lunar');
        expect(classifyDistance(0.999)).toBe('within-lunar');
    });

    it('retorna "near-moon" exatamente em 1 DL', () => {
        expect(classifyDistance(1)).toBe('near-moon');
    });

    it('retorna "near-moon" entre 1 e 2 DL (inclusive)', () => {
        expect(classifyDistance(1.5)).toBe('near-moon');
        expect(classifyDistance(2)).toBe('near-moon');
    });

    it('retorna "beyond-moon" logo acima de 2 DL até 20 DL', () => {
        expect(classifyDistance(2.001)).toBe('beyond-moon');
        expect(classifyDistance(10)).toBe('beyond-moon');
        expect(classifyDistance(20)).toBe('beyond-moon');
    });

    it('retorna "far" acima de 20 DL', () => {
        expect(classifyDistance(20.001)).toBe('far');
        expect(classifyDistance(100)).toBe('far');
    });
});

// ─── bestDistanceKm ───────────────────────────────────────────────────────────

describe('bestDistanceKm', () => {
    it('prefere a distância atual (Horizons) quando disponível', () => {
        const object = makeObject({ currentDistanceKm: 300_000, approach: makeApproach({ nominalDistanceKm: 500_000 }) });
        expect(bestDistanceKm(object)).toBe(300_000);
    });

    it('cai para nominalDistanceKm quando não há distância atual', () => {
        const object = makeSymbolicObject({ nominalDistanceKm: 500_000 });
        expect(bestDistanceKm(object)).toBe(500_000);
    });

    it('retorna null quando nenhum dado está disponível', () => {
        const object = makeSymbolicObject({ nominalDistanceKm: null });
        expect(bestDistanceKm(object)).toBeNull();
    });
});

// ─── bestDistanceLD ───────────────────────────────────────────────────────────

describe('bestDistanceLD', () => {
    it('prefere a distância atual (Horizons) quando disponível', () => {
        const object = makeObject({ currentDistanceLD: 1.5, approach: makeApproach({ nominalDistanceKm: 500_000 }) });
        expect(bestDistanceLD(object)).toBe(1.5);
    });

    it('calcula a partir de nominalDistanceKm quando não há LD atual', () => {
        const object = makeSymbolicObject({ nominalDistanceKm: LUNAR_DISTANCE_KM * 2 });
        expect(bestDistanceLD(object)).toBeCloseTo(2, 10);
    });

    it('usa lunarDistance direto quando nominalDistanceKm é null e não há valor atual', () => {
        const object = makeSymbolicObject({ nominalDistanceKm: null, lunarDistance: 3.5 });
        expect(bestDistanceLD(object)).toBe(3.5);
    });

    it('retorna null quando nenhum dado está disponível', () => {
        const object = makeSymbolicObject({ nominalDistanceKm: null, lunarDistance: null });
        expect(bestDistanceLD(object)).toBeNull();
    });

    it('é consistente com LUNAR_DISTANCE_KM: 1 DL de km → 1 DL', () => {
        const object = makeSymbolicObject({ nominalDistanceKm: LUNAR_DISTANCE_KM });
        expect(bestDistanceLD(object)).toBeCloseTo(1, 10);
    });
});

// ─── hasCurrentHorizonsPosition ─────────────────────────────────────────────────

describe('hasCurrentHorizonsPosition', () => {
    it('true quando a trajetória está disponível com ponto atual', () => {
        expect(hasCurrentHorizonsPosition(makeObject())).toBe(true);
    });

    it('false quando não há trajetória', () => {
        expect(hasCurrentHorizonsPosition(makeSymbolicObject())).toBe(false);
    });

    it('false quando a trajetória existe mas está indisponível', () => {
        const object = makeObject({ trajectory: makeTrajectory({ status: 'unavailable', currentPoint: null }) });
        expect(hasCurrentHorizonsPosition(object)).toBe(false);
    });

    it('false quando a trajetória está disponível mas sem ponto atual', () => {
        const object = makeObject({ trajectory: makeTrajectory({ currentPoint: null }) });
        expect(hasCurrentHorizonsPosition(object)).toBe(false);
    });
});

// ─── buildRadarObjects ────────────────────────────────────────────────────────

describe('buildRadarObjects', () => {
    it('com Horizons disponível: hasHorizonsPosition=true, isSymbolicFallback=false', () => {
        const [obj] = buildRadarObjects([makeObject()]);

        expect(obj.hasHorizonsPosition).toBe(true);
        expect(obj.isSymbolicFallback).toBe(false);
    });

    it('sem Horizons: isSymbolicFallback=true', () => {
        const [obj] = buildRadarObjects([makeSymbolicObject({ nominalDistanceKm: 500_000 })]);

        expect(obj.hasHorizonsPosition).toBe(false);
        expect(obj.isSymbolicFallback).toBe(true);
    });

    it('trajetória unavailable → trata como fallback simbólico', () => {
        const object = makeObject({
            trajectory: makeTrajectory({ status: 'unavailable', currentPoint: null }),
            currentDistanceKm: null,
            currentDistanceLD: null,
        });
        const [obj] = buildRadarObjects([object]);

        expect(obj.hasHorizonsPosition).toBe(false);
        expect(obj.isSymbolicFallback).toBe(true);
    });

    it('classifica corretamente a partir da distância atual', () => {
        const object = makeObject({ currentDistanceLD: 0.5, currentDistanceKm: LUNAR_DISTANCE_KM * 0.5 });
        const [obj] = buildRadarObjects([object]);

        expect(obj.classification).toBe('within-lunar');
        expect(obj.distanceLD).toBeCloseTo(0.5, 10);
    });

    it('herda velocidade e horário da aproximação/trajetória', () => {
        const object = makeObject({
            approach: makeApproach({ relativeVelocityKph: 42_000 }),
            trajectory: makeTrajectory({ closestApproachTime: '2026-06-15T06:00:00Z' }),
        });
        const [obj] = buildRadarObjects([object]);

        expect(obj.relativeVelocityKph).toBe(42_000);
        expect(obj.closestApproachTime).toBe('2026-06-15T06:00:00Z');
    });

    it('lista vazia → array vazio', () => {
        expect(buildRadarObjects([])).toHaveLength(0);
    });
});

// ─── radarQualityCounts ───────────────────────────────────────────────────────

describe('radarQualityCounts', () => {
    it('conta corretamente objetos com Horizons, simbólicos e sub-lunares', () => {
        const withHorizons = makeObject({ currentDistanceKm: LUNAR_DISTANCE_KM * 0.5, currentDistanceLD: 0.5 });
        const symbolic = makeSymbolicObject({ id: 'q2', nominalDistanceKm: LUNAR_DISTANCE_KM * 5 });

        const objects = buildRadarObjects([withHorizons, symbolic]);
        const counts = radarQualityCounts(objects);

        expect(counts.total).toBe(2);
        expect(counts.withHorizons).toBe(1);
        expect(counts.symbolic).toBe(1);
        expect(counts.withinLunar).toBe(1);
    });
});
