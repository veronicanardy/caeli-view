import { describe, expect, it } from 'vitest';
import { cometActivityFromSunDistanceAu } from '@/Components/Radar/Bodies/Comet/CometTail';

/**
 * Atividade do cometa por distância ao Sol: cometa só ganha cauda perto do Sol (o calor sublima o gelo).
 * A função dá 1 dentro de ~1,8 UA, cai suave (smoothstep) até 0 em ~3 UA, e 0 além disso. Cobre o que
 * decide se/quanto de cauda desenhar; o resto do CometTail é render 3D não testável de forma pura.
 */
describe('cometActivityFromSunDistanceAu', () => {
    it('atividade total perto do Sol (<= 1,8 UA)', () => {
        expect(cometActivityFromSunDistanceAu(0)).toBe(1);
        expect(cometActivityFromSunDistanceAu(1)).toBe(1);
        expect(cometActivityFromSunDistanceAu(1.8)).toBe(1);
    });

    it('sem cauda longe do Sol (>= 3 UA)', () => {
        expect(cometActivityFromSunDistanceAu(3)).toBe(0);
        expect(cometActivityFromSunDistanceAu(3.2)).toBe(0);
        expect(cometActivityFromSunDistanceAu(10)).toBe(0);
    });

    it('cai de forma monotônica e suave entre 1,8 e 3 UA', () => {
        const a = cometActivityFromSunDistanceAu(2.1);
        const b = cometActivityFromSunDistanceAu(2.4);
        const c = cometActivityFromSunDistanceAu(2.7);
        // Estritamente decrescente, sempre dentro de (0, 1).
        expect(a).toBeGreaterThan(b);
        expect(b).toBeGreaterThan(c);
        expect(a).toBeLessThan(1);
        expect(c).toBeGreaterThan(0);
    });

    it('no meio da rampa (2,4 UA) fica perto de 0,5 (smoothstep simétrica)', () => {
        expect(cometActivityFromSunDistanceAu(2.4)).toBeCloseTo(0.5, 5);
    });
});
