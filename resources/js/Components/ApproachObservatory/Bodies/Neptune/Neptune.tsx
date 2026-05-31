/**
 * Netuno na cena do radar orbital.
 *
 * Responsabilidade: renderizar o gigante de gelo como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação,
 * inclinação axial, iluminação atmosférica, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.neptuneScenePosition`.
 * Rotação: período sideral de 0,67125 dias (16 h 6 min), ancorado em J2000.
 * Inclinação axial: 28,32° (IAU WGCCRE 2015), aplicada ao grupo do polo.
 * Escala: raio físico de 0,06370 DL; raio visual de 0,12 DL para legibilidade.
 * Iluminação: shader próprio com atmosfera densa, calor interno e limb azul-profundo.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { NEPTUNE } from '@/lib/observatory/planetData';
import { NEPTUNE_FRAG, NEPTUNE_VERT } from '@/lib/observatory/shaders/neptune.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constantes ---------------------------------------------------------------

const NEPTUNE_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / NEPTUNE.rotationPeriodS;

const NEPTUNE_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (NEPTUNE.axialTiltDeg * Math.PI) / 180,
);

// --------------- Componente ---------------------------------------------------------------

interface NeptuneProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Neptune({ position, sunDirection, locale, onFocus, isFocused = false, showLabel = true }: NeptuneProps) {
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
        meshRef.current.rotation.y = NEPTUNE_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

        if (matRef.current) {
            const sunWorld = new THREE.Vector3(0, 0, 0);
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

                {/* Brilho de borda: halo azul-profundo de metano e cromóforos de Netuno. */}
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

                {showLabel ? (
                    <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                        <span className="font-semibold">{locale === 'en' ? 'Neptune' : 'Netuno'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </>
    );
}
