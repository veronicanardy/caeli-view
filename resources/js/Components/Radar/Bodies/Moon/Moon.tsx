import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { orientMoonTidal } from '@/lib/radar/earthOrientation';
import { MOON_HITBOX_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { MOON_FRAG, MOON_VERT } from '@/lib/radar/shaders/moon.glsl';
import { DistanceCulledScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import { directionFromBodyToSceneSun } from '../bodyLighting';
import { useBodyTexture } from '../useBodyTexture';

/**
 * Lua na cena do radar orbital.
 *
 * Responsabilidade: renderizar o satélite em posição absoluta de mundo, mantendo
 * travamento tidal em relação à Terra, fase real pelo Sol, earthshine suave e
 * hitbox/rótulo de foco.
 */
export interface MoonProps {
    onFocus: () => void;
    position: [number, number, number];
    /** Vetor Terra→Lua em coordenadas de cena. Usado para orientação e fase aparente. */
    geocentricPosition?: [number, number, number];
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    isApproximate: boolean;
    locale: 'pt-BR' | 'en';
    isFocused?: boolean;
    illuminatedFraction?: number;
    /** Multiplica o raio visual do globo lunar. No modo linear, ~0,54 deixa a Lua do tamanho
     *  aparente do Sol vista da Terra (mesma coincidência dos eclipses). Default 1. */
    radiusScale?: number;
}

export function Moon({
    onFocus,
    position,
    geocentricPosition,
    compactLabel,
    showLabel,
    protectLabelFromFocus,
    isApproximate,
    locale,
    isFocused = false,
    illuminatedFraction = 0.5,
    radiusScale = 1,
}: MoonProps) {
    const en = locale === 'en';
    const [hovered, setHovered] = useState(false);

    // Shader customizado: a textura entra como RAW e o decode sRGB é feito no GLSL.
    const texture = useBodyTexture('/images/moon/moon-8k.jpg', 'raw');
    const earthToMoonVector = geocentricPosition ?? position;

    const meshRef = useRef<THREE.Mesh>(null);

    // Material estável por textura: os uniforms são atualizados in-place no efeito abaixo.
    // Recriar o ShaderMaterial a cada tick de efeméride forçava recompilação/relink no renderer.
    const material = useMemo(() => {
        if (!texture) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                surfaceMap: { value: texture },
                sunDir: { value: new THREE.Vector3(0, 0, 1) },
                earthDir: { value: new THREE.Vector3(0, 0, 1) },
                phaseFraction: { value: 0.5 },
            },
            vertexShader: MOON_VERT,
            fragmentShader: MOON_FRAG,
        });
    }, [texture]);

    useEffect(() => () => {
        material?.dispose();
    }, [material]);

    // Orientação tidal e uniforms dependem só da efeméride (posição, vetor Terra→Lua, fase),
    // que muda por tick de dados e não por frame. Em useFrame isso alocava ~12 Vector3/Matrix4
    // por frame via orientMoonTidal + directionFromBodyToSceneSun, gerando pressão de GC.
    useEffect(() => {
        if (meshRef.current) orientMoonTidal(meshRef.current, earthToMoonVector);

        if (material) {
            (material.uniforms.sunDir.value as THREE.Vector3).copy(directionFromBodyToSceneSun(position));
            (material.uniforms.earthDir.value as THREE.Vector3)
                .set(-earthToMoonVector[0], -earthToMoonVector[1], -earthToMoonVector[2])
                .normalize();
            material.uniforms.phaseFraction.value = illuminatedFraction;
        }
    }, [material, position, earthToMoonVector, illuminatedFraction]);

    const title = isApproximate
        ? (en ? 'Lunar position loading (server fallback)' : 'Posição lunar carregando (estimativa do servidor)')
        : (en ? 'Focus on the Moon' : 'Focar na Lua');

    const labelName = en ? 'Moon' : 'Lua';

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <sphereGeometry args={[MOON_RADIUS_DL * radiusScale, 64, 64]} />
                {material ? (
                    <primitive object={material} attach="material" />
                ) : (
                    <meshStandardMaterial key="moon-fallback" color="#c2c4c8" roughness={0.95} metalness={0.02} />
                )}
            </mesh>

            {!isFocused ? (
                <BodyHitbox
                    radius={MOON_HITBOX_DL}
                    segments={[16, 16]}
                    onClick={onFocus}
                    onHoverChange={setHovered}
                />
            ) : null}

            {showLabel ? (
                <DistanceCulledScreenLabel
                    anchor={position}
                    maxCameraDistance={5.2}
                    position={moonLabelOffset(earthToMoonVector, compactLabel)}
                    emphasized={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    allowSceneOverlap={isFocused}
                    onClick={isFocused ? undefined : onFocus}
                    title={isFocused ? undefined : title}
                >
                    {labelName}
                </DistanceCulledScreenLabel>
            ) : null}
        </group>
    );
}

function moonLabelOffset(earthToMoonVector: [number, number, number], compactLabel: boolean): [number, number, number] {
    if (!compactLabel) return [0, MOON_RADIUS_DL + 0.1, 0];

    const awayFromEarth = new THREE.Vector3(...earthToMoonVector);
    if (awayFromEarth.lengthSq() < 1e-6) {
        return [0.16, MOON_RADIUS_DL + 0.06, 0];
    }

    awayFromEarth.normalize().multiplyScalar(0.18);
    awayFromEarth.y += MOON_RADIUS_DL + 0.04;
    return [awayFromEarth.x, awayFromEarth.y, awayFromEarth.z];
}
