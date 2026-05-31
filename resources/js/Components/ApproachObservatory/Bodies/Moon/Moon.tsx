import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { orientMoonTidal } from '@/lib/observatory/earthOrientation';
import { buildMoonBump } from '@/lib/observatory/moonTextures';
import { MOON_HITBOX_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { DistanceCulledScreenLabel } from '../../Overlays/SceneLabels';
import { useBodyTexture } from '../useBodyTexture';

/**
 * Lua na cena do radar orbital.
 *
 * Responsabilidade: renderizar o satélite em posição absoluta de mundo, mantendo
 * travamento tidal em relação à Terra, iluminação de fase pelo Sol, preenchimento
 * suave de earthshine, hitbox de foco e rótulo com culling por distância.
 */
export interface MoonProps {
    onFocus: () => void;
    position: [number, number, number];
    /** Vetor Terra→Lua em coordenadas de cena. Usado para orientação e offset do rótulo. */
    geocentricPosition?: [number, number, number];
    sunDirection: [number, number, number];
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    isApproximate: boolean;
    locale: 'pt-BR' | 'en';
    isFocused?: boolean;
}

export function Moon({
    onFocus,
    position,
    geocentricPosition,
    sunDirection,
    compactLabel,
    showLabel,
    protectLabelFromFocus,
    isApproximate,
    locale,
    isFocused = false,
}: MoonProps) {
    const en = locale === 'en';
    const [hovered, setHovered] = useState(false);

    // Textura lunar real (2K). O bump procedural adiciona relevo sem alterar a aparência-base.
    const texture = useBodyTexture('/images/moon/moon-8k.jpg');
    const bump = useMemo(() => {
        try { return buildMoonBump(512); } catch { return null; }
    }, []);
    useEffect(() => () => {
        bump?.dispose();
    }, [bump]);

    const earthToMoonVector = geocentricPosition ?? position;

    // Travamento tidal: a mesma face da Lua permanece apontada para a Terra.
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (meshRef.current) orientMoonTidal(meshRef.current, earthToMoonVector);
    });

    // O preenchimento é local ao grupo da Lua, então basta usar a direção oposta ao Sol.
    const fillPos = useMemo<[number, number, number]>(() => [
        -sunDirection[0] * 3,
        -sunDirection[1] * 3,
        -sunDirection[2] * 3,
    ], [sunDirection]);

    const title = isApproximate
        ? (en ? 'Lunar position loading (server fallback)' : 'Posição lunar carregando (estimativa do servidor)')
        : (en ? 'Focus on the Moon' : 'Focar na Lua');

    const labelName = en ? 'Moon' : 'Lua';

    const labelStatus = isApproximate ? (
        <span className="ml-1 text-[10px] font-normal text-amber-200/80">
            {en ? '· loading' : '· carregando'}
        </span>
    ) : null;

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
        <group position={position}>
            <mesh ref={meshRef}>
                <sphereGeometry args={[MOON_RADIUS_DL, 64, 64]} />
                {texture ? (
                    <meshStandardMaterial
                        key="moon-textured"
                        map={texture}
                        bumpMap={bump ?? undefined}
                        bumpScale={0.012}
                        roughness={0.95}
                        metalness={0.0}
                    />
                ) : (
                    <meshStandardMaterial key="moon-fallback" color="#c2c4c8" roughness={0.95} metalness={0.02} />
                )}
            </mesh>

            {/* Preenchimento suave por earthshine, limitado à Lua. */}
            <pointLight position={fillPos} intensity={0.05} distance={MOON_RADIUS_DL * 6} color="#3a4a6a" />

            {/* Hitbox invisível para hover/click. Quando a Lua já está em foco, o hitbox é removido. */}
            {!isFocused ? (
                <mesh
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onClick={handleClick}
                >
                    <sphereGeometry args={[MOON_HITBOX_DL, 16, 16]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
            ) : null}

            {showLabel ? (
                <DistanceCulledScreenLabel
                    anchor={position}
                    maxCameraDistance={5.2}
                    position={moonLabelOffset(earthToMoonVector, compactLabel)}
                    emphasized={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={isFocused ? undefined : onFocus}
                    title={isFocused ? undefined : title}
                >
                    <span className="font-semibold">{labelName}</span>
                    {labelStatus}
                </DistanceCulledScreenLabel>
            ) : null}
        </group>
    );
}

/**
 * Coloca a etiqueta acima da Lua e, em zoom amplo, afasta o rótulo na direção oposta à Terra.
 */
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
