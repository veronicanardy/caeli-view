/**
 * Neptune — ambient planet for the Orbital Radar scene.
 *
 * POSITION   — SceneEphemeris.neptuneScenePosition via astronomy-engine HelioVector(Body.Neptune).
 * ROTATION   — sidereal period 0.67125 days (16h 6min, prógrada).
 *              Netuno tem a rotação mais rápida entre os gigantes de gelo.
 *              Anchored to J2000 epoch for cross-session consistency.
 * AXIAL TILT — 28.32° (IAU WGCCRE 2015) — similar à Terra (23.44°); Netuno tem estações
 *              reais, mas cada uma dura ~40 anos devido ao período orbital longo.
 *              Applied as a static quaternion on the pole group.
 * SCALE      — physicalRadiusDl=0.06370 DL (true equatorial); visualRadiusDl=0.12 DL (rendered).
 *              Netuno precisa de exageramento (~1.9×) para ser visível no radar.
 * ILLUMINATION — custom ShaderMaterial: sunDir uniform pointing from Neptune toward the Sun.
 *                Shader modela terminador suavizado pela atmosfera densa de H₂/He/CH₄,
 *                piso noturno elevado (calor interno real ~2.6×) e limb azul-profundo.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { NEPTUNE } from '@/lib/observatory/planetData';
import { NEPTUNE_FRAG, NEPTUNE_VERT } from '@/lib/observatory/shaders/neptune.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constants ---------------------------------------------------------------

const NEPTUNE_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / NEPTUNE.rotationPeriodS;

const NEPTUNE_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (NEPTUNE.axialTiltDeg * Math.PI) / 180,
);

/** J2000.0 epoch as Unix seconds. Rotation angle anchored here for cross-session consistency. */
const J2000_UNIX_S = 946_728_000;

// --------------- Component ---------------------------------------------------------------

interface NeptuneProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
}

export function Neptune({ position, sunDirection, locale, onFocus, isFocused = false }: NeptuneProps) {
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

    const texture = useEarthTexture(NEPTUNE.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(NEPTUNE_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = NEPTUNE_SPIN_RATE_RAD_PER_S * (nowS - J2000_UNIX_S);

        if (matRef.current) {
            const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
            const neptuneWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(neptuneWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);

    const material = useMemo(() => {
        const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
        const neptuneWorld = new THREE.Vector3(...position);
        const initialSunDir = sunWorld.sub(neptuneWorld).normalize();

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: NEPTUNE_VERT,
                fragmentShader: NEPTUNE_FRAG,
            });
        }
        return new THREE.MeshStandardMaterial({ color: NEPTUNE.fallbackColor, roughness: 0.85, metalness: 0.0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    const labelPos: [number, number, number] = [0, NEPTUNE.visualRadiusDl + 0.08, 0];

    return (
        <>
            <group position={position}>
                <group ref={poleGroupRef}>
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[NEPTUNE.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>
                </group>

                {/* Rim glow: halo azul-profundo — borda de metano + cromóforo de Netuno. */}
                <mesh scale={1.06}>
                    <sphereGeometry args={[NEPTUNE.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#2060c8"
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
                        <sphereGeometry args={[NEPTUNE.visualRadiusDl * 1.3, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                    <span className="font-semibold">{locale === 'en' ? 'Neptune' : 'Netuno'}</span>
                </ScreenLabel>
            </group>
        </>
    );
}
