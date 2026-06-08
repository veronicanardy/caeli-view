import { describe, expect, it } from 'vitest';
import { computeSceneObjectOccluders } from '@/Components/Radar/Scene/sceneOcclusion';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { SUN_RADIUS_SCENE } from '@/Components/Radar/Bodies/bodyRenderConstants';
import type { PlanetScenePositions } from '@/Components/Radar/Scene/scenePositions';

/**
 * `computeSceneObjectOccluders` constrói os volumes de oclusão usados para
 * esconder labels atrás de corpos. Os testes verificam cardinalidade, centros
 * e raios em cada branch (helio vs geocêntrico, planetas null vs presentes).
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
    it('retorna apenas o Sol quando useHelioScene é true', () => {
        const occluders = computeSceneObjectOccluders({
            useHelioScene: true,
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: NO_PLANETS,
        });
        expect(occluders).toHaveLength(1);
        expect(occluders[0].center.x).toBeCloseTo(0, 6);
        expect(occluders[0].radius).toBeCloseTo(SUN_RADIUS_SCENE, 6);
    });

    it('retorna Sol + Terra + Lua + planetas presentes quando useHelioScene é false', () => {
        const occluders = computeSceneObjectOccluders({
            useHelioScene: false,
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: NO_PLANETS,
        });
        // Sem planetas: Sol + Terra + Lua = 3
        expect(occluders).toHaveLength(3);
    });

    it('o oclusor da Terra está centrado em earthPos com raio EARTH_RADIUS_DL', () => {
        const occluders = computeSceneObjectOccluders({
            useHelioScene: false,
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
            useHelioScene: false,
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
            useHelioScene: false,
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
            useHelioScene: false,
            earthPos: EARTH,
            moonPos: MOON,
            planetPositions: allPlanets,
        });
        expect(occluders).toHaveLength(10);
    });
});
