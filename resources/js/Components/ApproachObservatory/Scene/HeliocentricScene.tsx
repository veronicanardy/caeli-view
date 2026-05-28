import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { OrbitalElements } from '@/types';
import { buildHeliocentricOrbit, helioAUToSunCenteredScene, ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { EARTH_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { FocusProtectedHtml, ScreenLabel } from '../Overlays/SceneLabels';
import { Earth } from '../Bodies/Earth';
import { Sun } from '../Bodies/Sun';
import { EarthOrbitRingHelio, OrbitLineHelio } from '../Bodies/HeliocentricLines';

const KM_PER_LD = 384_400;
const SUN_RADIUS_KM = 695_700;
const SUN_RADIUS_SCENE = SUN_RADIUS_KM / KM_PER_LD;
// --------------- Heliocentric scene (orbit-solar mode) ---------------

/**
 * Visual radii in HELIOCENTRIC scene units. The cluster uses ORBIT_AU_SCALE units per AU, so
 * Earth's physical radius (≈4.26e-5 AU) is sub-pixel. Bodies are exaggerated for legibility, with
 * chip copy making the scale contract explicit to the user. Positions stay honest to AU; only the
 * spheres' visual sizes are amplified.
 *
 * Earth's visible radius is set via the EARTH_RADIUS_DL constant the <Earth> component already
 * uses internally — we wrap that <Earth> in a scaling group, see HeliocentricScene().
 */
const SUN_RADIUS_HELIO = SUN_RADIUS_SCENE;
const ASTEROID_RADIUS_HELIO = 0.06;
const EARTH_VISUAL_SCALE_HELIO = 2.0; // multiplier on EARTH_RADIUS_DL when shown in AU scene.

type HeliocentricSceneProps = {
    elements: OrbitalElements;
    earthHelioPositionAU: { x: number; y: number; z: number } | null;
    fallbackSunDirection: [number, number, number];
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    asteroidName: string;
    color: string;
    locale: 'pt-BR' | 'en';
};

/**
 * The orbit-solar scene. ALL distances live on a LINEAR AU ruler (no log compression), with the
 * Sun at the scene origin. By construction the asteroid (propagated by Kepler) lands on the drawn
 * ellipse — the audit's key correctness bug.
 *
 * Earth is placed at its real heliocentric position (from astronomy-engine when available, or a
 * 1 AU stand-in along the inverted Sun direction otherwise). Body sizes are exaggerated for
 * visibility; positions and orbit shape are honest.
 */
export function HeliocentricScene({
    elements,
    earthHelioPositionAU,
    fallbackSunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    asteroidName,
    color,
    locale,
}: HeliocentricSceneProps) {
    const en = locale === 'en';

    // Earth scene position. If astronomy-engine hasn't resolved yet, place Earth opposite the
    // incoming Sun-direction at exactly 1 AU — geometrically consistent (the Sun *is* at origin),
    // just without the 1.7% eccentricity nuance.
    const earthScenePos = useMemo<[number, number, number]>(() => {
        if (earthHelioPositionAU) {
            return helioAUToSunCenteredScene(earthHelioPositionAU);
        }
        const inv: [number, number, number] = [-fallbackSunDirection[0], -fallbackSunDirection[1], -fallbackSunDirection[2]];
        return [inv[0] * ORBIT_AU_SCALE, inv[1] * ORBIT_AU_SCALE, inv[2] * ORBIT_AU_SCALE];
    }, [earthHelioPositionAU, fallbackSunDirection]);

    // Sun direction AS SEEN FROM EARTH, in scene axes. Used both for the directional light and for
    // orienting Earth's day/night terminator. Sun lives at the origin, so the unit vector from
    // Earth to Sun is simply −normalize(earthScenePos).
    const sunDirFromEarth = useMemo<[number, number, number]>(() => {
        const len = Math.hypot(earthScenePos[0], earthScenePos[1], earthScenePos[2]) || 1;
        return [-earthScenePos[0] / len, -earthScenePos[1] / len, -earthScenePos[2] / len];
    }, [earthScenePos]);

    // Orbit ellipse (Sun-centered AU), built once per elements set.
    const orbitPoints = useMemo(
        () => buildHeliocentricOrbit(elements, 256),
        [elements],
    );

    // Asteroid current heliocentric position via Kepler propagation. Recompute on a slow tick so
    // the marker drifts realistically without forcing a per-frame solve.
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
            {/* Sun at scene origin: directional light + warm point light, plus the same shader Sun
                sphere used in the radar scene (just placed at the origin via SunAtOrigin). */}
            <directionalLight position={[0, 0, 0]} intensity={2.2} color="#fff6e8" />
            <pointLight position={[0, 0, 0]} intensity={0.5} distance={ORBIT_AU_SCALE * 8} color="#ffdca8" />
            <Sun position={[0, 0, 0]} radius={SUN_RADIUS_HELIO} locale={locale} />

            {/* Earth at its real heliocentric position. Same day/night shader as the radar — the Sun
                direction from Earth's frame is just −earthScenePos. Subsolar lat/lon keeps the
                correct continents on the day side. */}
            <group position={earthScenePos} scale={EARTH_VISUAL_SCALE_HELIO}>
                <Earth
                    onFocus={() => { /* no-op: focusing Earth from the helio scene isn't meaningful */ }}
                    sunDirection={sunDirFromEarth}
                    subsolarLatDeg={subsolarLatDeg}
                    subsolarLonDeg={subsolarLonDeg}
                    showLabel
                    protectLabelFromFocus={false}
                />
            </group>

            {/* 1 AU Earth-orbit reference ring (linear AU). Drawn as a circle centered on the Sun
                in the ecliptic plane. */}
            <EarthOrbitRingHelio />

            {/* The asteroid's full Kepler orbit, with Sun at the true focus, exact shape. The whole
                ellipse is rendered brightly so the orbit reads as a continuous path; the marker
                position already signals where "now" is on it. */}
            {orbitPoints ? <OrbitLineHelio points={orbitPoints} color={color} opacity={0.95} /> : null}

            {/* The asteroid itself, propagated by Kepler — by construction sits on the ellipse. */}
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
