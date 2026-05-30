/**
 * Jupiter — ambient planet for the Orbital Radar scene.
 *
 * POSITION   — SceneEphemeris.jupiterScenePosition via astronomy-engine HelioVector(Body.Jupiter).
 * ROTATION   — sidereal period 0.41354 days (9 h 55 min — fastest-rotating planet).
 *              Anchored to J2000 epoch for cross-session consistency.
 * AXIAL TILT — 3.13° (IAU WGCCRE 2015) — nearly perpendicular to the ecliptic; almost no seasons.
 *              Applied as a static quaternion on the pole group, same as Mercury/Venus/Mars.
 * SCALE      — physicalRadiusDl=0.18596 DL (true equatorial); visualRadiusDl=0.19 DL (rendered, ~1×).
 *              Júpiter é tão grande que renderizamos quase sem exageração — já é visível em escala.
 * ILLUMINATION — custom ShaderMaterial: sunDir uniform pointing from Jupiter toward the Sun.
 *                Shader modela terminador suavizado pela atmosfera densa de H₂/He,
 *                piso noturno elevado (calor interno residual) e limb azul-acinzentado.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { JUPITER } from '@/lib/observatory/planetData';
import { JUPITER_FRAG, JUPITER_VERT } from '@/lib/observatory/shaders/jupiter.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constants ---------------------------------------------------------------

const JUPITER_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / JUPITER.rotationPeriodS;

const JUPITER_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (JUPITER.axialTiltDeg * Math.PI) / 180,
);

/** J2000.0 epoch as Unix seconds. Rotation angle anchored here for cross-session consistency. */
const J2000_UNIX_S = 946_728_000;

// --------------- Component ---------------------------------------------------------------

interface JupiterProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
}

export function Jupiter({ position, sunDirection, locale, onFocus, isFocused = false }: JupiterProps) {
    const [hovered, setHovered] = useState(false);

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
    };
    const handlePointerOut = () => {
        setHovered(false);
        if (typeof document !== 'undefined') document.body.style.cursor = '';
    };
    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onFocus();
    };

    const texture = useEarthTexture(JUPITER.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(JUPITER_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = JUPITER_SPIN_RATE_RAD_PER_S * (nowS - J2000_UNIX_S);

        if (matRef.current) {
            const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
            const jupiterWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(jupiterWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);

    const material = useMemo(() => {
        const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
        const jupiterWorld = new THREE.Vector3(...position);
        const initialSunDir = sunWorld.sub(jupiterWorld).normalize();

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: JUPITER_VERT,
                fragmentShader: JUPITER_FRAG,
            });
        }
        return new THREE.MeshStandardMaterial({ color: JUPITER.fallbackColor, roughness: 0.85, metalness: 0.0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    const labelPos: [number, number, number] = [0, JUPITER.visualRadiusDl + 0.14, 0];

    return (
        <>
            <group position={position}>
                <group ref={poleGroupRef}>
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[JUPITER.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>
                </group>

                {/* Rim glow: névoa de H₂/He na borda — azul-acinzentado muito sutil. */}
                <mesh scale={1.06}>
                    <sphereGeometry args={[JUPITER.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#7090b8"
                        transparent
                        opacity={0.07}
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
                        <sphereGeometry args={[JUPITER.visualRadiusDl * 2.0, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                    <span className="font-semibold">{locale === 'en' ? 'Jupiter' : 'Júpiter'}</span>
                </ScreenLabel>
            </group>
        </>
    );
}
