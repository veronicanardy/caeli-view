/**
 * Vênus na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta como corpo ambiente focável, já posicionado
 * pela efeméride da cena. O componente mantém aparência, rotação retrógrada,
 * iluminação atmosférica, hitbox e rótulo; cálculo orbital fica fora dele.
 *
 * Posição: `SceneEphemeris.venusScenePosition`.
 * Rotação: período sideral de -243,018 dias, retrógrado e ancorado em J2000.
 * Inclinação axial: 177,36° (IAU WGCCRE 2015), aplicada no grupo do polo.
 * Escala: raio físico de 0,01573 DL; raio visual de 0,038 DL para legibilidade.
 * Iluminação: shader próprio com atmosfera espessa e `sunDir` calculado de Vênus para o Sol da cena.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { VENUS } from '@/lib/observatory/planetData';
import { VENUS_FRAG, VENUS_VERT } from '@/lib/observatory/shaders/venus.glsl';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { directionFromBodyToSceneSun } from '../bodyLighting';
import type { PlanetBodyProps } from '../planetBodyTypes';
import { useBodyTexture } from '../useBodyTexture';

// --------------- Constantes ---------------------------------------------------------------

/**
 * Vênus tem rotação retrógrada; a taxa negativa preserva o sentido visual correto.
 */
const VENUS_SPIN_RATE_RAD_PER_S = -(2 * Math.PI) / VENUS.rotationPeriodS;

/**
 * Inclinação axial: 177,36° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste. A taxa negativa de
 * rotação codifica o sentido retrógrado; a inclinação define o polo visual.
 */
const VENUS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (VENUS.axialTiltDeg * Math.PI) / 180,
);

// --------------- Componente ---------------------------------------------------------------

export function Venus({
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

    const texture = useBodyTexture(VENUS.texturePath ?? '', 'srgb');
    const atmosphere = useBodyTexture(VENUS.atmospherePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) {
            poleGroupRef.current.quaternion.copy(VENUS_TILT_QUAT);
        }
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;

        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = VENUS_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

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

    useEffect(() => {
        return () => {
            atmosphere?.dispose();
        };
    }, [atmosphere]);

    const material = useMemo(() => {
        const initialSunDir = directionFromBodyToSceneSun(position);

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    atmosphereMap: { value: atmosphere ?? texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: VENUS_VERT,
                fragmentShader: VENUS_FRAG,
            });
        }

        return new THREE.MeshStandardMaterial({
            color: VENUS.fallbackColor,
            roughness: 0.6,
            metalness: 0.0,
        });

        // A direção ao Sol da cena é atualizada por frame via uniform.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture, atmosphere]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    const labelPos: [number, number, number] = [0, VENUS.visualRadiusDl + 0.12, 0];

    return (
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
             * Brilho de borda: atmosfera espessa de CO₂ cria halo âmbar/amarelado
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
    );
}