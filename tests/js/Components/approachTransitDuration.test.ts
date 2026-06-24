import { describe, expect, it } from 'vitest';
import { transitDurationForDistance, transitVisualScaleForDistance } from '@/Components/Home/ApproachTransit';

/**
 * `transitDurationForDistance` mapeia a distância do objeto para a duração da
 * travessia: mais perto cruza mais rápido (duração menor), mais longe deriva
 * devagar (duração maior). Os testes fixam a monotonicidade, o clamp nos
 * extremos e o fallback quando não há distância.
 */
describe('transitDurationForDistance', () => {
    it('objeto mais perto cruza mais rápido que o mais longe', () => {
        const near = transitDurationForDistance(200_000);
        const far = transitDurationForDistance(5_000_000);
        expect(near).toBeLessThan(far);
    });

    it('faz clamp abaixo do mínimo (não fica mais rápido que o piso)', () => {
        const atFloor = transitDurationForDistance(150_000);
        const belowFloor = transitDurationForDistance(1_000);
        expect(belowFloor).toBe(atFloor);
    });

    it('faz clamp acima do máximo (não fica mais lento que o teto)', () => {
        const atCeil = transitDurationForDistance(6_000_000);
        const aboveCeil = transitDurationForDistance(50_000_000);
        expect(aboveCeil).toBe(atCeil);
    });

    it('usa o meio da faixa quando não há distância', () => {
        const fallback = transitDurationForDistance(null);
        const fastest = transitDurationForDistance(150_000);
        const slowest = transitDurationForDistance(6_000_000);
        expect(fallback).toBeGreaterThan(fastest);
        expect(fallback).toBeLessThan(slowest);
    });

    it('trata valores não finitos como ausência de distância', () => {
        expect(transitDurationForDistance(Number.NaN)).toBe(transitDurationForDistance(null));
        expect(transitDurationForDistance(Number.POSITIVE_INFINITY)).toBe(transitDurationForDistance(null));
    });
});

describe('transitVisualScaleForDistance', () => {
    it('mostra o objeto perto maior que o distante', () => {
        const near = transitVisualScaleForDistance(200_000);
        const far = transitVisualScaleForDistance(5_000_000);
        expect(near).toBeGreaterThan(far);
    });

    it('faz clamp nos extremos da escala aparente', () => {
        expect(transitVisualScaleForDistance(1_000)).toBe(transitVisualScaleForDistance(150_000));
        expect(transitVisualScaleForDistance(50_000_000)).toBe(transitVisualScaleForDistance(6_000_000));
    });

    it('usa o meio da faixa visual quando nao ha distancia', () => {
        const fallback = transitVisualScaleForDistance(null);
        const nearest = transitVisualScaleForDistance(150_000);
        const farthest = transitVisualScaleForDistance(6_000_000);
        expect(fallback).toBeLessThan(nearest);
        expect(fallback).toBeGreaterThan(farthest);
    });

    it('trata valores nao finitos como ausencia de distancia', () => {
        expect(transitVisualScaleForDistance(Number.NaN)).toBe(transitVisualScaleForDistance(null));
        expect(transitVisualScaleForDistance(Number.POSITIVE_INFINITY)).toBe(transitVisualScaleForDistance(null));
    });
});