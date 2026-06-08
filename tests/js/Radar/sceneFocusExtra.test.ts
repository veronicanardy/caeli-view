import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { computeLabelOccluder, focusedObjectScenePosition } from '@/Components/Radar/Scene/sceneFocus';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import type { ClosestNowObject } from '@/types';

/**
 * Cobre as duas funções de sceneFocus ainda sem teste:
 * focusedObjectScenePosition e computeLabelOccluder.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeObjectWithPosition(x: number, y: number, z: number): ClosestNowObject {
    return {
        approach: { id: 'A', name: 'A', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
        trajectory: {
            status: 'available',
            horizonsFailureKind: null,
            currentVelocityKph: null,
            motionState: null,
            pastPoints: [],
            currentPoint: { x, y, z, distanceKm: null, timestamp: null },
            futurePoints: [],
            orbitalElements: null,
        },
        currentDistanceKm: 100000,
        currentDistanceLD: 0.26,
    } as unknown as ClosestNowObject;
}

// ─── focusedObjectScenePosition ───────────────────────────────────────────────

describe('focusedObjectScenePosition', () => {
    it('retorna null quando focusedObject é null', () => {
        expect(focusedObjectScenePosition(null, [1, 2, 3])).toBeNull();
    });

    it('retorna null quando o objeto não tem posição de cena', () => {
        const obj = {
            approach: { id: 'X', name: 'X', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
            trajectory: null,
            currentDistanceKm: null,
            currentDistanceLD: null,
        } as unknown as ClosestNowObject;
        expect(focusedObjectScenePosition(obj, [0, 0, 0])).toBeNull();
    });

    it('soma posição geocêntrica do objeto com earthPos', () => {
        const obj = makeObjectWithPosition(0.5, 0, 0);
        const earth: [number, number, number] = [10, 0, 0];
        const result = focusedObjectScenePosition(obj, earth);
        expect(result).not.toBeNull();
        // x deve ser ~earthPos.x + geoPos.x (comprimido)
        expect(result![0]).toBeGreaterThan(10);
    });

    it('com earthPos em zero a posição retornada é igual ao geoPos comprimido', () => {
        const obj = makeObjectWithPosition(1, 0, 0);
        const result = focusedObjectScenePosition(obj, [0, 0, 0]);
        expect(result).not.toBeNull();
        expect(result![0]).toBeGreaterThan(0);
        expect(result![1]).toBeCloseTo(0, 6);
        expect(result![2]).toBeCloseTo(0, 6);
    });
});

// ─── computeLabelOccluder ─────────────────────────────────────────────────────

const EARTH: [number, number, number] = [1, 0, 0];
const MOON: [number, number, number] = [1.26, 0, 0];

function makeBodyFocus(body: 'earth' | 'moon') {
    return {
        body,
        framing: { target: new THREE.Vector3(), position: new THREE.Vector3() },
        nonce: 1,
    };
}

describe('computeLabelOccluder', () => {
    it('retorna null quando não há foco nem objeto', () => {
        const occluder = computeLabelOccluder({
            bodyFocus: null,
            earthPos: EARTH,
            moonPos: MOON,
            focusedObjectPosition: null,
        });
        expect(occluder).toBeNull();
    });

    it('retorna oclusor centrado na Terra com raio Earth × 1.35 quando foco é earth', () => {
        const occluder = computeLabelOccluder({
            bodyFocus: makeBodyFocus('earth'),
            earthPos: EARTH,
            moonPos: MOON,
            focusedObjectPosition: null,
        });
        expect(occluder).not.toBeNull();
        expect(occluder!.center.x).toBeCloseTo(1, 6);
        expect(occluder!.radius).toBeCloseTo(EARTH_RADIUS_DL * 1.35, 10);
    });

    it('retorna oclusor centrado na Lua com raio Moon × 1.9 quando foco é moon', () => {
        const occluder = computeLabelOccluder({
            bodyFocus: makeBodyFocus('moon'),
            earthPos: EARTH,
            moonPos: MOON,
            focusedObjectPosition: null,
        });
        expect(occluder).not.toBeNull();
        expect(occluder!.center.x).toBeCloseTo(1.26, 6);
        expect(occluder!.radius).toBeCloseTo(MOON_RADIUS_DL * 1.9, 10);
    });

    it('retorna oclusor em torno do objeto com raio 0.18 quando há posição de objeto', () => {
        const pos: [number, number, number] = [5, 3, 2];
        const occluder = computeLabelOccluder({
            bodyFocus: null,
            earthPos: EARTH,
            moonPos: MOON,
            focusedObjectPosition: pos,
        });
        expect(occluder).not.toBeNull();
        expect(occluder!.center.x).toBeCloseTo(5, 6);
        expect(occluder!.radius).toBeCloseTo(0.18, 10);
    });

    it('foco de corpo tem precedência sobre posição de objeto', () => {
        const pos: [number, number, number] = [5, 3, 2];
        const occluder = computeLabelOccluder({
            bodyFocus: makeBodyFocus('earth'),
            earthPos: EARTH,
            moonPos: MOON,
            focusedObjectPosition: pos,
        });
        // Deve retornar Terra, não o objeto
        expect(occluder!.center.x).toBeCloseTo(1, 6);
        expect(occluder!.radius).toBeCloseTo(EARTH_RADIUS_DL * 1.35, 10);
    });
});
