/**
 * Mercury — ambient planet for the Orbital Radar scene.
 *
 * POSITION   — SceneEphemeris.mercuryScenePosition via astronomy-engine GeoVector(Body.Mercury).
 * ROTATION   — sidereal period 58.6462 days, anchored to J2000 epoch (not per-session drift).
 * AXIAL TILT — 0.034° (IAU WGCCRE 2015), applied as static quaternion on the pole group.
 * SCALE      — physicalRadiusDl=0.00635 DL (true); visualRadiusDl=0.028 DL (rendered, ~44×).
 * ILLUMINATION — custom ShaderMaterial with sunDir uniform pointing from Mercury toward the Sun,
 *                matching the same approach used by Earth. sunDir = normalize(sunPos - mercuryPos)
 *                computed in world space so the terminator always tracks the visible Sun.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { MERCURY } from '@/lib/observatory/planetData';
import { MERCURY_FRAG, MERCURY_VERT } from '@/lib/observatory/shaders/mercury.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constants ---------------------------------------------------------------

const MERCURY_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / MERCURY.rotationPeriodS;

/**
 * Axial tilt: 0.034° around ecliptic X. Structurally correct so future planets with real
 * obliquity (Venus 177°, Uranus 97°) can follow the same pattern without architecture changes.
 */
const MERCURY_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (MERCURY.axialTiltDeg * Math.PI) / 180,
);

/** J2000.0 epoch as Unix seconds. Rotation angle anchored here for cross-session consistency. */
const J2000_UNIX_S = 946_728_000;

// --------------- Component ---------------------------------------------------------------

interface MercuryProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Mercury({ position, sunDirection, locale, onFocus, isFocused = false, showLabel = true }: MercuryProps) {
    const [hovered, setHovered] = useState(false);

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        cursorPointerEnter();
    };
    const handlePointerOut = () => {
        setHovered(false);
        cursorPointerLeave();
    };
    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onFocus();
    };
    const texture = useEarthTexture(MERCURY.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(MERCURY_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = MERCURY_SPIN_RATE_RAD_PER_S * (nowS - J2000_UNIX_S);

        // sunDir = normalize(sunWorldPos - mercuryWorldPos)
        // sunDirection is already the unit vector Earth→Sun in scene space.
        // The Sun is rendered at sunDirection * SUN_DISPLAY_DL, so the Sun's scene position is
        // sunDirection * SUN_DISPLAY_DL. Mercury is at `position`. We subtract to get the vector
        // pointing from Mercury toward the Sun, then normalize.
        if (matRef.current) {
            const sunWorld = new THREE.Vector3(0, 0, 0);
            const mercuryWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(mercuryWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);

    const material = useMemo(() => {
        // Compute initial sunDir so the first frame is already correct.
        const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
        const mercuryWorld = new THREE.Vector3(...position);
        const initialSunDir = sunWorld.sub(mercuryWorld).normalize();

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: MERCURY_VERT,
                fragmentShader: MERCURY_FRAG,
            });
        }
        // Fallback: plain material while texture loads.
        return new THREE.MeshStandardMaterial({ color: MERCURY.fallbackColor, roughness: 0.95, metalness: 0.0 });
        // sunDirection and position are updated per-frame via uniform; no need to recreate.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    // Label offset: above the sphere, same convention as Moon label
    const labelPos: [number, number, number] = [0, MERCURY.visualRadiusDl + 0.12, 0];

    return (
        <>
            <group position={position}>
                {/* Axial pole group — static tilt; inner mesh spins */}
                <group ref={poleGroupRef}>
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[MERCURY.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>
                </group>

                {/*
                 * Rim glow: aesthetically lifts the silhouette on the night side.
                 * Mercury has no real atmosphere — this is purely visual, kept very faint (0.08).
                 */}
                <mesh scale={1.08}>
                    <sphereGeometry args={[MERCURY.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#c8a87a"
                        transparent
                        opacity={0.08}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

                {!isFocused ? (
                    <mesh
                        onPointerOver={handlePointerOver}
                        onPointerOut={handlePointerOut}
                        onClick={handleClick}
                    >
                        <sphereGeometry args={[MERCURY.visualRadiusDl * 3.5, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                {showLabel ? (
                    <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                        <span className="font-semibold">{locale === 'en' ? 'Mercury' : 'Mercúrio'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </>
    );
}

