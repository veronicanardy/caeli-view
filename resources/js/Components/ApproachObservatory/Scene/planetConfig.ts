import type { SceneEphemeris } from '@/lib/sceneEphemeris';

export type PlanetId = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

type PlanetCfg = {
    ephemerisKey: keyof Pick<SceneEphemeris,
        'mercuryScenePosition' | 'venusScenePosition' | 'marsScenePosition' |
        'jupiterScenePosition' | 'saturnScenePosition' | 'uranusScenePosition' | 'neptuneScenePosition'>;
    framingRadius: number;
};

export const PLANET_CONFIG: Record<PlanetId, PlanetCfg> = {
    mercury: { ephemerisKey: 'mercuryScenePosition', framingRadius: 0.028 },
    venus: { ephemerisKey: 'venusScenePosition', framingRadius: 0.038 },
    mars: { ephemerisKey: 'marsScenePosition', framingRadius: 0.048 },
    jupiter: { ephemerisKey: 'jupiterScenePosition', framingRadius: 0.19 },
    saturn: { ephemerisKey: 'saturnScenePosition', framingRadius: 0.16 },
    uranus: { ephemerisKey: 'uranusScenePosition', framingRadius: 0.13 },
    neptune: { ephemerisKey: 'neptuneScenePosition', framingRadius: 0.12 },
};
