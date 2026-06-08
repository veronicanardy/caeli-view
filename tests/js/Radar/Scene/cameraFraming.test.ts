import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { framingForBody, framingForOverview, computeFocusFraming } from '@/Components/Radar/Scene/cameraFraming';
import type { ClosestNowObject } from '@/types';

/**
 * `cameraFraming` é o coração do sistema de foco — calcula onde a câmera deve
 * ficar e para onde deve olhar. Erros aqui resultam em câmera perdida ou foco
 * errado silenciosamente. Os testes cobrem o contrato de cada helper puro.
 */

// ─── framingForBody ────────────────────────────────────────────────────────────

describe('framingForBody', () => {
    it('o target é igual ao center fornecido', () => {
        const center = new THREE.Vector3(1, 2, 3);
        const { target } = framingForBody(center, 0.5);
        expect(target.x).toBeCloseTo(1, 10);
        expect(target.y).toBeCloseTo(2, 10);
        expect(target.z).toBeCloseTo(3, 10);
    });

    it('a câmera fica a distância = radius × 20 do center por padrão', () => {
        const center = new THREE.Vector3(0, 0, 0);
        const radius = 1;
        const { position } = framingForBody(center, radius);
        expect(position.distanceTo(center)).toBeCloseTo(radius * 20, 6);
    });

    it('usa distanceMultiplier quando fornecido', () => {
        const center = new THREE.Vector3(0, 0, 0);
        const { position } = framingForBody(center, 1, undefined, 30);
        expect(position.distanceTo(center)).toBeCloseTo(30, 6);
    });

    it('garante distância mínima de 0.2 mesmo com radius muito pequeno', () => {
        const center = new THREE.Vector3(0, 0, 0);
        const { position } = framingForBody(center, 0.001);
        expect(position.distanceTo(center)).toBeGreaterThanOrEqual(0.2);
    });

    it('usa preferredDir normalizada quando fornecida', () => {
        const center = new THREE.Vector3(0, 0, 0);
        const dir = new THREE.Vector3(1, 0, 0);
        const { position } = framingForBody(center, 1, dir, 10);
        // Câmera deve estar em [10, 0, 0] — ao longo do eixo X
        expect(position.x).toBeCloseTo(10, 6);
        expect(position.y).toBeCloseTo(0, 6);
        expect(position.z).toBeCloseTo(0, 6);
    });

    it('a transição padrão é "default"', () => {
        const { transition } = framingForBody(new THREE.Vector3(), 1);
        expect(transition).toBe('default');
    });

    it('não muta o vetor center original', () => {
        const center = new THREE.Vector3(5, 5, 5);
        framingForBody(center, 1);
        expect(center.x).toBe(5);
    });
});

// ─── framingForOverview ────────────────────────────────────────────────────────

describe('framingForOverview', () => {
    it('o target é a origem', () => {
        const { target } = framingForOverview();
        expect(target.x).toBe(0);
        expect(target.y).toBe(0);
        expect(target.z).toBe(0);
    });

    it('a transição é "default"', () => {
        expect(framingForOverview().transition).toBe('default');
    });
});

// ─── computeFocusFraming ───────────────────────────────────────────────────────

/** Objeto mínimo sem trajetória — retorna null no close-up porque não há posição. */
function makeObjectNoTrajectory(): ClosestNowObject {
    return {
        approach: { id: 'A', name: 'A', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
        trajectory: null,
        currentDistanceKm: 100000,
        currentDistanceLD: 0.26,
    } as unknown as ClosestNowObject;
}

/** Objeto com posição geocêntrica simulada via currentPoint. */
function makeObjectWithPosition(): ClosestNowObject {
    return {
        approach: { id: 'B', name: 'B', displayName: null, objectType: 'asteroid', hazardFlag: false, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null },
        trajectory: {
            status: 'available',
            horizonsFailureKind: null,
            currentVelocityKph: null,
            motionState: null,
            pastPoints: [],
            currentPoint: { x: 0.5, y: 0, z: 0, distanceKm: null, timestamp: null },
            futurePoints: [],
            orbitalElements: null,
        },
        currentDistanceKm: 100000,
        currentDistanceLD: 0.26,
    } as unknown as ClosestNowObject;
}

describe('computeFocusFraming', () => {
    it('retorna null quando não há trajetória e orbitMode é false', () => {
        expect(computeFocusFraming(makeObjectNoTrajectory())).toBeNull();
    });

    it('retorna close-up com transition "preserve_heading" quando objeto tem posição', () => {
        const framing = computeFocusFraming(makeObjectWithPosition());
        expect(framing).not.toBeNull();
        expect(framing!.transition).toBe('preserve_heading');
    });

    it('o target do close-up inclui o earthScenePosition como offset', () => {
        const earth: [number, number, number] = [10, 0, 0];
        const framing = computeFocusFraming(makeObjectWithPosition(), false, null, earth);
        expect(framing).not.toBeNull();
        // O target deve estar em algum ponto próximo a x=10 (earthPos + geoPos comprimido)
        expect(framing!.target.x).toBeGreaterThan(9);
    });

    it('com orbitMode true mas sem elementos orbitais cai para close-up', () => {
        const framing = computeFocusFraming(makeObjectWithPosition(), true);
        expect(framing).not.toBeNull();
        expect(framing!.transition).toBe('preserve_heading');
    });
});
