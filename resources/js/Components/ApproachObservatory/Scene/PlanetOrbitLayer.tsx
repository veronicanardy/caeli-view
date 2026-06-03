/**
 * Camada declarativa das órbitas planetárias.
 *
 * Responsabilidade: desenhar elipses orbitais de contexto usando valores já
 * presentes na efeméride da cena. Não calcula efeméride nem decide modo orbital.
 */

import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { PlanetOrbitEllipseHelio } from '../Trajectory/HeliocentricLines';

type PlanetOrbitConfig = {
    semiMajorAU: number;
    eccentricity: number;
    lonPerihelionKey: keyof Pick<SceneEphemeris,
        'mercuryLonPerihelionDeg' | 'venusLonPerihelionDeg' | 'earthLonPerihelionDeg' |
        'marsLonPerihelionDeg' | 'jupiterLonPerihelionDeg' | 'saturnLonPerihelionDeg' |
        'uranusLonPerihelionDeg' | 'neptuneLonPerihelionDeg'>;
    color: string;
    opacity: number;
};

const PLANET_ORBIT_CONFIGS: PlanetOrbitConfig[] = [
    { semiMajorAU: 0.387, eccentricity: 0.2056, lonPerihelionKey: 'mercuryLonPerihelionDeg', color: '#9aa0aa', opacity: 0.08 },
    { semiMajorAU: 0.723, eccentricity: 0.0068, lonPerihelionKey: 'venusLonPerihelionDeg', color: '#c8b870', opacity: 0.08 },
    { semiMajorAU: 1.000, eccentricity: 0.0167, lonPerihelionKey: 'earthLonPerihelionDeg', color: '#5b9bd5', opacity: 0.18 },
    { semiMajorAU: 1.524, eccentricity: 0.0934, lonPerihelionKey: 'marsLonPerihelionDeg', color: '#c0501a', opacity: 0.08 },
    { semiMajorAU: 5.203, eccentricity: 0.0489, lonPerihelionKey: 'jupiterLonPerihelionDeg', color: '#c8a060', opacity: 0.07 },
    { semiMajorAU: 9.537, eccentricity: 0.0565, lonPerihelionKey: 'saturnLonPerihelionDeg', color: '#c8a840', opacity: 0.06 },
    { semiMajorAU: 19.19, eccentricity: 0.0472, lonPerihelionKey: 'uranusLonPerihelionDeg', color: '#4ab8c8', opacity: 0.05 },
    { semiMajorAU: 30.07, eccentricity: 0.0086, lonPerihelionKey: 'neptuneLonPerihelionDeg', color: '#2878d8', opacity: 0.04 },
];

/**
 * Elipses orbitais planetárias, orientadas por longitude de periélio da efeméride.
 */
export function PlanetOrbitLayer({ ephemeris, show }: { ephemeris: SceneEphemeris | null; show: boolean }) {
    if (!show || !ephemeris) return null;

    return (
        <>
            {PLANET_ORBIT_CONFIGS.map((config) => (
                <PlanetOrbitEllipseHelio
                    key={config.lonPerihelionKey}
                    semiMajorAU={config.semiMajorAU}
                    eccentricity={config.eccentricity}
                    lonPerihelionDeg={ephemeris[config.lonPerihelionKey]}
                    color={config.color}
                    opacity={config.opacity}
                />
            ))}
        </>
    );
}
