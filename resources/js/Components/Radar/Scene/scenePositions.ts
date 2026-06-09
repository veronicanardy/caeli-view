/**
 * Adaptação de posições para coordenadas de cena.
 *
 * Responsabilidade: converter dados de efeméride já resolvidos em vetores usados
 * pela cena 3D, incluindo fallbacks leves de Sol/Terra/Lua.
 */

import { compressDistanceDl, compressSceneVector, SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';

/**
 * Adapta posições já resolvidas pela efeméride para coordenadas usadas pela cena.
 */
export type SceneVector = [number, number, number];

export type PlanetScenePositions = {
    mercuryPos: SceneVector | null;
    venusPos: SceneVector | null;
    marsPos: SceneVector | null;
    jupiterPos: SceneVector | null;
    saturnPos: SceneVector | null;
    uranusPos: SceneVector | null;
    neptunePos: SceneVector | null;
    plutoPos: SceneVector | null;
};

export function computeSunDirection(ephemeris: SceneEphemeris | null, fallbackSunDirection: SceneVector): SceneVector {
    const ep = ephemeris?.earthScenePosition;
    if (ep) {
        const len = Math.hypot(ep[0], ep[1], ep[2]) || 1;
        return [-ep[0] / len, -ep[1] / len, -ep[2] / len];
    }
    return fallbackSunDirection;
}

export function computeEarthPosition(ephemeris: SceneEphemeris | null, fallbackSunDirection: SceneVector): SceneVector {
    return ephemeris?.earthScenePosition ?? [
        -fallbackSunDirection[0] * SUN_DISPLAY_DL,
        -fallbackSunDirection[1] * SUN_DISPLAY_DL,
        -fallbackSunDirection[2] * SUN_DISPLAY_DL,
    ];
}

export function computeMoonGeoPosition(ephemeris: SceneEphemeris | null): SceneVector {
    const p = ephemeris?.moonScenePosition;
    if (!p) return [compressDistanceDl(1), 0, 0];
    return compressSceneVector(p);
}

export function computeMoonPosition(earthPos: SceneVector, moonGeoPos: SceneVector): SceneVector {
    return [earthPos[0] + moonGeoPos[0], earthPos[1] + moonGeoPos[1], earthPos[2] + moonGeoPos[2]];
}

export function planetScenePositions(ephemeris: SceneEphemeris | null): PlanetScenePositions {
    return {
        mercuryPos: ephemeris?.mercuryScenePosition ?? null,
        venusPos: ephemeris?.venusScenePosition ?? null,
        marsPos: ephemeris?.marsScenePosition ?? null,
        jupiterPos: ephemeris?.jupiterScenePosition ?? null,
        saturnPos: ephemeris?.saturnScenePosition ?? null,
        uranusPos: ephemeris?.uranusScenePosition ?? null,
        neptunePos: ephemeris?.neptuneScenePosition ?? null,
        plutoPos: ephemeris?.plutoScenePosition ?? null,
    };
}
