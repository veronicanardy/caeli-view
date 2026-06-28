import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { orientMoonTidal } from '@/lib/radar/earthOrientation';
import { MOON_HITBOX_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { MOON_FRAG, MOON_VERT } from '@/lib/radar/shaders/moon.glsl';
import { ResolvedDistanceCulledScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import { directionFromBodyToSceneSun } from '../bodyLighting';
import { useProgressiveBodyTexture } from '../useProgressiveBodyTexture';

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

    // LOD progressivo: a 2k entra rápido (e conta na barra de carregamento); a 8k carrega
    // em segundo plano e, quando já está na GPU, vira a melhor textura (`highReady`).
    // Shader customizado: a textura entra como RAW e o decode sRGB é feito no GLSL.
    const { texture, highReady } = useProgressiveBodyTexture(
        '/images/moon/moon-2k.jpg',
        '/images/moon/moon-8k.jpg',
        'raw',
    );
    const earthToMoonVector = geocentricPosition ?? position;

    const meshRef = useRef<THREE.Mesh>(null);

    // Material criado UMA vez, quando a primeira textura (2k) chega, e mantido estável: a
    // troca 2k→8k é feita in-place no uniform (efeito abaixo), nunca recriando o material.
    // Recriar o ShaderMaterial forçaria recompilação/relink no renderer — a travadinha que o
    // LOD existe para evitar. Por isso o useMemo NÃO depende de `texture`, só do primeiro valor.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture != null]);

    useEffect(() => () => {
        material?.dispose();
    }, [material]);

    // Troca 2k→8k in-place: só o ponteiro do uniform muda, sem recriar/recompilar o material.
    // A 8k já está na GPU quando `highReady` (o upload foi pago em segundo plano), então isto
    // custa ~1 frame e não congela um gesto de câmera em andamento.
    useEffect(() => {
        if (material && texture) {
            material.uniforms.surfaceMap.value = texture;
            texture.needsUpdate = true;
        }
    }, [material, highReady, texture]);

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
                <ResolvedDistanceCulledScreenLabel
                    anchor={position}
                    maxCameraDistance={5.2}
                    position={moonLabelOffset(earthToMoonVector, compactLabel)}
                    labelId="moon"
                    labelKind="moon"
                    emphasized={hovered}
                    hovered={hovered}
                    selected={isFocused}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={onFocus}
                    title={title}
                >
                    {labelName}
                </ResolvedDistanceCulledScreenLabel>
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
