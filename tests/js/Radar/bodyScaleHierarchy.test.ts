/**
 * Invariantes da HIERARQUIA visual dos corpos da cena radar.
 *
 * A escala não é fiel à realidade (seria sub-pixel), mas a LEITURA precisa estar correta: o Sol
 * domina, os gigantes parecem maiores que os rochosos, a Terra é maior que a Lua, e nenhum
 * asteroide compete com um planeta. Estes testes travam essas relações para que um reajuste de
 * `visualRadiusDl` (ou um erro de digitação) não inverta a hierarquia sem ser percebido.
 *
 * Fonte dos valores: planetData.ts (planetas), bodyScale.ts (Terra/Lua), bodyRenderConstants.ts (Sol).
 */

import { describe, expect, it } from 'vitest';
import {
    JUPITER, MARS, MERCURY, NEPTUNE, SATURN, URANUS, VENUS,
} from '@/lib/radar/planetData';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { SUN_VISUAL_RADIUS_DL } from '@/Components/Radar/Bodies/bodyRenderConstants';

/** Fator aplicado ao raio da Lua no modo linear (padrão), ver RadarScene.tsx. */
const LINEAR_MOON_SCALE = 0.54;

describe('hierarquia visual dos planetas', () => {
    it('gigantes gasosos > gigantes de gelo > Terra', () => {
        expect(JUPITER.visualRadiusDl).toBeGreaterThan(SATURN.visualRadiusDl);
        expect(SATURN.visualRadiusDl).toBeGreaterThan(URANUS.visualRadiusDl);
        expect(URANUS.visualRadiusDl).toBeGreaterThanOrEqual(NEPTUNE.visualRadiusDl);
        expect(NEPTUNE.visualRadiusDl).toBeGreaterThan(EARTH_RADIUS_DL);
    });

    it('Terra > Vênus > Mercúrio, e Marte < Terra', () => {
        expect(EARTH_RADIUS_DL).toBeGreaterThan(VENUS.visualRadiusDl);
        expect(VENUS.visualRadiusDl).toBeGreaterThan(MERCURY.visualRadiusDl);
        expect(MARS.visualRadiusDl).toBeLessThan(EARTH_RADIUS_DL);
    });

    it('Vênus é o planeta-irmão da Terra: próximo em tamanho (entre 70% e 100%)', () => {
        const ratio = VENUS.visualRadiusDl / EARTH_RADIUS_DL;
        expect(ratio).toBeGreaterThan(0.7);
        expect(ratio).toBeLessThan(1.0);
    });

    it('Mercúrio é o menor planeta da cena', () => {
        const planets = [MERCURY, VENUS, MARS, JUPITER, SATURN, URANUS, NEPTUNE].map((p) => p.visualRadiusDl);
        expect(Math.min(...planets)).toBe(MERCURY.visualRadiusDl);
    });
});

describe('Terra × Lua', () => {
    it('a Lua é claramente menor que a Terra, mesmo no tamanho normal', () => {
        expect(MOON_RADIUS_DL).toBeLessThan(EARTH_RADIUS_DL);
    });

    it('a Lua continua menor que a Terra no modo linear (com radiusScale 0,54)', () => {
        expect(MOON_RADIUS_DL * LINEAR_MOON_SCALE).toBeLessThan(EARTH_RADIUS_DL);
    });

    it('a Lua é menor que o menor planeta (Mercúrio), no modo linear', () => {
        expect(MOON_RADIUS_DL * LINEAR_MOON_SCALE).toBeLessThan(MERCURY.visualRadiusDl);
    });
});

describe('o Sol domina a cena', () => {
    it('o Sol é muitas vezes maior que o maior planeta (Júpiter)', () => {
        expect(SUN_VISUAL_RADIUS_DL).toBeGreaterThan(5 * JUPITER.visualRadiusDl);
    });

    it('o Sol é muito maior que a Terra', () => {
        expect(SUN_VISUAL_RADIUS_DL).toBeGreaterThan(10 * EARTH_RADIUS_DL);
    });
});
