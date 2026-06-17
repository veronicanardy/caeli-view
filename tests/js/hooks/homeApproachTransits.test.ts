import { describe, expect, it } from 'vitest';
import { mapResponseToTransits, nearbyCountFromResponse } from '@/hooks/useHomeApproachTransits';
import type { ClosestNowObject, ClosestNowResponse, UnifiedApproach } from '@/types';

/**
 * `mapResponseToTransits` reduz a resposta do closest-now aos rótulos do trânsito
 * de dados do hero. Os testes cobrem a preferência pela distância atual sobre a
 * nominal, o fallback quando a atual falta, e o descarte de objetos sem nome.
 */

function makeApproach(over: Partial<UnifiedApproach> = {}): UnifiedApproach {
    return {
        id: 'neows:1',
        name: '433 Eros',
        rawName: '433 Eros',
        displayName: '433 Eros',
        subtitle: null,
        permanentNumber: null,
        properName: null,
        provisionalDesignation: null,
        designation: null,
        aliases: [],
        objectType: 'asteroid',
        hazardFlag: false,
        approachDate: null,
        nominalDistanceKm: null,
        lunarDistance: null,
        absoluteMagnitude: null,
        diameterMeters: null,
        estimatedDiameterMinMeters: null,
        estimatedDiameterMaxMeters: null,
        relativeVelocityKph: null,
        ...over,
    } as UnifiedApproach;
}

function makeObject(over: Partial<ClosestNowObject> = {}): ClosestNowObject {
    return {
        approach: makeApproach(),
        trajectory: null,
        currentDistanceKm: null,
        currentDistanceLD: null,
        hasRealCurrentDistance: false,
        ...over,
    };
}

function makeResponse(objects: ClosestNowObject[], candidatesEvaluated = 0): ClosestNowResponse {
    return {
        mode: 'closest_now',
        selectionMode: 'nearest',
        generatedAt: '2026-06-17T00:00:00Z',
        window: { dateMin: '2026-06-14', dateMax: '2026-06-20' },
        requestedLimit: 5,
        candidatesEvaluated,
        objects,
    } as ClosestNowResponse;
}

describe('mapResponseToTransits', () => {
    it('prefere a distância atual sobre a nominal', () => {
        const result = mapResponseToTransits(makeResponse([
            makeObject({
                currentDistanceKm: 1_452_750,
                approach: makeApproach({ id: 'a', nominalDistanceKm: 9_999_999 }),
            }),
        ]));

        expect(result).toEqual([{ id: 'a', name: '433 Eros', distanceKm: 1_452_750 }]);
    });

    it('cai para a distância nominal quando não há atual', () => {
        const result = mapResponseToTransits(makeResponse([
            makeObject({
                currentDistanceKm: null,
                approach: makeApproach({ id: 'b', nominalDistanceKm: 384_000 }),
            }),
        ]));

        expect(result[0].distanceKm).toBe(384_000);
    });

    it('mantém distância nula quando nenhuma das duas existe', () => {
        const result = mapResponseToTransits(makeResponse([
            makeObject({ approach: makeApproach({ id: 'c' }) }),
        ]));

        expect(result[0].distanceKm).toBeNull();
    });

    it('usa o nome genérico de fallback quando nenhum campo de nome existe', () => {
        const result = mapResponseToTransits(makeResponse([
            makeObject({ approach: makeApproach({ id: 'd', name: '', rawName: '', displayName: '' }) }),
        ]));

        // resolveApproachIdentity nunca devolve nome vazio: cai no rótulo genérico.
        expect(result).toHaveLength(1);
        expect(result[0].name).toBeTruthy();
    });

    it('preserva a ordem da resposta', () => {
        const result = mapResponseToTransits(makeResponse([
            makeObject({ approach: makeApproach({ id: '1', name: 'A', displayName: 'A' }) }),
            makeObject({ approach: makeApproach({ id: '2', name: 'B', displayName: 'B' }) }),
            makeObject({ approach: makeApproach({ id: '3', name: 'C', displayName: 'C' }) }),
        ]));

        expect(result.map((item) => item.id)).toEqual(['1', '2', '3']);
    });
});

describe('nearbyCountFromResponse', () => {
    it('usa candidatesEvaluated quando presente e positivo', () => {
        const count = nearbyCountFromResponse(makeResponse([makeObject()], 31));
        expect(count).toBe(31);
    });

    it('cai para o número de objetos quando candidatesEvaluated é zero', () => {
        const count = nearbyCountFromResponse(makeResponse([
            makeObject({ approach: makeApproach({ id: 'x' }) }),
            makeObject({ approach: makeApproach({ id: 'y' }) }),
        ], 0));
        expect(count).toBe(2);
    });

    it('retorna zero quando não há objetos nem contagem', () => {
        expect(nearbyCountFromResponse(makeResponse([], 0))).toBe(0);
    });
});
