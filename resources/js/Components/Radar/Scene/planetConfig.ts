/**
 * Configuração compartilhada dos planetas focáveis da cena.
 *
 * Responsabilidade: centralizar IDs, chaves de efeméride e raios usados por
 * enquadramento, evitando listas divergentes entre controles e cena.
 */

import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import {
    JUPITER, MARS, MERCURY, NEPTUNE, SATURN, URANUS, VENUS, type PlanetDatum,
} from '@/lib/radar/planetData';

/**
 * Mapeia cada planeta focalizável para sua posição de efeméride e raio de enquadramento.
 */
export type PlanetId = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

type PlanetCfg = {
    ephemerisKey: keyof Pick<SceneEphemeris,
        'mercuryScenePosition' | 'venusScenePosition' | 'marsScenePosition' |
        'jupiterScenePosition' | 'saturnScenePosition' | 'uranusScenePosition' | 'neptuneScenePosition'>;
    /**
     * Raio usado pelo enquadramento de câmera (framingForBody → distância = raio × BODY_FOCUS_MULTIPLIER).
     * É DERIVADO de planetData.visualRadiusDl, nunca repetido à mão: uma cópia manual ficou para trás
     * uma vez (Vênus em 0,038 enquanto o globo já renderizava 0,10), enquadrando o planeta colado.
     * Travado por planetConfig.test.ts contra futura dessincronização. Como TODO planeta usa o mesmo
     * multiplicador único, este raio é o que faz Júpiter ter globo maior que Mercúrio na tela — mas
     * ambos ocupam a MESMA fração do quadro (regra "tudo igual" da Verônica).
     */
    framingRadius: number;
};

const PLANET_DATA: Record<PlanetId, PlanetDatum> = {
    mercury: MERCURY,
    venus: VENUS,
    mars: MARS,
    jupiter: JUPITER,
    saturn: SATURN,
    uranus: URANUS,
    neptune: NEPTUNE,
};

const EPHEMERIS_KEY: Record<PlanetId, PlanetCfg['ephemerisKey']> = {
    mercury: 'mercuryScenePosition',
    venus: 'venusScenePosition',
    mars: 'marsScenePosition',
    jupiter: 'jupiterScenePosition',
    saturn: 'saturnScenePosition',
    uranus: 'uranusScenePosition',
    neptune: 'neptuneScenePosition',
};

export const PLANET_CONFIG: Record<PlanetId, PlanetCfg> = Object.fromEntries(
    (Object.keys(EPHEMERIS_KEY) as PlanetId[]).map((id) => [
        id,
        {
            ephemerisKey: EPHEMERIS_KEY[id],
            framingRadius: PLANET_DATA[id].visualRadiusDl,
        },
    ]),
) as Record<PlanetId, PlanetCfg>;