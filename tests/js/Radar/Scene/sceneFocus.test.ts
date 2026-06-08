import { describe, expect, it } from 'vitest';
import { shouldShowLabelForObject, shouldUseHelioScene } from '@/Components/Radar/Scene/sceneFocus';
import type { ClosestNowObject } from '@/types';

/**
 * `sceneFocus` decide visibilidade de labels e modo heliocêntrico a partir de
 * flags já resolvidas. Os testes abaixo cobrem as combinações críticas de cada
 * função — condições que, se invertidas, mudam o comportamento visual silenciosamente.
 */

// ─── shouldShowLabelForObject ──────────────────────────────────────────────────

describe('shouldShowLabelForObject', () => {
    it('retorna false quando showLabels está desligado, independente do resto', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: false, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(false);

        expect(shouldShowLabelForObject({
            id: 'A', selectedId: null, showLabels: false, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(false);
    });

    it('retorna true para objeto selecionado fora do modo órbita', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(true);
    });

    it('retorna false para objeto selecionado no modo órbita (orbitLabelsOnly)', () => {
        // No modo órbita apenas a elipse precisa de label — a rocha some.
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: true, orbitLabelsOnly: true, hideAsteroidLabels: false,
        })).toBe(false);
    });

    it('retorna false para objeto não selecionado quando hideAsteroidLabels está ativo', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: true,
        })).toBe(false);
    });

    it('retorna false para objeto não selecionado no modo órbita', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: true, hideAsteroidLabels: false,
        })).toBe(false);
    });

    it('retorna true para objeto não selecionado com labels ativos e câmera próxima', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(true);
    });

    it('trata selectedId null como ausência de seleção', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: null, showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(true);
    });
});

// ─── shouldUseHelioScene ───────────────────────────────────────────────────────

/** Constrói um ClosestNowObject mínimo com os campos de órbita necessários. */
function makeObjectWithOrbit(tpJd: number): ClosestNowObject {
    return {
        approach: { id: 'X', name: 'X', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
        trajectory: {
            status: 'available',
            horizonsFailureKind: null,
            currentVelocityKph: null,
            motionState: null,
            pastPoints: [],
            currentPoint: null,
            futurePoints: [],
            orbitalElements: {
                tpJd,
                eccentricity: 0.5,
                semiMajorAxisAU: 1.5,
                inclinationDeg: 10,
                longitudeAscendingNodeDeg: 0,
                argumentOfPerihelionDeg: 0,
                epochJd: 2451545.0,
            },
        },
        currentDistanceKm: 100000,
        currentDistanceLD: 0.26,
    } as unknown as ClosestNowObject;
}

function makeObjectWithoutOrbit(): ClosestNowObject {
    return {
        approach: { id: 'Y', name: 'Y', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
        trajectory: { status: 'available', horizonsFailureKind: null, currentVelocityKph: null, motionState: null, pastPoints: [], currentPoint: null, futurePoints: [], orbitalElements: null },
        currentDistanceKm: 100000,
        currentDistanceLD: 0.26,
    } as unknown as ClosestNowObject;
}

describe('shouldUseHelioScene', () => {
    it('retorna true quando todas as condições são satisfeitas', () => {
        const obj = makeObjectWithOrbit(2460000.5);
        expect(shouldUseHelioScene(true, true, obj)).toBe(true);
    });

    it('retorna false quando orbitMode está desligado', () => {
        const obj = makeObjectWithOrbit(2460000.5);
        expect(shouldUseHelioScene(false, true, obj)).toBe(false);
    });

    it('retorna false quando selectedHasOrbit é false', () => {
        const obj = makeObjectWithOrbit(2460000.5);
        expect(shouldUseHelioScene(true, false, obj)).toBe(false);
    });

    it('retorna false quando focusedObject é null', () => {
        expect(shouldUseHelioScene(true, true, null)).toBe(false);
    });

    it('retorna false quando o objeto não tem elementos orbitais', () => {
        const obj = makeObjectWithoutOrbit();
        expect(shouldUseHelioScene(true, true, obj)).toBe(false);
    });

    it('retorna false quando tpJd é zero — época de periélio ausente', () => {
        // tpJd = 0 indica que a época de periélio não foi preenchida pelo pipeline.
        // Sem ela a posição Kepleriana não é computável, então a cena helio não pode ser usada.
        const obj = makeObjectWithOrbit(0);
        expect(shouldUseHelioScene(true, true, obj)).toBe(false);
    });

    it('retorna false quando tpJd é NaN', () => {
        const obj = makeObjectWithOrbit(NaN);
        expect(shouldUseHelioScene(true, true, obj)).toBe(false);
    });

    it('retorna false quando tpJd é Infinity', () => {
        const obj = makeObjectWithOrbit(Infinity);
        expect(shouldUseHelioScene(true, true, obj)).toBe(false);
    });
});
