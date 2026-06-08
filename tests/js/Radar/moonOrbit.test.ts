import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    buildMoonOrbitPoints,
    buildOrbitBasis,
} from '@/Components/Radar/Bodies/Moon/MoonOrbit';

/**
 * Estes testes cobrem apenas a matemática da órbita lunar em espaço de cena.
 * Não há montagem de Canvas nem expectativa visual de renderização.
 */
describe('buildOrbitBasis', () => {
    it('retorna uma base ortonormal quando a normal orbital é utilizável', () => {
        const basis = buildOrbitBasis(
            new THREE.Vector3(2, 0.4, 0.5),
            new THREE.Vector3(0, 1, 0.2),
        );

        expect(basis).not.toBeNull();
        expect(basis!.a.length()).toBeCloseTo(1, 12);
        expect(basis!.b.length()).toBeCloseTo(1, 12);
        expect(basis!.a.dot(basis!.b)).toBeCloseTo(0, 12);
    });

    it('faz fallback seguro quando a normal orbital é paralela à direção da Lua', () => {
        const basis = buildOrbitBasis(
            new THREE.Vector3(2, 0, 0),
            new THREE.Vector3(1, 0, 0),
        );

        expect(basis).not.toBeNull();
        expect(basis!.b.length()).toBeCloseTo(1, 12);
        expect(Math.abs(basis!.a.dot(basis!.b))).toBeLessThan(1e-12);
    });
});

describe('buildMoonOrbitPoints', () => {
    it('retorna null para normais orbitais degeneradas', () => {
        const points = buildMoonOrbitPoints([1, 0, 0], [0, 0, 0], [0, 0, 0]);
        expect(points).toBeNull();
    });

    it('retorna null para um vetor Terra-Lua degenerado', () => {
        const points = buildMoonOrbitPoints([10, 0, 0], [10, 0, 0], [0, 1, 0]);
        expect(points).toBeNull();
    });

    it('retorna pontos finitos em uma guia circular estável para entradas válidas', () => {
        const points = buildMoonOrbitPoints([1.2, 0, 0], [0.2, 0, 0], [0, 1, 0]);

        expect(points).not.toBeNull();
        expect(Array.from(points!).every(Number.isFinite)).toBe(true);

        const first = new THREE.Vector3(points![0], points![1], points![2]);
        const radius = first.length();

        expect(radius).toBeGreaterThan(0);

        for (let i = 0; i < points!.length; i += 3 * 32) {
            const point = new THREE.Vector3(points![i], points![i + 1], points![i + 2]);
            expect(point.length()).toBeCloseTo(radius, 5);
        }
    });

    it('usa o raio geocêntrico Terra-Lua em vez da posição absoluta da Lua', () => {
        const points = buildMoonOrbitPoints([13, 0, 0], [10, 0, 0], [0, 1, 0]);

        expect(points).not.toBeNull();

        // Os pontos retornados são relativos ao centro da órbita (Terra), então o raio correto é 3.
        const first = new THREE.Vector3(points![0], points![1], points![2]);
        expect(first.length()).toBeCloseTo(3, 6);
        expect(first.x).toBeCloseTo(3, 6);
        expect(first.y).toBeCloseTo(0, 6);
        expect(first.z).toBeCloseTo(0, 6);
    });
});
