/**
 * Adaptação de posições para coordenadas de cena.
 *
 * Responsabilidade: converter dados de efeméride já resolvidos em vetores usados
 * pela cena 3D, incluindo fallbacks leves de Sol/Terra/Lua.
 */

import { LINEAR_AU_SCALE, SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { KM_PER_AU, LUNAR_DISTANCE_KM as KM_PER_LD } from '@/lib/physicalConstants';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';

/**
 * Quantas unidades de cena vale 1 DL (distância Terra–Lua) na régua LINEAR heliocêntrica.
 * 1 DL = KM_PER_LD km = (KM_PER_LD / KM_PER_AU) UA; cada UA vale LINEAR_AU_SCALE unidades.
 * Usado para pôr a Lua na MESMA régua dos NEOs no modo linear (escala linear em UA, sem compressão log).
 */
const LINEAR_UNITS_PER_DL = (KM_PER_LD / KM_PER_AU) * LINEAR_AU_SCALE;

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

/**
 * Vetor geocêntrico da Lua na régua LINEAR heliocêntrica (única do radar). `moonScenePosition` vem em
 * DL (1 unid = 1 distância lunar), cru da efeméride; aqui convertemos DL → unidades da régua real
 * (LINEAR_UNITS_PER_DL), SEM compressão. Assim a Lua fica na MESMA régua dos NEOs (a ~0,77 unid da
 * Terra), e as distâncias relativas fazem sentido (Lua perto, NEOs a vários DL mais longe).
 */
export function computeMoonGeoPosition(ephemeris: SceneEphemeris | null): SceneVector {
    const p = ephemeris?.moonScenePosition;
    if (!p) {
        return [LINEAR_UNITS_PER_DL, 0, 0];
    }
    return [p[0] * LINEAR_UNITS_PER_DL, p[1] * LINEAR_UNITS_PER_DL, p[2] * LINEAR_UNITS_PER_DL];
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
    };
}
