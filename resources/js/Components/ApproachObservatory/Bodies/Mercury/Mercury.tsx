/**
 * Mercúrio na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta como corpo ambiente focável, já posicionado
 * pela efeméride da cena. O componente cuida apenas de malha, textura, rotação,
 * iluminação, hitbox e rótulo; cálculo orbital fica fora dele.
 *
 * Posição: `SceneEphemeris.mercuryScenePosition`.
 * Rotação: período sideral de 58,6462 dias, ancorado em J2000 para consistência.
 * Inclinação axial: 0,034° (IAU WGCCRE 2015), aplicada no grupo do polo.
 * Escala: raio físico de 0,00635 DL; raio visual de 0,028 DL para legibilidade.
 * Iluminação: shader próprio com `sunDir` apontando de Mercúrio para o Sol.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { MERCURY } from '@/lib/observatory/planetData';
import { MERCURY_FRAG, MERCURY_VERT } from '@/lib/observatory/shaders/mercury.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constantes ---------------------------------------------------------------

const MERCURY_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / MERCURY.rotationPeriodS;

/**
 * Inclinação axial: 0,034° em torno de X eclíptico. O mesmo padrão é usado
 * pelos planetas com obliquidade mais expressiva, como Vênus e Urano.
 */
const MERCURY_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (MERCURY.axialTiltDeg * Math.PI) / 180,
);

// --------------- Componente ---------------------------------------------------------------

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
        meshRef.current.rotation.y = MERCURY_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

        // sunDir = normalize(sunWorldPos - mercuryWorldPos). O vetor aponta de Mercúrio
        // para o Sol, então o terminador acompanha a posição solar visível.
        if (matRef.current) {
            const sunWorld = new THREE.Vector3(0, 0, 0);
            const mercuryWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(mercuryWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);

    const material = useMemo(() => {
        // Calcula o sunDir inicial para o primeiro frame já nascer coerente.
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
        // Material simples enquanto a textura carrega.
        return new THREE.MeshStandardMaterial({ color: MERCURY.fallbackColor, roughness: 0.95, metalness: 0.0 });
        // sunDirection e position são atualizados por frame via uniform.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    // Rótulo acima da esfera, seguindo a mesma convenção da Lua.
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
                 * Brilho de borda puramente visual para destacar o contorno no lado noturno.
                 * Mercúrio não tem atmosfera relevante, então a opacidade fica bem baixa.
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
