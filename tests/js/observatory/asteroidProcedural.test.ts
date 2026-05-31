import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    buildAsteroidGeometry,
    sphericalDirection,
} from '@/Components/ApproachObservatory/Bodies/Asteroid/asteroidProcedural';

/**
 * Lê o buffer de posições para comparar geometria gerada de forma determinística.
 */
function readPositions(geometry: THREE.BufferGeometry): number[] {
    return Array.from((geometry.attributes.position as THREE.BufferAttribute).array as ArrayLike<number>);
}

/**
 * Lê o buffer de cores normalizadas por vértice.
 */
function readColors(geometry: THREE.BufferGeometry): number[] {
    return Array.from((geometry.attributes.color as THREE.BufferAttribute).array as ArrayLike<number>);
}

describe('sphericalDirection', () => {
    it('returns a unit vector', () => {
        const dir = sphericalDirection(Math.PI / 3, Math.PI / 4);
        expect(dir.length()).toBeCloseTo(1, 12);
    });

    it('uses z = cos(theta), independent of phi', () => {
        const theta = 1.123;
        const a = sphericalDirection(theta, 0.25);
        const b = sphericalDirection(theta, 2.4);

        expect(a.z).toBeCloseTo(Math.cos(theta), 12);
        expect(b.z).toBeCloseTo(Math.cos(theta), 12);
        expect(a.z).toBeCloseTo(b.z, 12);
    });

    it('never produces NaN or Infinity for valid spherical inputs', () => {
        const dir = sphericalDirection(Math.PI / 2, Math.PI * 1.75);

        expect(Number.isFinite(dir.x)).toBe(true);
        expect(Number.isFinite(dir.y)).toBe(true);
        expect(Number.isFinite(dir.z)).toBe(true);
    });
});

describe('buildAsteroidGeometry', () => {
    it('is deterministic for the same seed and variant', () => {
        const first = buildAsteroidGeometry('bennu-like-seed', 'medium');
        const second = buildAsteroidGeometry('bennu-like-seed', 'medium');

        try {
            // Protege o contrato de estabilidade visual para o mesmo objeto procedural.
            expect(readPositions(first)).toEqual(readPositions(second));
            expect(readColors(first)).toEqual(readColors(second));
        } finally {
            first.dispose();
            second.dispose();
        }
    });

    it('exposes matching position, normal and color attributes', () => {
        const geometry = buildAsteroidGeometry('attribute-check', 'medium');

        try {
            const position = geometry.attributes.position as THREE.BufferAttribute | undefined;
            const normal = geometry.attributes.normal as THREE.BufferAttribute | undefined;
            const color = geometry.attributes.color as THREE.BufferAttribute | undefined;

            expect(position).toBeDefined();
            expect(normal).toBeDefined();
            expect(color).toBeDefined();
            expect(position?.count).toBe(normal?.count);
            expect(position?.count).toBe(color?.count);
        } finally {
            geometry.dispose();
        }
    });

    it('produces finite positions, normals and colors in normalized ranges', () => {
        const geometry = buildAsteroidGeometry('finite-geometry-check', 'large');

        try {
            const positions = readPositions(geometry);
            const normals = Array.from((geometry.attributes.normal as THREE.BufferAttribute).array as ArrayLike<number>);
            const colors = readColors(geometry);

            // Não testamos aparência, apenas sanidade numérica dos buffers gerados.
            expect(positions.every(Number.isFinite)).toBe(true);
            expect(normals.every(Number.isFinite)).toBe(true);
            expect(colors.every(Number.isFinite)).toBe(true);
            expect(colors.every((value) => value >= 0 && value <= 1)).toBe(true);
        } finally {
            geometry.dispose();
        }
    });

    it('produces non-degenerate vertex directions', () => {
        const geometry = buildAsteroidGeometry('direction-check', 'small');

        try {
            const position = geometry.attributes.position as THREE.BufferAttribute;
            const vertex = new THREE.Vector3();

            for (let i = 0; i < Math.min(position.count, 24); i += 1) {
                vertex.fromBufferAttribute(position, i);
                expect(vertex.length()).toBeGreaterThan(0);
                expect(Number.isFinite(vertex.x)).toBe(true);
                expect(Number.isFinite(vertex.y)).toBe(true);
                expect(Number.isFinite(vertex.z)).toBe(true);
            }
        } finally {
            geometry.dispose();
        }
    });

    it('can vary geometry across variants for the same seed', () => {
        const tiny = buildAsteroidGeometry('shared-seed', 'tiny');
        const large = buildAsteroidGeometry('shared-seed', 'large');

        try {
            expect(readPositions(tiny)).not.toEqual(readPositions(large));
        } finally {
            tiny.dispose();
            large.dispose();
        }
    });

    it('builds a valid finite bounding sphere', () => {
        const geometry = buildAsteroidGeometry('bounding-sphere-check', 'unknown');

        try {
            geometry.computeBoundingSphere();

            // A bounding sphere é um bom indicador de que a geometria não colapsou.
            expect(geometry.boundingSphere).not.toBeNull();
            expect(Number.isFinite(geometry.boundingSphere!.center.x)).toBe(true);
            expect(Number.isFinite(geometry.boundingSphere!.center.y)).toBe(true);
            expect(Number.isFinite(geometry.boundingSphere!.center.z)).toBe(true);
            expect(Number.isFinite(geometry.boundingSphere!.radius)).toBe(true);
            expect(geometry.boundingSphere!.radius).toBeGreaterThan(0);
        } finally {
            geometry.dispose();
        }
    });
});
