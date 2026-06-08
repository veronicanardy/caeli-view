import { describe, expect, it } from 'vitest';
import { deriveActiveMode } from '@/Components/Radar/Scene/sceneMode';
import type { ClosestNowObject } from '@/types';

/**
 * `deriveActiveMode` decide entre 'radar' e 'orbit'.
 * Função simples mas crítica — um erro silencioso troca o modo visual inteiro.
 */

function makeObjectWithTpJd(tpJd: number): ClosestNowObject {
    return {
        approach: { id: 'X', name: 'X', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
        trajectory: { status: 'available', horizonsFailureKind: null, currentVelocityKph: null, motionState: null, pastPoints: [], currentPoint: null, futurePoints: [],
            orbitalElements: { tpJd, eccentricity: 0.5, semiMajorAxisAU: 1.5, inclinationDeg: 10, longitudeAscendingNodeDeg: 0, argumentOfPerihelionDeg: 0, epochJd: 2451545.0 },
        },
        currentDistanceKm: 100000,
        currentDistanceLD: 0.26,
    } as unknown as ClosestNowObject;
}

describe('deriveActiveMode', () => {
    it('retorna "radar" quando orbitMode é false', () => {
        expect(deriveActiveMode(false, makeObjectWithTpJd(2460000))).toBe('radar');
    });

    it('retorna "radar" quando focusedObject é null', () => {
        expect(deriveActiveMode(true, null)).toBe('radar');
    });

    it('retorna "radar" quando objeto não tem elementos orbitais', () => {
        const obj = { ...makeObjectWithTpJd(2460000), trajectory: null } as unknown as ClosestNowObject;
        expect(deriveActiveMode(true, obj)).toBe('radar');
    });

    it('retorna "radar" quando tpJd é zero', () => {
        expect(deriveActiveMode(true, makeObjectWithTpJd(0))).toBe('radar');
    });

    it('retorna "radar" quando tpJd é NaN', () => {
        expect(deriveActiveMode(true, makeObjectWithTpJd(NaN))).toBe('radar');
    });

    it('retorna "radar" quando tpJd é Infinity', () => {
        expect(deriveActiveMode(true, makeObjectWithTpJd(Infinity))).toBe('radar');
    });

    it('retorna "orbit" quando todas as condições são satisfeitas', () => {
        expect(deriveActiveMode(true, makeObjectWithTpJd(2460000.5))).toBe('orbit');
    });
});
