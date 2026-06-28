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

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { orientEarth } from '@/lib/radar/earthOrientation';
import { CLOUDS_FRAG, EARTH_FRAG, EARTH_VERT } from '@/lib/radar/shaders/earth.glsl';
import { EARTH_HITBOX_DL, EARTH_RADIUS_DL } from '@/lib/radar/bodyScale';
import { ResolvedScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import { useBodyTexture } from '../useBodyTexture';

// --------------- Constantes ---------------------------------------------------------------

const CLOUD_LAYER_SCALE = 1.012;
const ATMOSPHERE_OUTER_SCALE = 1.06;
const ATMOSPHERE_INNER_SCALE = 1.18;
const ATMOSPHERE_RIM_SCALE = 1.28;
const ATMOSPHERE_OUTER_OPACITY = 0.22;
const ATMOSPHERE_INNER_OPACITY = 0.09;
const ATMOSPHERE_RIM_OPACITY = 0.055;
const ATMOSPHERE_OUTER_COLOR = '#6fd0ff';
const ATMOSPHERE_INNER_COLOR = '#3aa0ff';
const ATMOSPHERE_RIM_COLOR = '#4a9fff';
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
    locale: 'pt-BR' | 'en';
}

// --------------- Componente ---------------------------------------------------------------

export function Earth({
    onFocus,
    sunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    showLabel,
    isFocused = false,
    locale,
}: EarthProps) {
    const en = locale === 'en';
    const day = useBodyTexture('/images/earth/blue-marble-land-shallow-topo-2048.jpg', 'raw');
    const night = useBodyTexture('/images/earth/earth-night-lights-2048.jpg', 'raw');
    const clouds = useBodyTexture('/images/earth/earth-clouds-2048.jpg', 'srgb');

    const groupRef = useRef<THREE.Group>(null);
    const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const [hovered, setHovered] = useState(false);

    // Os materiais nascem com o sunDir já correto (fallback do servidor) para evitar
    // o flash de iluminação errada nos primeiros segundos antes da efeméride resolver.
    // sunDirection não entra nas deps do useMemo — o valor inicial já é suficiente;
    // atualizações subsequentes são tratadas pelo useEffect abaixo.
    const cloudsMaterial = useMemo(() => {
        if (!clouds) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                cloudMap: { value: clouds },
                sunDir: { value: new THREE.Vector3(...sunDirection) },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: CLOUDS_FRAG,
            transparent: true,
            depthWrite: CLOUD_MATERIAL_DEPTH_WRITE,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clouds]);

    // Dia/noite usa shader próprio da Terra, então este material permanece isolado.
    const material = useMemo(() => {
        if (!day || !night) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                dayMap: { value: day },
                nightMap: { value: night },
                sunDir: { value: new THREE.Vector3(...sunDirection) },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: EARTH_FRAG,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Atualiza o material diretamente (além da ref) para cobrir o caso em que o useEffect
    // dispara antes de o <primitive ref={matRef}> ter montado.
    useEffect(() => {
        if (groupRef.current) {
            orientEarth(groupRef.current, sunDirection, subsolarLatDeg, subsolarLonDeg);
        }

        const sunVec = sunDirection;
        if (material) {
            (material.uniforms.sunDir.value as THREE.Vector3).set(...sunVec);
        }
        if (cloudsMaterial) {
            (cloudsMaterial.uniforms.sunDir.value as THREE.Vector3).set(...sunVec);
        }
    }, [subsolarLatDeg, subsolarLonDeg, sunDirection, material, cloudsMaterial]);

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

            {/* Rim glow: halo muito sutil que contorna o globo mesmo no lado noturno,
                preservando o realismo ao dar apenas leitura visual do contorno. */}
            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * ATMOSPHERE_RIM_SCALE, ATMOSPHERE_SPHERE_SEGMENTS, ATMOSPHERE_SPHERE_SEGMENTS]} />
                <meshBasicMaterial
                    color={ATMOSPHERE_RIM_COLOR}
                    transparent
                    opacity={ATMOSPHERE_RIM_OPACITY}
                    side={ATMOSPHERE_SIDES}
                    depthWrite={false}
                />
            </mesh>

            {!isFocused ? (
                <BodyHitbox
                    radius={EARTH_HITBOX_DL}
                    segments={[HITBOX_SPHERE_SEGMENTS, HITBOX_SPHERE_SEGMENTS]}
                    onClick={onFocus}
                    onHoverChange={setHovered}
                />
            ) : null}

            {showLabel ? (
                <ResolvedScreenLabel
                    position={LABEL_POSITION}
                    labelId="earth"
                    labelKind="earth"
                    emphasized={hovered}
                    hovered={hovered}
                    selected={isFocused}
                    protectFromFocus={false}
                    onClick={onFocus}
                    title={en ? 'Back to the overview' : 'Voltar para a visão geral'}
                >
                    <span className="font-semibold">{en ? 'Earth' : 'Terra'}</span>
                </ResolvedScreenLabel>
            ) : null}
        </group>
    );
}
