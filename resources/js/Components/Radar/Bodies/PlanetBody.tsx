/**
 * Corpo base dos planetas ambiente do Approach Observatory.
 *
 * Responsabilidade: renderizar a estrutura visual comum dos planetas focáveis
 * de Mercúrio a Netuno: textura/fallback, shader, rotação visual, inclinação,
 * brilho de borda, hitbox local e rótulo. O componente recebe posição e
 * configuração prontas; não calcula efeméride, órbita, ranking, câmera ou
 * seleção global.
 */

import { useFrame } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ScreenLabel } from '../Overlays/SceneLabels';
import {
    BODY_ROTATION_EPOCH_UNIX_S,
    BODY_SPHERE_SEGMENTS,
} from './bodyRenderConstants';
import { BodyHitbox } from './BodyHitbox';
import { directionFromBodyToSceneSun } from './bodyLighting';
import type { PlanetBodyProps } from './planetBodyTypes';
import { useBodyTexture } from './useBodyTexture';

interface PlanetExtraTextureConfig {
    uniformName: string;
    path?: string | null;
    colorSpace?: 'srgb' | 'raw';
    fallbackToSurfaceMap?: boolean;
}

export interface PlanetVisualConfig {
    body: {
        visualRadiusDl: number;
        texturePath?: string | null;
        fallbackColor: string;
    };
    shaders: {
        vertex: string;
        fragment: string;
    };
    label: {
        pt: string;
        en: string;
        offset: number;
    };
    materialFallback?: {
        roughness?: number;
        metalness?: number;
    };
    rim: {
        color: string;
        opacity: number;
        scale: number;
    };
    hitbox: {
        radiusMultiplier: number;
    };
    textureColorSpace?: 'srgb' | 'raw';
    extraTexture?: PlanetExtraTextureConfig;
}

interface PlanetBodyComponentProps extends PlanetBodyProps {
    config: PlanetVisualConfig;
    spinRateRadPerS: number;
    tiltQuaternion: THREE.Quaternion;
    childrenInsidePoleGroup?: ReactNode;
}

/**
 * Centraliza a renderização local comum dos planetas ambiente.
 *
 * Este componente não calcula órbita, trajetória, ranking, câmera ou efeméride.
 * Ele recebe posição, configuração visual, rotação e inclinação já prontas, e apenas
 * renderiza o corpo com textura, shader, brilho de borda, hitbox e rótulo.
 */
export function PlanetBody({
    position,
    locale,
    onFocus,
    isFocused = false,
    showLabel = true,
    config,
    spinRateRadPerS,
    tiltQuaternion,
    childrenInsidePoleGroup,
}: PlanetBodyComponentProps) {
    const texture = useBodyTexture(
        config.body.texturePath ?? '',
        config.textureColorSpace ?? 'srgb',
    );
    /**
     * Textura auxiliar opcional usada por shaders especificos.
     * Pode cair para surfaceMap enquanto o mapa extra ainda carrega.
     */
    const extraTexture = useBodyTexture(
        config.extraTexture?.path ?? '',
        config.extraTexture?.colorSpace ?? 'srgb',
    );

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) {
            poleGroupRef.current.quaternion.copy(tiltQuaternion);
        }
    }, [tiltQuaternion]);

    // Apenas o spin precisa rodar por frame; sunDir é atualizado por efeito logo abaixo.
    useFrame(() => {
        if (!meshRef.current) return;

        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = spinRateRadPerS * (nowS - BODY_ROTATION_EPOCH_UNIX_S);
    });

    const material = useMemo(() => {
        if (texture) {
            const uniforms: Record<string, { value: THREE.Texture | THREE.Vector3 | null }> = {
                surfaceMap: { value: texture },
                sunDir: { value: new THREE.Vector3(0, 0, 1) },
            };

            if (config.extraTexture) {
                uniforms[config.extraTexture.uniformName] = {
                    value: extraTexture
                        ?? (config.extraTexture.fallbackToSurfaceMap ? texture : null),
                };
            }

            return new THREE.ShaderMaterial({
                uniforms,
                vertexShader: config.shaders.vertex,
                fragmentShader: config.shaders.fragment,
            });
        }

        return new THREE.MeshStandardMaterial({
            color: config.body.fallbackColor,
            roughness: config.materialFallback?.roughness ?? 0.85,
            metalness: config.materialFallback?.metalness ?? 0.0,
        });

    }, [config, extraTexture, texture]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    // sunDir depende apenas da posição heliocêntrica, que muda por tick de efeméride e não
    // por frame. Em useFrame isso alocava 2 Vector3 por frame por planeta (7 planetas ambiente).
    useEffect(() => {
        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(
                directionFromBodyToSceneSun(position),
            );
        }
    }, [material, position]);

    const labelPos: [number, number, number] = [0, config.body.visualRadiusDl + config.label.offset, 0];

    return (
        <group position={position}>
            <group ref={poleGroupRef}>
                <mesh ref={meshRef}>
                    <sphereGeometry
                        args={[
                            config.body.visualRadiusDl,
                            BODY_SPHERE_SEGMENTS.planet.width,
                            BODY_SPHERE_SEGMENTS.planet.height,
                        ]}
                    />
                    {material instanceof THREE.ShaderMaterial ? (
                        <primitive ref={matRef} object={material} attach="material" />
                    ) : (
                        <primitive object={material} attach="material" />
                    )}
                </mesh>
                {/* Slot para recursos que precisam acompanhar a inclinação visual, como os anéis de Saturno. */}
                {childrenInsidePoleGroup}
            </group>

            <mesh scale={config.rim.scale}>
                <sphereGeometry
                    args={[
                        config.body.visualRadiusDl,
                        BODY_SPHERE_SEGMENTS.rim.width,
                        BODY_SPHERE_SEGMENTS.rim.height,
                    ]}
                />
                <meshBasicMaterial
                    color={config.rim.color}
                    transparent
                    opacity={config.rim.opacity}
                    side={THREE.BackSide}
                />
            </mesh>

            {!isFocused ? (
                <BodyHitbox
                    radius={config.body.visualRadiusDl * config.hitbox.radiusMultiplier}
                    segments={[BODY_SPHERE_SEGMENTS.hitbox.width, BODY_SPHERE_SEGMENTS.hitbox.height]}
                    onClick={onFocus}
                />
            ) : null}

            {showLabel ? (
                <ScreenLabel position={labelPos} protectFromFocus={!isFocused} allowSceneOverlap={isFocused} onClick={isFocused ? undefined : onFocus}>
                    <span className="font-semibold">{locale === 'en' ? config.label.en : config.label.pt}</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}
