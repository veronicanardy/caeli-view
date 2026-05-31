import { describe, expect, it } from 'vitest';
import { directionFromBodyToSceneSun } from '@/Components/ApproachObservatory/Bodies/bodyLighting';

/**
 * `bodyLighting` é um helper geométrico puro: os testes abaixo validam
 * direção, normalização e comportamento seguro no caso degenerado.
 */
describe('directionFromBodyToSceneSun', () => {
    it('retorna um vetor normalizado do corpo em direção ao Sol da cena', () => {
        const dir = directionFromBodyToSceneSun([3, 4, 0]);

        expect(dir.length()).toBeCloseTo(1, 12);
        expect(dir.x).toBeCloseTo(-3 / 5, 12);
        expect(dir.y).toBeCloseTo(-4 / 5, 12);
        expect(dir.z).toBeCloseTo(0, 12);
    });

    it('aponta para a origem em posições válidas arbitrárias', () => {
        const dir = directionFromBodyToSceneSun([-2, 1, 2]);

        expect(dir.x).toBeCloseTo(2 / 3, 12);
        expect(dir.y).toBeCloseTo(-1 / 3, 12);
        expect(dir.z).toBeCloseTo(-2 / 3, 12);
    });

    it('não produz NaN no caso degenerado da origem', () => {
        const dir = directionFromBodyToSceneSun([0, 0, 0]);

        expect(Number.isFinite(dir.x)).toBe(true);
        expect(Number.isFinite(dir.y)).toBe(true);
        expect(Number.isFinite(dir.z)).toBe(true);
        expect(dir.lengthSq()).toBe(0);
    });
});
