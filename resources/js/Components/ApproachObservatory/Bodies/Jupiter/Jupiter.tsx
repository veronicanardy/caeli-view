/**
 * Júpiter na cena do radar orbital.
 *
 * Responsabilidade: renderizar o gigante gasoso como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação rápida,
 * inclinação axial, iluminação atmosférica, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.jupiterScenePosition`.
 * Rotação: período sideral de 0,41354 dias (9 h 55 min), ancorado em J2000.
 * Inclinação axial: 3,13° (IAU WGCCRE 2015), quase perpendicular à eclíptica.
 * Escala: raio físico de 0,18596 DL; raio visual de 0,19 DL, quase sem exagero.
 * Iluminação: shader próprio com atmosfera densa, piso noturno e limb azul-acinzentado.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { JUPITER } from '@/lib/observatory/planetData';
import { JUPITER_FRAG, JUPITER_VERT } from '@/lib/observatory/shaders/jupiter.glsl';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { directionFromBodyToSceneSun } from '../bodyLighting';
import type { PlanetBodyProps } from '../planetBodyTypes';
import { useBodyTexture } from '../useBodyTexture';

// --------------- Constantes ---------------------------------------------------------------

const JUPITER_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / JUPITER.rotationPeriodS;

const JUPITER_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (JUPITER.axialTiltDeg * Math.PI) / 180,
);

// --------------- Componente ---------------------------------------------------------------

export function Jupiter({
    position,
    locale,
    onFocus,
    isFocused = false,
    showLabel = true,
}: PlanetBodyProps) {

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        cursorPointerEnter();
    };

    const handlePointerOut = () => {
        cursorPointerLeave();
    };

    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onFocus();
    };

    const texture = useBodyTexture(JUPITER.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) {
            poleGroupRef.current.quaternion.copy(JUPITER_TILT_QUAT);
        }
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;

        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = JUPITER_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(
                directionFromBodyToSceneSun(position),
            );
        }
    });

    useEffect(() => {
        return () => {
            texture?.dispose();
        };
    }, [texture]);

    const material = useMemo(() => {
        const initialSunDir = directionFromBodyToSceneSun(position);

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

        return new THREE.MeshStandardMaterial({
            color: JUPITER.fallbackColor,
            roughness: 0.85,
            metalness: 0.0,
        });

        // A direção ao Sol da cena é atualizada por frame via uniform.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    const labelPos: [number, number, number] = [0, JUPITER.visualRadiusDl + 0.14, 0];

    return (
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

            {/* Brilho de borda: névoa de H₂/He, azul-acinzentado muito sutil. */}
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

            {showLabel ? (
                <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                    <span className="font-semibold">{locale === 'en' ? 'Jupiter' : 'Júpiter'}</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}
