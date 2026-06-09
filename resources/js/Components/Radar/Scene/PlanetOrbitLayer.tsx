/**
 * Camada declarativa das órbitas planetárias.
 *
 * Responsabilidade: desenhar elipses orbitais de contexto usando valores já
 * presentes na efeméride da cena. Não calcula efeméride nem decide modo orbital.
 */

import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { PlanetOrbitEllipseHelio } from '../Trajectory/HeliocentricLines';

type PlanetOrbitConfig = {
    lonPerihelionKey: keyof Pick<SceneEphemeris,
        'mercuryLonPerihelionDeg' | 'venusLonPerihelionDeg' | 'earthLonPerihelionDeg' |
        'marsLonPerihelionDeg' | 'jupiterLonPerihelionDeg' | 'saturnLonPerihelionDeg' |
        'uranusLonPerihelionDeg' | 'neptuneLonPerihelionDeg' | 'plutoLonPerihelionDeg'>;
    semiMajorKey: keyof Pick<SceneEphemeris,
        'mercurySemiMajorAU' | 'venusSemiMajorAU' | 'marsSemiMajorAU' |
        'jupiterSemiMajorAU' | 'saturnSemiMajorAU' | 'uranusSemiMajorAU' | 'neptuneSemiMajorAU' |
        'plutoSemiMajorAU'> | null;
    eccentricityKey: keyof Pick<SceneEphemeris,
        'mercuryEccentricity' | 'venusEccentricity' | 'marsEccentricity' |
        'jupiterEccentricity' | 'saturnEccentricity' | 'uranusEccentricity' | 'neptuneEccentricity' |
        'plutoEccentricity'> | null;
    fallbackSemiMajorAU: number;
    fallbackEccentricity: number;
    color: string;
    opacity: number;
};

const PLANET_ORBIT_CONFIGS: PlanetOrbitConfig[] = [
    { lonPerihelionKey: 'mercuryLonPerihelionDeg', semiMajorKey: 'mercurySemiMajorAU', eccentricityKey: 'mercuryEccentricity', fallbackSemiMajorAU: 0.387,  fallbackEccentricity: 0.2056, color: '#9aa0aa', opacity: 0.08 },
    { lonPerihelionKey: 'venusLonPerihelionDeg',   semiMajorKey: 'venusSemiMajorAU',   eccentricityKey: 'venusEccentricity',   fallbackSemiMajorAU: 0.723,  fallbackEccentricity: 0.0068, color: '#c8b870', opacity: 0.08 },
    { lonPerihelionKey: 'earthLonPerihelionDeg',   semiMajorKey: null,                 eccentricityKey: null,                  fallbackSemiMajorAU: 1.000,  fallbackEccentricity: 0.0167, color: '#5b9bd5', opacity: 0.18 },
    { lonPerihelionKey: 'marsLonPerihelionDeg',    semiMajorKey: 'marsSemiMajorAU',    eccentricityKey: 'marsEccentricity',    fallbackSemiMajorAU: 1.524,  fallbackEccentricity: 0.0934, color: '#c0501a', opacity: 0.08 },
    { lonPerihelionKey: 'jupiterLonPerihelionDeg', semiMajorKey: 'jupiterSemiMajorAU', eccentricityKey: 'jupiterEccentricity', fallbackSemiMajorAU: 5.203,  fallbackEccentricity: 0.0489, color: '#c8a060', opacity: 0.07 },
    { lonPerihelionKey: 'saturnLonPerihelionDeg',  semiMajorKey: 'saturnSemiMajorAU',  eccentricityKey: 'saturnEccentricity',  fallbackSemiMajorAU: 9.537,  fallbackEccentricity: 0.0565, color: '#c8a840', opacity: 0.06 },
    { lonPerihelionKey: 'uranusLonPerihelionDeg',  semiMajorKey: 'uranusSemiMajorAU',  eccentricityKey: 'uranusEccentricity',  fallbackSemiMajorAU: 19.19,  fallbackEccentricity: 0.0472, color: '#4ab8c8', opacity: 0.05 },
    { lonPerihelionKey: 'neptuneLonPerihelionDeg', semiMajorKey: 'neptuneSemiMajorAU', eccentricityKey: 'neptuneEccentricity', fallbackSemiMajorAU: 30.07,  fallbackEccentricity: 0.0086, color: '#2878d8', opacity: 0.04 },
    { lonPerihelionKey: 'plutoLonPerihelionDeg',   semiMajorKey: 'plutoSemiMajorAU',   eccentricityKey: 'plutoEccentricity',   fallbackSemiMajorAU: 39.48,  fallbackEccentricity: 0.2488, color: '#c8b89a', opacity: 0.04 },
];

/**
 * Elipses orbitais planetárias usando elementos osculadores dinâmicos da efeméride.
 */
export function PlanetOrbitLayer({ ephemeris, show }: { ephemeris: SceneEphemeris | null; show: boolean }) {
    if (!show || !ephemeris) return null;

    return (
        <>
            {PLANET_ORBIT_CONFIGS.map((config) => (
                <PlanetOrbitEllipseHelio
                    key={config.lonPerihelionKey}
                    semiMajorAU={config.semiMajorKey ? ephemeris[config.semiMajorKey] : config.fallbackSemiMajorAU}
                    eccentricity={config.eccentricityKey ? ephemeris[config.eccentricityKey] : config.fallbackEccentricity}
                    lonPerihelionDeg={ephemeris[config.lonPerihelionKey]}
                    color={config.color}
                    opacity={config.opacity}
                />
            ))}
        </>
    );
}
