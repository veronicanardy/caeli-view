/**
 * Urano na cena do radar orbital.
 *
 * Responsabilidade: renderizar o gigante de gelo como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação retrógrada,
 * inclinação axial extrema, iluminação atmosférica, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.uranusScenePosition`.
 * Rotação: período sideral de -0,71833 dias, retrógrado e ancorado em J2000.
 * Inclinação axial: 97,77° (IAU WGCCRE 2015), quase “de lado” em relação à órbita.
 * Escala: raio físico de 0,06629 DL; raio visual de 0,13 DL para legibilidade.
 * Iluminação: shader próprio com atmosfera de H₂/He/CH₄ e limb ciano-azulado.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { URANUS } from '@/lib/observatory/planetData';
import { URANUS_FRAG, URANUS_VERT } from '@/lib/observatory/shaders/uranus.glsl';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constantes ---------------------------------------------------------------

// Urano tem rotação retrógrada: taxa negativa para girar no sentido correto.
const URANUS_SPIN_RATE_RAD_PER_S = -(2 * Math.PI) / URANUS.rotationPeriodS;

const URANUS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (URANUS.axialTiltDeg * Math.PI) / 180,
);

function directionFromBodyToSceneSun(
    bodyPosition: [number, number, number],
): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0)
        .sub(new THREE.Vector3(...bodyPosition))
        .normalize();
}

// --------------- Componente ---------------------------------------------------------------

interface UranusProps {
    position: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Uranus({ position, locale, onFocus, isFocused = false, showLabel = true }: UranusProps) {
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

    const texture = useEarthTexture(URANUS.texturePath ?? '', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(URANUS_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = URANUS_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(
                directionFromBodyToSceneSun(position),
            );
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);

    const material = useMemo(() => {
        const initialSunDir = directionFromBodyToSceneSun(position);

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: URANUS_VERT,
                fragmentShader: URANUS_FRAG,
            });
        }
        return new THREE.MeshStandardMaterial({ color: URANUS.fallbackColor, roughness: 0.85, metalness: 0.0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    const labelPos: [number, number, number] = [0, URANUS.visualRadiusDl + 0.08, 0];

    return (
        <>
            <group position={position}>
                <group ref={poleGroupRef}>
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[URANUS.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>
                </group>

                {/* Brilho de borda: halo ciano-azulado do metano atmosférico de Urano. */}
                <mesh scale={1.06}>
                    <sphereGeometry args={[URANUS.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#40b8c8"
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
                        <sphereGeometry args={[URANUS.visualRadiusDl * 1.3, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                {showLabel ? (
                    <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                        <span className="font-semibold">{locale === 'en' ? 'Uranus' : 'Urano'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </>
    );
}
