/**
 * Venus — ambient planet for the Orbital Radar scene.
 *
 * POSITION   — SceneEphemeris.venusScenePosition via astronomy-engine HelioVector(Body.Venus).
 * ROTATION   — sidereal period −243.018 days (retrograde); spin rate is negative.
 *              Anchored to J2000 epoch for cross-session consistency.
 * AXIAL TILT — 177.36° (IAU WGCCRE 2015) — effectively upside-down / retrograde rotation.
 *              Applied as a static quaternion on the pole group, same as Mercury.
 * SCALE      — physicalRadiusDl=0.01573 DL (true); visualRadiusDl=0.038 DL (rendered, ~24×).
 * ILLUMINATION — custom ShaderMaterial matching Mercury's approach: sunDir uniform pointing
 *                from Venus toward the Sun in world space. Shader adds thick atmospheric limb glow.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { VENUS } from '@/lib/observatory/planetData';
import { VENUS_FRAG, VENUS_VERT } from '@/lib/observatory/shaders/venus.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constants ---------------------------------------------------------------

// Retrograde: negative spin rate (Venus rotates opposite to most planets).
const VENUS_SPIN_RATE_RAD_PER_S = -(2 * Math.PI) / VENUS.rotationPeriodS;

/**
 * Axial tilt: 177.36° around ecliptic X — Venus is essentially upside-down.
 * The negative spin rate already encodes retrograde; the tilt sets the pole orientation.
 */
const VENUS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (VENUS.axialTiltDeg * Math.PI) / 180,
);

/** J2000.0 epoch as Unix seconds. Rotation angle anchored here for cross-session consistency. */
const J2000_UNIX_S = 946_728_000;

// --------------- Component ---------------------------------------------------------------

interface VenusProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Venus({ position, sunDirection, locale, onFocus, isFocused = false, showLabel = true }: VenusProps) {
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

    const texture = useEarthTexture(VENUS.texturePath ?? '', 'srgb');
    const atmosphere = useEarthTexture(VENUS.atmospherePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(VENUS_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = VENUS_SPIN_RATE_RAD_PER_S * (nowS - J2000_UNIX_S);

        if (matRef.current) {
            const sunWorld = new THREE.Vector3(0, 0, 0);
            const venusWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(venusWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);
    useEffect(() => { return () => { atmosphere?.dispose(); }; }, [atmosphere]);

    const material = useMemo(() => {
        const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
        const venusWorld = new THREE.Vector3(...position);
        const initialSunDir = sunWorld.sub(venusWorld).normalize();

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap:     { value: texture },
                    atmosphereMap:  { value: atmosphere ?? texture },
                    sunDir:         { value: initialSunDir },
                },
                vertexShader: VENUS_VERT,
                fragmentShader: VENUS_FRAG,
            });
        }
        return new THREE.MeshStandardMaterial({ color: VENUS.fallbackColor, roughness: 0.6, metalness: 0.0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture, atmosphere]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    const labelPos: [number, number, number] = [0, VENUS.visualRadiusDl + 0.12, 0];

    return (
        <>
            <group position={position}>
                <group ref={poleGroupRef}>
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[VENUS.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>
                </group>

                {/*
                 * Rim glow: atmosfera espessa de CO₂ cria halo âmbar/amarelado
                 * claramente visível — mais proeminente que em Mercúrio.
                 */}
                <mesh scale={1.12}>
                    <sphereGeometry args={[VENUS.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#c8a040"
                        transparent
                        opacity={0.13}
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
                        <sphereGeometry args={[VENUS.visualRadiusDl * 3.5, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                {showLabel ? (
                    <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                        <span className="font-semibold">{locale === 'en' ? 'Venus' : 'Vênus'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </>
    );
}
