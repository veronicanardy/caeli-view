import { useEffect, useMemo, useState } from 'react';
import type { OrbitalElements } from '@/types';
import { buildHeliocentricOrbit, helioAUToSunCenteredScene, KM_PER_LD, ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { FocusProtectedHtml, ScreenLabel } from '../Overlays/SceneLabels';
import { Sun } from '../Bodies/Sun/Sun';
import { OrbitLineHelio } from '../Trajectory/HeliocentricLines';

const SUN_RADIUS_KM = 695_700;
const SUN_RADIUS_HELIO = SUN_RADIUS_KM / KM_PER_LD;
const ASTEROID_RADIUS_HELIO = 0.06;

type HeliocentricSceneProps = {
    elements: OrbitalElements;
    asteroidName: string;
    color: string;
    locale: 'pt-BR' | 'en';
};

export function HeliocentricScene({
    elements,
    asteroidName,
    color,
    locale,
}: HeliocentricSceneProps) {
    const en = locale === 'en';

    const orbitPoints = useMemo(
        () => buildHeliocentricOrbit(elements, 256),
        [elements],
    );

    const [asteroidScenePos, setAsteroidScenePos] = useState<[number, number, number] | null>(() => {
        const p = heliocentricPositionAU(elements, new Date());
        return p ? helioAUToSunCenteredScene(p) : null;
    });
    useEffect(() => {
        const tick = () => {
            const p = heliocentricPositionAU(elements, new Date());
            setAsteroidScenePos(p ? helioAUToSunCenteredScene(p) : null);
        };
        tick();
        const id = window.setInterval(tick, 60 * 1000);
        return () => window.clearInterval(id);
    }, [elements]);

    return (
        <group>
            <directionalLight position={[0, 0, 0]} intensity={2.2} color="#fff6e8" />
            <pointLight position={[0, 0, 0]} intensity={0.5} distance={ORBIT_AU_SCALE * 8} color="#ffdca8" />
            <Sun position={[0, 0, 0]} radius={SUN_RADIUS_HELIO} locale={locale} />

            {orbitPoints ? <OrbitLineHelio points={orbitPoints} color={color} opacity={0.95} /> : null}

            {asteroidScenePos ? (
                <group position={asteroidScenePos}>
                    <mesh>
                        <sphereGeometry args={[ASTEROID_RADIUS_HELIO, 24, 24]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.7} />
                    </mesh>
                    <ScreenLabel position={[0, ASTEROID_RADIUS_HELIO + 0.18, 0]} emphasized protectFromFocus={false}>
                        <span className="font-semibold">{asteroidName}</span>
                    </ScreenLabel>
                </group>
            ) : (
                <FocusProtectedHtml position={[0, ORBIT_AU_SCALE * 0.4, 0]}>
                    <div className="rounded-md border border-amber-400/40 bg-space-950/90 px-3 py-2 text-[12px] text-amber-100">
                        {en
                            ? 'Position on this orbit unavailable — elements lack a perihelion epoch.'
                            : 'Posição nesta órbita indisponível — elementos sem época de periélio.'}
                    </div>
                </FocusProtectedHtml>
            )}
        </group>
    );
}
