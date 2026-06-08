import { describe, expect, it } from 'vitest';
import { velocityPercent } from '@/Components/ApproachObservatory/Charts/VelocityIndicator';

describe('velocityPercent', () => {
    it('retorna zero para null e undefined', () => {
        expect(velocityPercent(null, 120_000)).toBe(0);
        expect(velocityPercent(undefined, 120_000)).toBe(0);
    });

    it('retorna zero para velocidade zero ou negativa', () => {
        expect(velocityPercent(0, 120_000)).toBe(0);
        expect(velocityPercent(-1, 120_000)).toBe(0);
        expect(velocityPercent(-5_000, 120_000)).toBe(0);
    });

    it('retorna zero para NaN ou Infinity na velocidade', () => {
        expect(velocityPercent(Number.NaN, 120_000)).toBe(0);
        expect(velocityPercent(Number.POSITIVE_INFINITY, 120_000)).toBe(0);
        expect(velocityPercent(Number.NEGATIVE_INFINITY, 120_000)).toBe(0);
    });

    it('usa o máximo padrão quando maxVelocityKph é zero, negativo ou inválido', () => {
        expect(velocityPercent(6_000, 0)).toBe(6);
        expect(velocityPercent(6_000, -1)).toBe(6);
        expect(velocityPercent(6_000, Number.NaN)).toBe(6);
        expect(velocityPercent(6_000, Number.POSITIVE_INFINITY)).toBe(6);
        expect(velocityPercent(6_000, Number.NEGATIVE_INFINITY)).toBe(6);
    });

    it('aplica o mínimo visual de 6% para velocidade positiva pequena', () => {
        expect(velocityPercent(1, 120_000)).toBe(6);
        expect(velocityPercent(100, 120_000)).toBe(6);
    });

    it('limita o valor em 100% quando a velocidade ultrapassa o máximo', () => {
        expect(velocityPercent(120_001, 120_000)).toBe(100);
        expect(velocityPercent(240_000, 120_000)).toBe(100);
    });

    it('mantém o cálculo proporcional para valores válidos no intervalo', () => {
        expect(velocityPercent(60_000, 120_000)).toBe(50);
        expect(velocityPercent(12_000, 120_000)).toBe(10);
    });
});
