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
        'uranusLonPerihelionDeg' | 'neptuneLonPerihelionDeg'>;
    semiMajorKey: keyof Pick<SceneEphemeris,
        'mercurySemiMajorAU' | 'venusSemiMajorAU' | 'earthSemiMajorAU' | 'marsSemiMajorAU' |
        'jupiterSemiMajorAU' | 'saturnSemiMajorAU' | 'uranusSemiMajorAU' | 'neptuneSemiMajorAU'> | null;
    eccentricityKey: keyof Pick<SceneEphemeris,
        'mercuryEccentricity' | 'venusEccentricity' | 'earthEccentricity' | 'marsEccentricity' |
        'jupiterEccentricity' | 'saturnEccentricity' | 'uranusEccentricity' | 'neptuneEccentricity'> | null;
    /** Inclinação e nó ascendente da efeméride. Na Terra são ~0 (derivados do eclíptico), não fixos. */
    inclinationKey: keyof Pick<SceneEphemeris,
        'mercuryInclinationDeg' | 'venusInclinationDeg' | 'earthInclinationDeg' | 'marsInclinationDeg' |
        'jupiterInclinationDeg' | 'saturnInclinationDeg' | 'uranusInclinationDeg' | 'neptuneInclinationDeg'> | null;
    lonAscNodeKey: keyof Pick<SceneEphemeris,
        'mercuryLonAscNodeDeg' | 'venusLonAscNodeDeg' | 'earthLonAscNodeDeg' | 'marsLonAscNodeDeg' |
        'jupiterLonAscNodeDeg' | 'saturnLonAscNodeDeg' | 'uranusLonAscNodeDeg' | 'neptuneLonAscNodeDeg'> | null;
    fallbackSemiMajorAU: number;
    fallbackEccentricity: number;
    color: string;
    opacity: number;
};

const PLANET_ORBIT_CONFIGS: PlanetOrbitConfig[] = [
    { lonPerihelionKey: 'mercuryLonPerihelionDeg', semiMajorKey: 'mercurySemiMajorAU', eccentricityKey: 'mercuryEccentricity', inclinationKey: 'mercuryInclinationDeg', lonAscNodeKey: 'mercuryLonAscNodeDeg', fallbackSemiMajorAU: 0.387,  fallbackEccentricity: 0.2056, color: '#9aa0aa', opacity: 0.08 },
    { lonPerihelionKey: 'venusLonPerihelionDeg',   semiMajorKey: 'venusSemiMajorAU',   eccentricityKey: 'venusEccentricity',   inclinationKey: 'venusInclinationDeg',   lonAscNodeKey: 'venusLonAscNodeDeg',   fallbackSemiMajorAU: 0.723,  fallbackEccentricity: 0.0068, color: '#c8b870', opacity: 0.08 },
    { lonPerihelionKey: 'earthLonPerihelionDeg',   semiMajorKey: 'earthSemiMajorAU',   eccentricityKey: 'earthEccentricity',   inclinationKey: 'earthInclinationDeg',   lonAscNodeKey: 'earthLonAscNodeDeg',   fallbackSemiMajorAU: 1.000,  fallbackEccentricity: 0.0167, color: '#5b9bd5', opacity: 0.18 },
    { lonPerihelionKey: 'marsLonPerihelionDeg',    semiMajorKey: 'marsSemiMajorAU',    eccentricityKey: 'marsEccentricity',    inclinationKey: 'marsInclinationDeg',    lonAscNodeKey: 'marsLonAscNodeDeg',    fallbackSemiMajorAU: 1.524,  fallbackEccentricity: 0.0934, color: '#c0501a', opacity: 0.08 },
    { lonPerihelionKey: 'jupiterLonPerihelionDeg', semiMajorKey: 'jupiterSemiMajorAU', eccentricityKey: 'jupiterEccentricity', inclinationKey: 'jupiterInclinationDeg', lonAscNodeKey: 'jupiterLonAscNodeDeg', fallbackSemiMajorAU: 5.203,  fallbackEccentricity: 0.0489, color: '#c8a060', opacity: 0.07 },
    { lonPerihelionKey: 'saturnLonPerihelionDeg',  semiMajorKey: 'saturnSemiMajorAU',  eccentricityKey: 'saturnEccentricity',  inclinationKey: 'saturnInclinationDeg',  lonAscNodeKey: 'saturnLonAscNodeDeg',  fallbackSemiMajorAU: 9.537,  fallbackEccentricity: 0.0565, color: '#c8a840', opacity: 0.06 },
    { lonPerihelionKey: 'uranusLonPerihelionDeg',  semiMajorKey: 'uranusSemiMajorAU',  eccentricityKey: 'uranusEccentricity',  inclinationKey: 'uranusInclinationDeg',  lonAscNodeKey: 'uranusLonAscNodeDeg',  fallbackSemiMajorAU: 19.19,  fallbackEccentricity: 0.0472, color: '#4ab8c8', opacity: 0.05 },
    { lonPerihelionKey: 'neptuneLonPerihelionDeg', semiMajorKey: 'neptuneSemiMajorAU', eccentricityKey: 'neptuneEccentricity', inclinationKey: 'neptuneInclinationDeg', lonAscNodeKey: 'neptuneLonAscNodeDeg', fallbackSemiMajorAU: 30.07,  fallbackEccentricity: 0.0086, color: '#2878d8', opacity: 0.04 },
];

/**
 * Elipses orbitais planetárias usando elementos osculadores dinâmicos da efeméride.
 * Inclinação e nó ascendente são passados para que a elipse seja 3D, a mesma fonte de
 * geometria (perifocalToEclipticAU) que posiciona o planeta, garantindo que ele caia
 * sobre a linha mesmo com a órbita inclinada. A Terra também usa elementos derivados
 * (i e Ω ~0 do eclíptico, mas não fixos), então sua linha e posição vêm dos mesmos valores.
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
                    inclinationDeg={config.inclinationKey ? ephemeris[config.inclinationKey] : 0}
                    lonAscNodeDeg={config.lonAscNodeKey ? ephemeris[config.lonAscNodeKey] : 0}
                    color={config.color}
                    opacity={config.opacity}
                />
            ))}
        </>
    );
}
