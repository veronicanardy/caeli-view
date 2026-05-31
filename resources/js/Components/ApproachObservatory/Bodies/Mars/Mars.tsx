/**
 * Marte na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta como corpo ambiente focável, já posicionado
 * pela efeméride da cena. O componente cuida de textura, rotação, inclinação axial,
 * iluminação, hitbox e rótulo; trajetória e efeméride permanecem fora dele.
 *
 * Posição: `SceneEphemeris.marsScenePosition`.
 * Rotação: período sideral de 1,02596 dias, prógrado e ancorado em J2000.
 * Inclinação axial: 25,19° (IAU WGCCRE 2015), próxima à da Terra.
 * Escala: raio físico de 0,00877 DL; raio visual de 0,048 DL para legibilidade.
 * Iluminação: shader próprio com terminador mais abrupto e limb avermelhado de poeira.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { MARS } from '@/lib/observatory/planetData';
import { MARS_FRAG, MARS_VERT } from '@/lib/observatory/shaders/mars.glsl';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { directionFromBodyToSceneSun } from '../bodyLighting';
import type { PlanetBodyProps } from '../planetBodyTypes';
import { useBodyTexture } from '../useBodyTexture';

// --------------- Constantes ---------------------------------------------------------------

const MARS_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / MARS.rotationPeriodS;

const MARS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (MARS.axialTiltDeg * Math.PI) / 180,
);

// --------------- Componente ---------------------------------------------------------------

export function Mars({
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

    const texture = useBodyTexture(MARS.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) {
            poleGroupRef.current.quaternion.copy(MARS_TILT_QUAT);
        }
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;

        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = MARS_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

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
                vertexShader: MARS_VERT,
                fragmentShader: MARS_FRAG,
            });
        }

        return new THREE.MeshStandardMaterial({
            color: MARS.fallbackColor,
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

    const labelPos: [number, number, number] = [0, MARS.visualRadiusDl + 0.12, 0];

    return (
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

            {/* Brilho de borda: névoa de poeira marciana, vermelho/ferrugem muito sutil. */}
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
    );
}
