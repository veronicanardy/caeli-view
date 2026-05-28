import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { orientEarth } from '@/lib/observatory/earthOrientation';
import { CLOUDS_FRAG, EARTH_FRAG, EARTH_VERT } from '@/lib/observatory/shaders/earth.glsl';
import { EARTH_HITBOX_DL, EARTH_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { ScreenLabel } from '../Overlays/SceneLabels';

export function Earth({
    onFocus,
    sunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    showLabel,
    protectLabelFromFocus,
}: {
    onFocus: () => void;
    sunDirection: [number, number, number];
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
}) {
    const day = useEarthTexture('/images/earth/blue-marble-land-shallow-topo-2048.jpg', 'raw');
    const night = useEarthTexture('/images/earth/earth-night-lights-2048.jpg', 'raw');
    const clouds = useEarthTexture('/images/earth/earth-clouds-2048.jpg', 'srgb');

    const groupRef = useRef<THREE.Group>(null);
    const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const [hovered, setHovered] = useState(false);

    // Cloud shell shader: the (greyscale) cloud map drives both brightness AND opacity, and the same
    // honest dot(normal, sun) lighting darkens clouds on the night side so they don't glow in the
    // dark. Sits just above the surface inside the oriented group, so clouds track the globe.
    const cloudsMaterial = useMemo(() => {
        if (!clouds) return null;
        return new THREE.ShaderMaterial({
            uniforms: { cloudMap: { value: clouds }, sunDir: { value: new THREE.Vector3(...sunDirection) } },
            vertexShader: EARTH_VERT,
            fragmentShader: CLOUDS_FRAG,
            transparent: true,
            depthWrite: false,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clouds]);

    // Coherence approach: day/night in the shader is the honest dot(worldNormal, sunDir), so the
    // lit hemisphere ALWAYS faces the visible Sun. To put the CORRECT continents on that lit
    // hemisphere, we orient the globe so the real subsolar point (lat/lon where the Sun is
    // overhead now) physically points at the Sun. orientEarth() builds that rotation from the
    // subsolar point + Sun direction, with the texture's UV convention baked in.
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

    useFrame(() => {
        if (groupRef.current) {
            orientEarth(groupRef.current, sunDirection, subsolarLatDeg, subsolarLonDeg);
        }
        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }
        if (cloudsMatRef.current) {
            (cloudsMatRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }
    });

    return (
        <group>
            {/* Oriented globe: the group's rotation is set each frame by orientEarth() so the real
                subsolar point faces the Sun. The glow shells and hitbox stay axis-aligned. */}
            <group ref={groupRef}>
                <mesh>
                    <sphereGeometry args={[EARTH_RADIUS_DL, 64, 64]} />
                    {material ? (
                        <primitive ref={matRef} object={material} attach="material" />
                    ) : (
                        // Lit blue fallback while textures load — never a black sphere.
                        <meshStandardMaterial color="#2f6fb0" emissive="#0a2a4a" emissiveIntensity={0.5} roughness={0.85} />
                    )}
                </mesh>
                {/* Cloud shell, just above the surface; only on the day side (shader-lit). */}
                {cloudsMaterial ? (
                    <mesh>
                        <sphereGeometry args={[EARTH_RADIUS_DL * 1.012, 64, 64]} />
                        <primitive ref={cloudsMatRef} object={cloudsMaterial} attach="material" />
                    </mesh>
                ) : null}
            </group>

            {/* Atmospheric glow — two soft backside shells for a fresnel-ish rim. */}
            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * 1.06, 48, 48]} />
                <meshBasicMaterial color="#6fd0ff" transparent opacity={0.16} side={THREE.BackSide} />
            </mesh>
            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * 1.18, 48, 48]} />
                <meshBasicMaterial color="#3aa0ff" transparent opacity={0.06} side={THREE.BackSide} />
            </mesh>

            {/* Invisible hitbox — easy hover/click. Clicking Earth re-centers the camera on it
                (a view shortcut); Earth is context, so it doesn't open the focus panel. */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
                onClick={(e) => { e.stopPropagation(); onFocus(); }}
            >
                <sphereGeometry args={[EARTH_HITBOX_DL, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLabel ? (
                <ScreenLabel position={[0, EARTH_RADIUS_DL + 0.14, 0]} emphasized={hovered} protectFromFocus={protectLabelFromFocus} onClick={onFocus} title="Voltar para a visão geral">
                    <span className="font-semibold">Terra</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}

/**
 * Loads the Earth texture imperatively. We avoid drei/R3F's `useLoader` here because it suspends
 * (a thrown try/catch around it is a no-op) and gives no clean error path — in the Docker dev
 * setup a failed/slow load left the globe black. This returns null until the bitmap is decoded,
 * so the caller can paint a lit blue fallback in the meantime, then swaps in the real map.
 *
 * Exported so the Moon component can reuse it for the lunar photo texture (same fallback contract).
 */
export function useEarthTexture(url: string, colorSpace: 'srgb' | 'raw' = 'srgb'): THREE.Texture | null {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let active = true;
        const loader = new TextureLoader();
        loader.load(
            url,
            (tex) => {
                if (!active) { tex.dispose(); return; }
                // 'srgb' for materials that decode sRGB themselves (meshStandardMaterial.map, e.g.
                // the Moon). 'raw' for our custom Earth shader, which does the sRGB↔linear math by
                // hand — tagging it sRGB there would double-decode and darken the day side.
                tex.colorSpace = colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                setTexture(tex);
            },
            undefined,
            () => { /* leave null → lit blue fallback */ },
        );
        return () => { active = false; };
    }, [url, colorSpace]);

    return texture;
}
