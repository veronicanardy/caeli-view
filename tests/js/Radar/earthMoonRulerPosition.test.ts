/**
 * Contrato da régua de referência Terra · Lua · Objeto (widget 2D do card de foco).
 *
 * Esta régua NÃO é a cena 3D (que é linear). É um widget SVG de referência com três regimes:
 * linear da Terra à Lua (0–1 DL), linear esticado (1–5 DL) e encurtado (>5 DL) para caber objetos
 * distantes. Os testes travam dois invariantes que a mantêm legível e honesta:
 *
 *  1. Monotonicidade: distância maior nunca recua na régua (senão a posição enganaria).
 *  2. Continuidade nas junções (1 DL e 5 DL): sem saltos visuais que falseiem a leitura.
 *  3. Âncoras: 0 DL na Terra, 1 DL exatamente sobre a Lua, e nada ultrapassa a borda direita.
 */

import { describe, expect, it } from 'vitest';
import {
    EARTH_X,
    LINEAR_MAX,
    MOON_X,
    RIGHT_EDGE,
    positionForLunarDistance,
} from '@/Components/Radar/Presenters/EarthMoonRuler';

describe('positionForLunarDistance — régua Terra·Lua·Objeto', () => {
    it('ancora a Terra em 0 DL e a Lua exatamente em 1 DL', () => {
        expect(positionForLunarDistance(0)).toBe(EARTH_X);
        expect(positionForLunarDistance(1)).toBeCloseTo(MOON_X, 6);
    });

    it('distâncias não-positivas colapsam na Terra (sem posição negativa)', () => {
        expect(positionForLunarDistance(-3)).toBe(EARTH_X);
        expect(positionForLunarDistance(0)).toBe(EARTH_X);
    });

    it('é monotônica não-decrescente em toda a faixa', () => {
        let prev = -Infinity;
        for (let dl = 0; dl <= 60; dl += 0.25) {
            const x = positionForLunarDistance(dl);
            expect(x).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = x;
        }
    });

    it('é contínua na junção Lua (1 DL): os dois regimes lineares se encontram', () => {
        const left = positionForLunarDistance(1 - 1e-6);
        const right = positionForLunarDistance(1 + 1e-6);
        expect(Math.abs(right - left)).toBeLessThan(0.5);
    });

    it(`é contínua na junção do regime encurtado (${LINEAR_MAX} DL)`, () => {
        const left = positionForLunarDistance(LINEAR_MAX - 1e-6);
        const right = positionForLunarDistance(LINEAR_MAX + 1e-6);
        expect(Math.abs(right - left)).toBeLessThan(0.5);
    });

    it('nunca ultrapassa a borda direita, mesmo para distâncias enormes', () => {
        for (const dl of [10, 50, 200, 1000]) {
            expect(positionForLunarDistance(dl)).toBeLessThanOrEqual(RIGHT_EDGE + 1e-6);
        }
    });
});
