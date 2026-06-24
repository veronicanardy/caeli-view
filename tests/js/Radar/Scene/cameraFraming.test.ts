import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { framingForBody, framingForOverview, framingForTrajectorySegment, computeFocusFraming } from '@/Components/Radar/Scene/cameraFraming';
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

const EARTH_HELIO = { x: 1, y: 0, z: 0 };

describe('computeFocusFraming', () => {
    it('retorna null quando não há trajetória e orbitMode é false', () => {
        expect(computeFocusFraming(makeObjectNoTrajectory(), false, EARTH_HELIO)).toBeNull();
    });

    it('retorna null quando falta a posição heliocêntrica da Terra (efeméride não resolvida)', () => {
        expect(computeFocusFraming(makeObjectWithPosition(), false, null)).toBeNull();
    });

    it('retorna close-up com transition "preserve_heading" quando objeto tem posição', () => {
        const framing = computeFocusFraming(makeObjectWithPosition(), false, EARTH_HELIO);
        expect(framing).not.toBeNull();
        expect(framing!.transition).toBe('preserve_heading');
        expect(framing!.target.toArray().every(Number.isFinite)).toBe(true);
    });

    it('com orbitMode true mas sem elementos orbitais cai para o close-up heliocêntrico', () => {
        const framing = computeFocusFraming(makeObjectWithPosition(), true, EARTH_HELIO);
        expect(framing).not.toBeNull();
        expect(framing!.transition).toBe('preserve_heading');
    });

    it('o close-up fica DENTRO da faixa em que a lupa de trajetória aparece (0.076 a 0.792)', () => {
        // ZoomHint só mostra a lupa entre SHOW_MIN (0.08*0.95=0.076) e SHOW_MAX (0.36*2.2=0.792).
        // Se o close-up sair dessa faixa, o passo de trajetória do tutorial perde o botão. Vale
        // para um corpo minúsculo (cai no piso colado) e um gigante (Ceres, cai perto do teto).
        for (const diameterMeters of [10, 939_400]) {
            const obj = makeObjectWithPosition();
            (obj.approach as { diameterMeters: number | null }).diameterMeters = diameterMeters;
            const framing = computeFocusFraming(obj, false, EARTH_HELIO)!;
            const distance = framing.position.distanceTo(framing.target);
            expect(distance, `d=${diameterMeters}`).toBeGreaterThanOrEqual(0.076);
            expect(distance, `d=${diameterMeters}`).toBeLessThanOrEqual(0.792);
        }
    });
});


// ─── framingForTrajectorySegment ──────────────────────────────────────────────

describe('framingForTrajectorySegment', () => {
    const rock = new THREE.Vector3(2, 0, 0);
    const trail = [
        new THREE.Vector3(-4, 0, 0),
        new THREE.Vector3(-2, 0, 0.2),
        new THREE.Vector3(0, 0, 0.1),
        rock.clone(),
    ];
    const cameraAbove = new THREE.Vector3(0, 5, 5);

    function frame(over: Partial<Parameters<typeof framingForTrajectorySegment>[0]> = {}) {
        return framingForTrajectorySegment({
            points: trail.map((p) => p.clone()),
            rockPosition: rock.clone(),
            currentCameraPosition: cameraAbove.clone(),
            fovDeg: 55,
            aspect: 16 / 9,
            ...over,
        });
    }

    it('todos os pontos do trecho cabem no cone de visão a partir da posição calculada', () => {
        const { position, target } = frame();
        const viewDir = target.clone().sub(position).normalize();
        const halfFovRad = THREE.MathUtils.degToRad(55) * 0.5;
        for (const point of trail) {
            const toPoint = point.clone().sub(position).normalize();
            const angle = Math.acos(THREE.MathUtils.clamp(viewDir.dot(toPoint), -1, 1));
            expect(angle).toBeLessThanOrEqual(halfFovRad + 1e-6);
        }
    });

    it('o alvo fica entre o centro do trecho e a rocha (viés na protagonista)', () => {
        const { target } = frame();
        const box = new THREE.Box3().setFromPoints(trail);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        expect(target.distanceTo(rock)).toBeLessThan(sphere.center.distanceTo(rock));
    });

    it('a direção de vista nunca fica quase paralela à corda da trajetória', () => {
        // Câmera alinhada com a corda (olhando a linha de topo): deve ser corrigida.
        const { position, target } = frame({ currentCameraPosition: new THREE.Vector3(20, 0.1, 0) });
        const viewDir = position.clone().sub(target).normalize();
        const chord = rock.clone().sub(trail[0]).normalize();
        expect(Math.abs(viewDir.dot(chord))).toBeLessThan(0.9);
    });

    it('painéis abertos (frações visíveis menores) afastam mais a câmera', () => {
        const full = frame();
        const withSheet = frame({ visibleHeightFraction: 0.55 });
        expect(withSheet.position.distanceTo(withSheet.target))
            .toBeGreaterThan(full.position.distanceTo(full.target));
    });

    it('com menos de 2 pontos, recua da rocha mantendo um enquadramento utilizável', () => {
        const { position, target } = frame({ points: [] });
        expect(target.distanceTo(rock)).toBeCloseTo(0, 9);
        expect(position.distanceTo(rock)).toBeCloseTo(3, 6);
    });

    it('a câmera ganha elevação para não ler a linha rente ao plano da cena', () => {
        const { position, target } = frame();
        expect(position.y).toBeGreaterThan(target.y);
    });
});
