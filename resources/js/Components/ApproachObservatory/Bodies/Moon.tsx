import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { orientMoonTidal } from '@/lib/observatory/earthOrientation';
import { buildMoonBump } from '@/lib/observatory/moonTextures';
import { MOON_HITBOX_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { DistanceCulledScreenLabel } from '../Overlays/SceneLabels';
import { useEarthTexture } from './Earth';

export function Moon({
    onFocus,
    position,
    sunDirection,
    compactLabel,
    showLabel,
    protectLabelFromFocus,
    isApproximate,
    locale,
}: {
    onFocus: () => void;
    position: [number, number, number];
    sunDirection: [number, number, number];
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    /** True until astronomy-engine resolves and provides the real lunar geocentric vector. */
    isApproximate: boolean;
    locale: 'pt-BR' | 'en';
}) {
    const en = locale === 'en';
    const [hovered, setHovered] = useState(false);
    // Real lunar photo texture (2K). Procedural bump still adds crater relief on top.
    const texture = useEarthTexture('/images/moon/moon-2048.jpg');
    const bump = useMemo(() => {
        try { return buildMoonBump(512); } catch { return null; }
    }, []);

    // Tidal locking: the same hemisphere always faces Earth. We orient the textured mesh each
    // frame so the lunar near-side faces the scene origin (Earth). Built as a target basis, same
    // approach as orientEarth() — keeps the lunar north pole as close to scene +Y as possible.
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (meshRef.current) orientMoonTidal(meshRef.current, position);
    });

    // The Moon's phase/shadow is produced for free by real lighting: the Sun light comes from the
    // true Sun direction and the Moon sits at its true position, so the lit hemisphere faces the
    // Sun exactly like the real Moon. We add a faint fill aimed opposite the Sun so the dark limb
    // isn't pure black (earthshine-ish), without washing out the terminator.
    const fillPos: [number, number, number] = [
        position[0] - sunDirection[0] * 3,
        position[1] - sunDirection[1] * 3,
        position[2] - sunDirection[2] * 3,
    ];

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

            {/* Soft earthshine fill so the unlit side keeps a hint of shape. Scoped tight to the
                Moon by distance so it doesn't leak onto Earth/asteroids. */}
            <pointLight position={fillPos} intensity={0.05} distance={MOON_RADIUS_DL * 6} color="#3a4a6a" />

            {/* Invisible hitbox for easy hover/click. Clicking the Moon re-centers the camera
                on it (view shortcut); the Moon is context, so it doesn't open the focus panel. */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
                onClick={(e) => { e.stopPropagation(); onFocus(); }}
            >
                <sphereGeometry args={[MOON_HITBOX_DL, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLabel ? (
                <DistanceCulledScreenLabel
                    anchor={position}
                    maxCameraDistance={5.2}
                    position={moonLabelOffset(position, compactLabel)}
                    emphasized={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={onFocus}
                    title={isApproximate
                        ? (en ? 'Lunar position loading (server fallback)' : 'Posição lunar carregando (estimativa do servidor)')
                        : (en ? 'Focus on the Moon' : 'Focar na Lua')}
                >
                    <span className="font-semibold">{en ? 'Moon' : 'Lua'}</span>
                    {isApproximate ? (
                        <span className="ml-1 text-[10px] font-normal text-amber-200/80">
                            {en ? '· loading' : '· carregando'}
                        </span>
                    ) : null}
                </DistanceCulledScreenLabel>
            ) : null}
        </group>
    );
}

/**
 * Places the Moon label above the Moon, nudged away from Earth when the camera is zoomed out
 * (compactLabel = true) so it doesn't visually overlap with the close-Earth labels.
 */
function moonLabelOffset(position: [number, number, number], compactLabel: boolean): [number, number, number] {
    if (!compactLabel) return [0, MOON_RADIUS_DL + 0.1, 0];

    const awayFromEarth = new THREE.Vector3(...position);
    if (awayFromEarth.lengthSq() < 1e-6) {
        return [0.16, MOON_RADIUS_DL + 0.06, 0];
    }

    awayFromEarth.normalize().multiplyScalar(0.18);
    awayFromEarth.y += MOON_RADIUS_DL + 0.04;
    return [awayFromEarth.x, awayFromEarth.y, awayFromEarth.z];
}
