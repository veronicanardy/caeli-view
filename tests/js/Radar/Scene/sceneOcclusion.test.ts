import { describe, expect, it } from 'vitest';
import { circleOverlapsRect, computeSceneObjectOccluders, labelHiddenByFocusCircle } from '@/Components/Radar/Scene/sceneOcclusion';
import type { RectPx } from '@/Components/Radar/Scene/sceneOcclusion';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { SUN_RADIUS_SCENE } from '@/Components/Radar/Bodies/bodyRenderConstants';
import type { PlanetScenePositions } from '@/Components/Radar/Scene/scenePositions';

/**
 * `computeSceneObjectOccluders` constrói os volumes de oclusão usados para
 * esconder labels atrás de corpos. Os testes verificam cardinalidade, centros
 * e raios (planetas null vs presentes).
 */

const EARTH: [number, number, number] = [1, 0, 0];
const MOON: [number, number, number] = [1.26, 0, 0];

const NO_PLANETS: PlanetScenePositions = {
    mercuryPos: null,
    venusPos: null,
    marsPos: null,
    jupiterPos: null,
    saturnPos: null,
    uranusPos: null,
    neptunePos: null,
};

describe('computeSceneObjectOccluders', () => {
    it('retorna Sol + Terra + Lua quando não há planetas presentes', () => {
        const occluders = computeSceneObjectOccluders({
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: NO_PLANETS,
        });
        // Sem planetas: Sol + Terra + Lua = 3
        expect(occluders).toHaveLength(3);
        const sun = occluders.find((o) => o.id === 'sun');
        expect(sun).toBeDefined();
        expect(sun!.center.x).toBeCloseTo(0, 6);
        expect(sun!.radius).toBeCloseTo(SUN_RADIUS_SCENE, 6);
    });

    it('o oclusor da Terra está centrado em earthPos com raio EARTH_RADIUS_DL', () => {
        const occluders = computeSceneObjectOccluders({
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: NO_PLANETS,
        });
        const earth = occluders.find((o) => o.radius === EARTH_RADIUS_DL);
        expect(earth).toBeDefined();
        expect(earth!.center.x).toBeCloseTo(1, 6);
    });

    it('o oclusor da Lua está centrado em moonPos com raio MOON_RADIUS_DL', () => {
        const occluders = computeSceneObjectOccluders({
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: NO_PLANETS,
        });
        const moon = occluders.find((o) => o.radius === MOON_RADIUS_DL);
        expect(moon).toBeDefined();
        expect(moon!.center.x).toBeCloseTo(1.26, 6);
    });

    it('inclui planetas presentes e ignora posições null', () => {
        const withMars: PlanetScenePositions = {
            ...NO_PLANETS,
            marsPos: [2, 0, 0],
        };
        const occluders = computeSceneObjectOccluders({
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: withMars,
        });
        // Sol + Terra + Lua + Marte = 4
        expect(occluders).toHaveLength(4);
        const mars = occluders.find((o) => Math.abs(o.center.x - 2) < 0.01);
        expect(mars).toBeDefined();
    });

    it('com todos os planetas presentes retorna 10 oclusores (3 fixos + 7 planetas)', () => {
        const allPlanets: PlanetScenePositions = {
            mercuryPos: [0.5, 0, 0],
            venusPos: [0.7, 0, 0],
            marsPos: [1.5, 0, 0],
            jupiterPos: [5, 0, 0],
            saturnPos: [9, 0, 0],
            uranusPos: [19, 0, 0],
            neptunePos: [30, 0, 0],
        };
        const occluders = computeSceneObjectOccluders({
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: allPlanets,
        });
        expect(occluders).toHaveLength(10);
    });
});

/**
 * `circleOverlapsRect` é o núcleo geométrico do teste de oclusão por corpos rodado por frame em
 * SceneLabels. Os testes cobrem: dentro, fora, tangência, efeito do padding e o corte por
 * raio mínimo (corpos pequenos demais não ocluem).
 */
describe('circleOverlapsRect', () => {
    const RECT: RectPx = { left: 100, top: 100, right: 140, bottom: 120 };

    it('detecta sobreposição quando o centro do corpo está dentro do retângulo', () => {
        expect(circleOverlapsRect(120, 110, 20, RECT, 0, 5)).toBe(true);
    });

    it('não detecta sobreposição quando o corpo está claramente afastado', () => {
        expect(circleOverlapsRect(300, 300, 20, RECT, 0, 5)).toBe(false);
    });

    it('o padding amplia o alcance de oclusão', () => {
        // Centro a 30px à direita da borda direita (x=140), raio 20: sem padding não toca (30 > 20),
        // com padding 15 passa a tocar (30 < 20+15).
        expect(circleOverlapsRect(170, 110, 20, RECT, 0, 5)).toBe(false);
        expect(circleOverlapsRect(170, 110, 20, RECT, 15, 5)).toBe(true);
    });

    it('corpos com raio projetado abaixo do mínimo nunca ocluem', () => {
        // Centro dentro do retângulo, mas raio (3) abaixo do mínimo (5): não oclui.
        expect(circleOverlapsRect(120, 110, 3, RECT, 0, 5)).toBe(false);
    });

    it('é estritamente menor que (tangência exata não oclui)', () => {
        // Centro a 20px da borda direita, raio 20, padding 0: distância == raio, não oclui.
        expect(circleOverlapsRect(160, 110, 20, RECT, 0, 5)).toBe(false);
    });
});

/**
 * `labelHiddenByFocusCircle` esconde labels dentro da silhueta do corpo em foco. O raio de
 * esconder cresce com o corpo mas nunca cai abaixo do mínimo.
 */
describe('labelHiddenByFocusCircle', () => {
    it('esconde o label quando está dentro do raio de esconder (corpo + padding)', () => {
        // Corpo raio 50 + padding 20 = 70; label a 60px do centro: escondido.
        expect(labelHiddenByFocusCircle(60, 0, 0, 0, 50, 30, 20)).toBe(true);
    });

    it('mostra o label fora do raio de esconder', () => {
        // Raio de esconder 70; label a 80px: visível.
        expect(labelHiddenByFocusCircle(80, 0, 0, 0, 50, 30, 20)).toBe(false);
    });

    it('o raio mínimo garante zona limpa mesmo para corpos minúsculos', () => {
        // Corpo raio 1 + padding 5 = 6, mas mínimo 30; label a 20px: ainda escondido pelo mínimo.
        expect(labelHiddenByFocusCircle(20, 0, 0, 0, 1, 30, 5)).toBe(true);
    });
});
