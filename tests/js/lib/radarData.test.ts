import { describe, expect, it } from 'vitest';
import type { HorizonsPositionResult, UnifiedApproach } from '@/types';
import {
    bestDistanceKm,
    bestDistanceLD,
    buildRadarObjects,
    classifyDistance,
    radarQualityCounts,
} from '@/lib/radarData';
import { LUNAR_DISTANCE_KM } from '@/lib/physicalConstants';

/**
 * `radarData` transforma aproximações brutas em RadarObjects prontos para a cena 3D.
 * Os testes protegem as fronteiras de classificação, a prioridade Horizons > nominal e
 * o comportamento de fallback simbólico — qualquer regressão aqui muda o que aparece no radar.
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

function makePosition(over: Partial<HorizonsPositionResult> = {}): HorizonsPositionResult {
    return {
        id: 'test-id',
        status: 'available',
        positionKind: 'horizons_current',
        x: 100_000,
        y: 200_000,
        z: 50_000,
        vx: 10,
        vy: -5,
        vz: 1,
        currentPositionTime: '2026-06-15T00:00:00Z',
        closestApproachTime: '2026-06-15T06:00:00Z',
        closestApproachDistanceKm: 300_000,
        closestApproachDistanceLD: 300_000 / LUNAR_DISTANCE_KM,
        distanceSource: 'JPL Horizons',
        positionSource: 'JPL Horizons',
        failureReason: null,
        horizonsFailureKind: null,
        note: null,
        ...over,
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
    it('prefere o valor Horizons quando disponível', () => {
        const approach = makeApproach({ nominalDistanceKm: 500_000 });
        const pos = makePosition({ closestApproachDistanceKm: 300_000 });
        expect(bestDistanceKm(approach, pos)).toBe(300_000);
    });

    it('cai para nominalDistanceKm quando Horizons não tem valor', () => {
        const approach = makeApproach({ nominalDistanceKm: 500_000 });
        const pos = makePosition({ closestApproachDistanceKm: null });
        expect(bestDistanceKm(approach, pos)).toBe(500_000);
    });

    it('retorna null quando nenhum dado está disponível', () => {
        const approach = makeApproach({ nominalDistanceKm: null });
        expect(bestDistanceKm(approach, undefined)).toBeNull();
    });

    it('retorna null quando position é undefined', () => {
        const approach = makeApproach({ nominalDistanceKm: null });
        expect(bestDistanceKm(approach)).toBeNull();
    });
});

// ─── bestDistanceLD ───────────────────────────────────────────────────────────

describe('bestDistanceLD', () => {
    it('prefere o valor Horizons quando disponível', () => {
        const approach = makeApproach({ nominalDistanceKm: 500_000 });
        const pos = makePosition({ closestApproachDistanceLD: 1.5 });
        expect(bestDistanceLD(approach, pos)).toBe(1.5);
    });

    it('calcula a partir de nominalDistanceKm quando Horizons não tem LD', () => {
        const approach = makeApproach({ nominalDistanceKm: LUNAR_DISTANCE_KM * 2 });
        const pos = makePosition({ closestApproachDistanceLD: null });
        expect(bestDistanceLD(approach, pos)).toBeCloseTo(2, 10);
    });

    it('usa lunarDistance direto quando nominalDistanceKm é null e Horizons não tem valor', () => {
        const approach = makeApproach({ nominalDistanceKm: null, lunarDistance: 3.5 });
        expect(bestDistanceLD(approach, undefined)).toBe(3.5);
    });

    it('retorna null quando nenhum dado está disponível', () => {
        const approach = makeApproach({ nominalDistanceKm: null, lunarDistance: null });
        expect(bestDistanceLD(approach, undefined)).toBeNull();
    });

    it('é consistente com LUNAR_DISTANCE_KM: 1 DL de km → 1 DL', () => {
        const approach = makeApproach({ nominalDistanceKm: LUNAR_DISTANCE_KM });
        const pos = makePosition({ closestApproachDistanceLD: null });
        expect(bestDistanceLD(approach, pos)).toBeCloseTo(1, 10);
    });
});

// ─── buildRadarObjects ────────────────────────────────────────────────────────

describe('buildRadarObjects', () => {
    it('com Horizons disponível: hasHorizonsPosition=true, positionKind=horizons_current', () => {
        const approach = makeApproach({ id: 'a1', nominalDistanceKm: 500_000 });
        const pos = makePosition({ id: 'a1' });
        const [obj] = buildRadarObjects([approach], { a1: pos });

        expect(obj.hasHorizonsPosition).toBe(true);
        expect(obj.isSymbolicFallback).toBe(false);
        expect(obj.positionKind).toBe('horizons_current');
        expect(obj.horizonsXY).not.toBeNull();
        expect(obj.horizonsXY?.x).toBe(100_000);
        expect(obj.horizonsXY?.y).toBe(200_000);
    });

    it('sem Horizons: isSymbolicFallback=true, horizonsXY=null', () => {
        const approach = makeApproach({ id: 'a2', nominalDistanceKm: 500_000 });
        const [obj] = buildRadarObjects([approach], {});

        expect(obj.hasHorizonsPosition).toBe(false);
        expect(obj.isSymbolicFallback).toBe(true);
        expect(obj.positionKind).toBe('symbolic_distance_only');
        expect(obj.horizonsXY).toBeNull();
    });

    it('Horizons com status unavailable → trata como fallback simbólico', () => {
        const approach = makeApproach({ id: 'a3', nominalDistanceKm: 500_000 });
        const pos = makePosition({ id: 'a3', status: 'unavailable', x: null, y: null });
        const [obj] = buildRadarObjects([approach], { a3: pos });

        expect(obj.hasHorizonsPosition).toBe(false);
        expect(obj.isSymbolicFallback).toBe(true);
    });

    it('classifica corretamente a partir da distância Horizons', () => {
        const approach = makeApproach({ id: 'a4', nominalDistanceKm: 1_000_000 });
        const pos = makePosition({ id: 'a4', closestApproachDistanceKm: LUNAR_DISTANCE_KM * 0.5, closestApproachDistanceLD: 0.5 });
        const [obj] = buildRadarObjects([approach], { a4: pos });

        expect(obj.classification).toBe('within-lunar');
        expect(obj.distanceLD).toBeCloseTo(0.5, 10);
    });

    it('velocidade xy preenchida quando vx/vy não-zero', () => {
        const approach = makeApproach({ id: 'a5' });
        const pos = makePosition({ id: 'a5', vx: 10, vy: -5 });
        const [obj] = buildRadarObjects([approach], { a5: pos });

        expect(obj.velocityKmS).toEqual({ vx: 10, vy: -5 });
    });

    it('velocidade null quando vx=0 e vy=0 (vetor degenerado)', () => {
        const approach = makeApproach({ id: 'a6' });
        const pos = makePosition({ id: 'a6', vx: 0, vy: 0 });
        const [obj] = buildRadarObjects([approach], { a6: pos });

        expect(obj.velocityKmS).toBeNull();
    });

    it('lista vazia → array vazio', () => {
        expect(buildRadarObjects([], {})).toHaveLength(0);
    });

    it('usa averageDiameterMeters: prefere diameterMeters direto', () => {
        const approach = makeApproach({ id: 'a7', diameterMeters: 250, estimatedDiameterMinMeters: 100, estimatedDiameterMaxMeters: 400 });
        const [obj] = buildRadarObjects([approach], {});
        expect(obj.diameterMeters).toBe(250);
    });

    it('usa averageDiameterMeters: calcula média quando diameterMeters é null', () => {
        const approach = makeApproach({ id: 'a8', diameterMeters: null, estimatedDiameterMinMeters: 100, estimatedDiameterMaxMeters: 300 });
        const [obj] = buildRadarObjects([approach], {});
        expect(obj.diameterMeters).toBe(200);
    });
});

// ─── radarQualityCounts ───────────────────────────────────────────────────────

describe('radarQualityCounts', () => {
    it('conta corretamente objetos com Horizons, simbólicos e sub-lunares', () => {
        const a1 = makeApproach({ id: 'q1', nominalDistanceKm: LUNAR_DISTANCE_KM * 0.5 });
        const a2 = makeApproach({ id: 'q2', nominalDistanceKm: LUNAR_DISTANCE_KM * 5 });
        const pos1 = makePosition({ id: 'q1', closestApproachDistanceKm: LUNAR_DISTANCE_KM * 0.5, closestApproachDistanceLD: 0.5 });

        const objects = buildRadarObjects([a1, a2], { q1: pos1 });
        const counts = radarQualityCounts(objects);

        expect(counts.total).toBe(2);
        expect(counts.withHorizons).toBe(1);
        expect(counts.symbolic).toBe(1);
        expect(counts.withinLunar).toBe(1);
    });
});
