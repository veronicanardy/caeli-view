import { describe, expect, it } from 'vitest';
import { SUN_DISPLAY_DL, compressDistanceDl } from '@/lib/sceneEphemeris';
import {
    computeEarthPosition,
    computeMoonGeoPosition,
    computeMoonPosition,
    computeSunDirection,
} from '@/Components/Radar/Scene/scenePositions';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';

/**
 * `scenePositions` adapta dados de efeméride para coordenadas de cena.
 * Os testes validam normalização, fallback com servidor e composição de vetores.
 */

const FALLBACK: [number, number, number] = [1, 0, 0];

/** Cria um SceneEphemeris mínimo com apenas earthScenePosition preenchido. */
function makeEphemeris(earth: [number, number, number]): SceneEphemeris {
    return { earthScenePosition: earth } as unknown as SceneEphemeris;
}

// ─── computeSunDirection ──────────────────────────────────────────────────────

describe('computeSunDirection', () => {
    it('usa o fallback do servidor quando a efeméride é null', () => {
        const dir = computeSunDirection(null, FALLBACK);
        expect(dir).toEqual(FALLBACK);
    });

    it('inverte e normaliza earthScenePosition para obter Terra→Sol', () => {
        // Terra em [3, 4, 0] → Sol está na origem → direção = normalize([−3, −4, 0])
        const dir = computeSunDirection(makeEphemeris([3, 4, 0]), FALLBACK);
        expect(dir[0]).toBeCloseTo(-3 / 5, 10);
        expect(dir[1]).toBeCloseTo(-4 / 5, 10);
        expect(dir[2]).toBeCloseTo(0, 10);
    });

    it('retorna vetor unitário para qualquer posição válida da Terra', () => {
        const dir = computeSunDirection(makeEphemeris([1, 2, 2]), FALLBACK);
        const len = Math.hypot(...dir);
        expect(len).toBeCloseTo(1, 10);
    });

    it('não produz NaN quando earthScenePosition é a origem (caso degenerado)', () => {
        // A implementação usa `|| 1` para evitar divisão por zero.
        const dir = computeSunDirection(makeEphemeris([0, 0, 0]), FALLBACK);
        expect(dir.every(Number.isFinite)).toBe(true);
    });
});

// ─── computeEarthPosition ─────────────────────────────────────────────────────

describe('computeEarthPosition', () => {
    it('usa o fallback quando a efeméride é null', () => {
        // fallback [1, 0, 0] → Terra fica em [-SUN_DISPLAY_DL, 0, 0]
        const pos = computeEarthPosition(null, [1, 0, 0]);
        expect(pos[0]).toBeCloseTo(-SUN_DISPLAY_DL, 6);
        expect(pos[1]).toBeCloseTo(0, 6);
        expect(pos[2]).toBeCloseTo(0, 6);
    });

    it('retorna earthScenePosition da efeméride quando disponível', () => {
        const earth: [number, number, number] = [2, 3, 4];
        const pos = computeEarthPosition(makeEphemeris(earth), FALLBACK);
        expect(pos).toEqual(earth);
    });

    it('o fallback coloca a Terra na direção oposta ao Sol', () => {
        // sunDir = [0, 1, 0] → fallback → Terra em [0, -SUN_DISPLAY_DL, 0]
        const pos = computeEarthPosition(null, [0, 1, 0]);
        expect(pos[0]).toBeCloseTo(0, 6);
        expect(pos[1]).toBeCloseTo(-SUN_DISPLAY_DL, 6);
        expect(pos[2]).toBeCloseTo(0, 6);
    });
});

// ─── computeMoonGeoPosition ───────────────────────────────────────────────────

describe('computeMoonGeoPosition', () => {
    it('retorna fallback em [compressDistanceDl(1), 0, 0] quando efeméride é null', () => {
        const pos = computeMoonGeoPosition(null);
        expect(pos[0]).toBeCloseTo(compressDistanceDl(1), 10);
        expect(pos[1]).toBe(0);
        expect(pos[2]).toBe(0);
    });

    it('retorna posição comprimida quando efeméride tem moonScenePosition', () => {
        // Posição bruta em DL; compressSceneVector aplica log-compressão em cada eixo.
        const ephemeris = { moonScenePosition: [1, 0, 0] } as unknown as SceneEphemeris;
        const pos = computeMoonGeoPosition(ephemeris);
        // Resultado deve ser finito e não nulo.
        expect(pos.every(Number.isFinite)).toBe(true);
        expect(pos[0]).toBeGreaterThan(0);
    });
});

// ─── computeMoonPosition ──────────────────────────────────────────────────────

describe('computeMoonPosition', () => {
    it('soma earthPos e moonGeoPos componente a componente', () => {
        const earth: [number, number, number] = [1, 2, 3];
        const geo: [number, number, number] = [0.1, 0.2, 0.3];
        const moon = computeMoonPosition(earth, geo);
        expect(moon[0]).toBeCloseTo(1.1, 10);
        expect(moon[1]).toBeCloseTo(2.2, 10);
        expect(moon[2]).toBeCloseTo(3.3, 10);
    });

    it('com geo em zero, a Lua fica na mesma posição da Terra', () => {
        const earth: [number, number, number] = [5, 6, 7];
        const geo: [number, number, number] = [0, 0, 0];
        expect(computeMoonPosition(earth, geo)).toEqual([5, 6, 7]);
    });
});
