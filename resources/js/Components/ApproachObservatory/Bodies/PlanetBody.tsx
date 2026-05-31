import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { ScreenLabel } from '../Overlays/SceneLabels';
import {
    BODY_HITBOX_MATERIAL,
    BODY_ROTATION_EPOCH_UNIX_S,
    BODY_SPHERE_SEGMENTS,
} from './bodyRenderConstants';
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
    extraTextures?: PlanetExtraTextureConfig[];
}

interface PlanetBodyComponentProps extends PlanetBodyProps {
    config: PlanetVisualConfig;
    spinRateRadPerS: number;
    tiltQuaternion: THREE.Quaternion;
}

export function PlanetBody({
    position,
    locale,
    onFocus,
    isFocused = false,
    showLabel = true,
    config,
    spinRateRadPerS,
    tiltQuaternion,
}: PlanetBodyComponentProps) {
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

    const texture = useBodyTexture(
        config.body.texturePath ?? '',
        config.textureColorSpace ?? 'srgb',
    );
    const firstExtraTextureConfig = config.extraTextures?.[0];
    const secondExtraTextureConfig = config.extraTextures?.[1];
    const thirdExtraTextureConfig = config.extraTextures?.[2];

    const firstExtraTexture = useBodyTexture(
        firstExtraTextureConfig?.path ?? '',
        firstExtraTextureConfig?.colorSpace ?? 'srgb',
    );
    const secondExtraTexture = useBodyTexture(
        secondExtraTextureConfig?.path ?? '',
        secondExtraTextureConfig?.colorSpace ?? 'srgb',
    );
    const thirdExtraTexture = useBodyTexture(
        thirdExtraTextureConfig?.path ?? '',
        thirdExtraTextureConfig?.colorSpace ?? 'srgb',
    );

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) {
            poleGroupRef.current.quaternion.copy(tiltQuaternion);
        }
    }, [tiltQuaternion]);

    useFrame(() => {
        if (!meshRef.current) return;

        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = spinRateRadPerS * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(
                directionFromBodyToSceneSun(position),
            );
        }
    });

    const material = useMemo(() => {
        const initialSunDir = directionFromBodyToSceneSun(position);
        const extraTextureValues = [
            firstExtraTexture,
            secondExtraTexture,
            thirdExtraTexture,
        ];

        if (texture) {
            const uniforms: Record<string, { value: THREE.Texture | THREE.Vector3 | null }> = {
                surfaceMap: { value: texture },
                sunDir: { value: initialSunDir },
            };

            config.extraTextures?.forEach((extraTextureConfig, index) => {
                uniforms[extraTextureConfig.uniformName] = {
                    value: extraTextureValues[index]
                        ?? (extraTextureConfig.fallbackToSurfaceMap ? texture : null),
                };
            });

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

        // A direção ao Sol da cena é atualizada por frame via uniform.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, firstExtraTexture, position, secondExtraTexture, texture, thirdExtraTexture]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

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
                    depthWrite={false}
                />
            </mesh>

            {!isFocused ? (
                <mesh
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onClick={handleClick}
                >
                    <sphereGeometry
                        args={[
                            config.body.visualRadiusDl * config.hitbox.radiusMultiplier,
                            BODY_SPHERE_SEGMENTS.hitbox.width,
                            BODY_SPHERE_SEGMENTS.hitbox.height,
                        ]}
                    />
                    <meshBasicMaterial
                        transparent
                        opacity={BODY_HITBOX_MATERIAL.opacity}
                        depthWrite={BODY_HITBOX_MATERIAL.depthWrite}
                    />
                </mesh>
            ) : null}

            {showLabel ? (
                <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                    <span className="font-semibold">{locale === 'en' ? config.label.en : config.label.pt}</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}
