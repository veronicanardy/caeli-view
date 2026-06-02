/**
 * Terra na cena do radar orbital.
 *
 * Responsabilidade: renderizar o corpo de referência central da experiência,
 * já orientado cientificamente pelo ponto subsolar da cena. O componente cuida
 * de shader próprio de dia/noite, nuvens, atmosfera, hitbox e rótulo.
 *
 * Orientação: aplicada por `orientEarth(...)` a partir de `sunDirection`,
 * `subsolarLatDeg` e `subsolarLonDeg`.
 * Iluminação: shader próprio com terminador dinâmico e camada de nuvens
 * sincronizada pelo mesmo vetor solar.
 * Escala: preserva `EARTH_RADIUS_DL` e a hitbox dedicada do observatório.
 */

import { type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { orientEarth } from '@/lib/observatory/earthOrientation';
import { CLOUDS_FRAG, EARTH_FRAG, EARTH_VERT } from '@/lib/observatory/shaders/earth.glsl';
import { EARTH_HITBOX_DL, EARTH_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { useBodyTexture } from '../useBodyTexture';

// --------------- Constantes ---------------------------------------------------------------

const CLOUD_LAYER_SCALE = 1.012;
const ATMOSPHERE_OUTER_SCALE = 1.06;
const ATMOSPHERE_INNER_SCALE = 1.18;
const ATMOSPHERE_OUTER_OPACITY = 0.16;
const ATMOSPHERE_INNER_OPACITY = 0.06;
const ATMOSPHERE_OUTER_COLOR = '#6fd0ff';
const ATMOSPHERE_INNER_COLOR = '#3aa0ff';
const ATMOSPHERE_SIDES = THREE.BackSide;
const CLOUD_MATERIAL_DEPTH_WRITE = false;
const EARTH_SPHERE_SEGMENTS = 64;
const ATMOSPHERE_SPHERE_SEGMENTS = 48;
const HITBOX_SPHERE_SEGMENTS = 16;
const INITIAL_SUN_DIR = new THREE.Vector3(0, 0, 1);
const LABEL_POSITION: [number, number, number] = [0, EARTH_RADIUS_DL + 0.14, 0];

interface EarthProps {
    onFocus: () => void;
    sunDirection: [number, number, number];
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    isFocused?: boolean;
}

// --------------- Componente ---------------------------------------------------------------

export function Earth({
    onFocus,
    sunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    showLabel,
    protectLabelFromFocus,
    isFocused = false,
}: EarthProps) {
    const day = useBodyTexture('/images/earth/blue-marble-land-shallow-topo-2048.jpg', 'raw');
    const night = useBodyTexture('/images/earth/8k_earth_nightmap.jpg', 'raw');
    const clouds = useBodyTexture('/images/earth/8k_earth_clouds.jpg', 'srgb');

    const groupRef = useRef<THREE.Group>(null);
    const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        return () => {
            cursorPointerLeave();
        };
    }, []);

    // Os materiais nascem uma vez por textura; sunDir é sincronizado depois por efeito.
    const cloudsMaterial = useMemo(() => {
        if (!clouds) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                cloudMap: { value: clouds },
                sunDir: { value: INITIAL_SUN_DIR.clone() },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: CLOUDS_FRAG,
            transparent: true,
            depthWrite: CLOUD_MATERIAL_DEPTH_WRITE,
        });
    }, [clouds]);

    // Dia/noite usa shader próprio da Terra, então este material permanece isolado.
    const material = useMemo(() => {
        if (!day || !night) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                dayMap: { value: day },
                nightMap: { value: night },
                sunDir: { value: INITIAL_SUN_DIR.clone() },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: EARTH_FRAG,
        });
    }, [day, night]);

    useEffect(() => {
        return () => {
            material?.dispose();
        };
    }, [material]);

    useEffect(() => {
        return () => {
            cloudsMaterial?.dispose();
        };
    }, [cloudsMaterial]);

    // A orientação real e os uniforms solares são atualizados juntos para manter coerência visual.
    useEffect(() => {
        if (groupRef.current) {
            orientEarth(groupRef.current, sunDirection, subsolarLatDeg, subsolarLonDeg);
        }

        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }

        if (cloudsMatRef.current) {
            (cloudsMatRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }
    }, [subsolarLatDeg, subsolarLonDeg, sunDirection]);

    const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
        cursorPointerEnter();
    };

    const handlePointerOut = () => {
        setHovered(false);
        cursorPointerLeave();
    };

    const handleClick = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onFocus();
    };

    return (
        <group>
            {/* Superfície e nuvens compartilham a orientação científica aplicada por orientEarth(). */}
            <group ref={groupRef}>
                <mesh>
                    <sphereGeometry args={[EARTH_RADIUS_DL, EARTH_SPHERE_SEGMENTS, EARTH_SPHERE_SEGMENTS]} />
                    {material ? (
                        <primitive ref={matRef} object={material} attach="material" />
                    ) : (
                        <meshStandardMaterial
                            color="#2f6fb0"
                            emissive="#0a2a4a"
                            emissiveIntensity={0.5}
                            roughness={0.85}
                        />
                    )}
                </mesh>

                {cloudsMaterial ? (
                    <mesh>
                        <sphereGeometry args={[EARTH_RADIUS_DL * CLOUD_LAYER_SCALE, EARTH_SPHERE_SEGMENTS, EARTH_SPHERE_SEGMENTS]} />
                        <primitive ref={cloudsMatRef} object={cloudsMaterial} attach="material" />
                    </mesh>
                ) : null}
            </group>

            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * ATMOSPHERE_OUTER_SCALE, ATMOSPHERE_SPHERE_SEGMENTS, ATMOSPHERE_SPHERE_SEGMENTS]} />
                <meshBasicMaterial
                    color={ATMOSPHERE_OUTER_COLOR}
                    transparent
                    opacity={ATMOSPHERE_OUTER_OPACITY}
                    side={ATMOSPHERE_SIDES}
                />
            </mesh>

            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * ATMOSPHERE_INNER_SCALE, ATMOSPHERE_SPHERE_SEGMENTS, ATMOSPHERE_SPHERE_SEGMENTS]} />
                <meshBasicMaterial
                    color={ATMOSPHERE_INNER_COLOR}
                    transparent
                    opacity={ATMOSPHERE_INNER_OPACITY}
                    side={ATMOSPHERE_SIDES}
                />
            </mesh>

            {!isFocused ? (
                <mesh
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onClick={handleClick}
                >
                    <sphereGeometry args={[EARTH_HITBOX_DL, HITBOX_SPHERE_SEGMENTS, HITBOX_SPHERE_SEGMENTS]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
            ) : null}

            {showLabel ? (
                <ScreenLabel
                    position={LABEL_POSITION}
                    emphasized={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    allowSceneOverlap={isFocused}
                    onClick={isFocused ? undefined : onFocus}
                    title={isFocused ? undefined : 'Voltar para a visão geral'}
                >
                    <span className="font-semibold">Terra</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}
