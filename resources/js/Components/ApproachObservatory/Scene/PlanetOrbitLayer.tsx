import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { PlanetOrbitEllipseHelio } from '../Trajectory/HeliocentricLines';

/**
 * Elipses orbitais planetárias, orientadas por longitude de periélio da efeméride.
 */
export function PlanetOrbitLayer({ ephemeris, show }: { ephemeris: SceneEphemeris | null; show: boolean }) {
    if (!show || !ephemeris) return null;

    return (
        <>
            <PlanetOrbitEllipseHelio semiMajorAU={0.387} eccentricity={0.2056} lonPerihelionDeg={ephemeris.mercuryLonPerihelionDeg} color="#9aa0aa" opacity={0.14} />
            <PlanetOrbitEllipseHelio semiMajorAU={0.723} eccentricity={0.0068} lonPerihelionDeg={ephemeris.venusLonPerihelionDeg} color="#c8b870" opacity={0.14} />
            <PlanetOrbitEllipseHelio semiMajorAU={1.000} eccentricity={0.0167} lonPerihelionDeg={ephemeris.earthLonPerihelionDeg} color="#5b9bd5" opacity={0.30} />
            <PlanetOrbitEllipseHelio semiMajorAU={1.524} eccentricity={0.0934} lonPerihelionDeg={ephemeris.marsLonPerihelionDeg} color="#c0501a" opacity={0.13} />
            <PlanetOrbitEllipseHelio semiMajorAU={5.203} eccentricity={0.0489} lonPerihelionDeg={ephemeris.jupiterLonPerihelionDeg} color="#c8a060" opacity={0.11} />
            <PlanetOrbitEllipseHelio semiMajorAU={9.537} eccentricity={0.0565} lonPerihelionDeg={ephemeris.saturnLonPerihelionDeg} color="#c8a840" opacity={0.09} />
            <PlanetOrbitEllipseHelio semiMajorAU={19.19} eccentricity={0.0472} lonPerihelionDeg={ephemeris.uranusLonPerihelionDeg} color="#4ab8c8" opacity={0.07} />
            <PlanetOrbitEllipseHelio semiMajorAU={30.07} eccentricity={0.0086} lonPerihelionDeg={ephemeris.neptuneLonPerihelionDeg} color="#2878d8" opacity={0.06} />
        </>
    );
}
