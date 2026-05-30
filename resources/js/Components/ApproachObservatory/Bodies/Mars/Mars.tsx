/**
 * Mars — ambient planet for the Orbital Radar scene.
 *
 * POSITION   — SceneEphemeris.marsScenePosition via astronomy-engine HelioVector(Body.Mars).
 * ROTATION   — sidereal period 1.02596 days (prograde, same direction as Earth).
 *              Anchored to J2000 epoch for cross-session consistency.
 * AXIAL TILT — 25.19° (IAU WGCCRE 2015) — similar to Earth's 23.44°, seasons on Mars are real.
 *              Applied as a static quaternion on the pole group, same as Mercury/Venus.
 * SCALE      — physicalRadiusDl=0.00877 DL (true); visualRadiusDl=0.048 DL (rendered, ~55×).
 *              Marte é ~53% do raio terrestre — renderizamos entre Vênus (0.038) e Terra (0.11).
 * ILLUMINATION — custom ShaderMaterial: sunDir uniform pointing from Mars toward the Sun.
 *                Shader modela terminador abrupto (atmosfera fina) e limb avermelhado de poeira.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { MARS } from '@/lib/observatory/planetData';
import { MARS_FRAG, MARS_VERT } from '@/lib/observatory/shaders/mars.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constants ---------------------------------------------------------------

const MARS_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / MARS.rotationPeriodS;

const MARS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (MARS.axialTiltDeg * Math.PI) / 180,
);

/** J2000.0 epoch as Unix seconds. Rotation angle anchored here for cross-session consistency. */
const J2000_UNIX_S = 946_728_000;

// --------------- Component ---------------------------------------------------------------

interface MarsProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Mars({ position, sunDirection, locale, onFocus, isFocused = false, showLabel = true }: MarsProps) {
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

    const texture = useEarthTexture(MARS.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(MARS_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = MARS_SPIN_RATE_RAD_PER_S * (nowS - J2000_UNIX_S);

        if (matRef.current) {
            const sunWorld = new THREE.Vector3(0, 0, 0);
            const marsWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(marsWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);

    const material = useMemo(() => {
        const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
        const marsWorld = new THREE.Vector3(...position);
        const initialSunDir = sunWorld.sub(marsWorld).normalize();

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: MARS_VERT,
                fragmentShader: MARS_FRAG,
            });
        }
        return new THREE.MeshStandardMaterial({ color: MARS.fallbackColor, roughness: 0.85, metalness: 0.0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    const labelPos: [number, number, number] = [0, MARS.visualRadiusDl + 0.12, 0];

    return (
        <>
            <group position={position}>
                <group ref={poleGroupRef}>
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[MARS.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>
                </group>

                {/* Rim glow: névoa de poeira marciana — vermelho/ferrugem muito sutil. */}
                <mesh scale={1.08}>
                    <sphereGeometry args={[MARS.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#c0501a"
                        transparent
                        opacity={0.09}
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
                        <sphereGeometry args={[MARS.visualRadiusDl * 3.5, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                {showLabel ? (
                    <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                        <span className="font-semibold">{locale === 'en' ? 'Mars' : 'Marte'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </>
    );
}
