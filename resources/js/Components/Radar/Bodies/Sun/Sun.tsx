/**
 * Sol visual do Approach Observatory.
 *
 * Responsabilidade: renderizar a superfície texturizada, corona, prominências,
 * luz opcional, hitbox e rótulo do Sol. O componente recebe posição e escala
 * prontas da cena; não calcula efeméride, foco global ou modo de câmera.
 *
 * Padrão importante: o material nasce como fallback enquanto a textura carrega
 * e é recriado quando `sun-8k.jpg` fica disponível. Isso evita que o Three.js
 * mantenha um shader sem `map` depois que a textura chega de forma assíncrona.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SUN_GLOW_FRAG, SUN_GLOW_VERT } from '@/lib/observatory/shaders/sun.glsl';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import { useBodyTexture } from '../useBodyTexture';

interface SunProps {
    position: [number, number, number];
    radius: number;
    locale: 'pt-BR' | 'en';
    withLighting?: boolean;
    onFocus?: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Sun({
    position,
    radius,
    locale,
    withLighting = false,
    onFocus,
    isFocused = false,
    showLabel = true,
}: SunProps) {
    const en = locale === 'en';
    const surfaceMesh = useRef<THREE.Mesh>(null);
    const sunTexture = useBodyTexture('/images/sun/sun-8k.jpg', 'srgb');

    const surfaceMaterial = useMemo(() => {
        if (!sunTexture) {
            return new THREE.MeshStandardMaterial({
                color: '#ffb347',
                emissive: new THREE.Color(1.0, 0.42, 0.08),
                emissiveIntensity: 1.35,
                roughness: 1,
                metalness: 0,
            });
        }

        return new THREE.MeshStandardMaterial({
            map: sunTexture,
            emissiveMap: sunTexture,
            emissive: new THREE.Color(1.0, 0.7, 0.3),
            emissiveIntensity: 1.2,
            roughness: 1,
            metalness: 0,
        });
    }, [sunTexture]);

    // Brilho da corona como uma única casca fresnel: uma esfera de faces voltadas para
    // dentro cuja opacidade cai suavemente em direção à borda. Isso produz um halo suave
    // que some gradualmente — sem um disco translúcido duro que se espalha como uma mancha
    // amarela quando o Sol está fora do quadro.
    const glowMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color('#ffb84d') } },
            vertexShader: SUN_GLOW_VERT,
            fragmentShader: SUN_GLOW_FRAG,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
        [],
    );

    useEffect(() => () => glowMaterial.dispose(), [glowMaterial]);
    useEffect(() => () => surfaceMaterial.dispose(), [surfaceMaterial]);

    useFrame((_state: unknown, delta: number) => {
        if (surfaceMesh.current) surfaceMesh.current.rotation.y += delta * 0.004;
    });

    return (
        <group>
            {withLighting ? (
                <pointLight position={position} intensity={8.0} distance={0} decay={0} color="#fff6e8" />
            ) : null}

            <group position={position}>
                <mesh ref={surfaceMesh}>
                    <sphereGeometry args={[radius, 64, 64]} />
                    <primitive object={surfaceMaterial} attach="material" />
                </mesh>
                {/* Corona: BackSide esfera grande — o shader faz todo o fade internamente */}
                <mesh scale={2.2}>
                    <sphereGeometry args={[radius, 128, 96]} />
                    <primitive object={glowMaterial} attach="material" />
                </mesh>
                <SunProminences radius={radius} />
                {onFocus && !isFocused ? (
                    <BodyHitbox
                        radius={radius * 2.5}
                        segments={[12, 8]}
                        onClick={onFocus}
                    />
                ) : null}
                {showLabel ? (
                    <ScreenLabel position={[0, radius + 0.42, 0]} protectFromFocus={!isFocused} allowSceneOverlap={isFocused} onClick={onFocus}>
                        <span className="font-semibold">{en ? 'Sun' : 'Sol'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </group>
    );
}

/**
 * Prominências solares animadas.
 *
 * Geradas proceduralmente como linhas que orbitam suavemente em torno do Sol.
 */
function SunProminences({ radius }: { radius: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const arcs = useMemo(() => {
        const configs = [
            { start: 0.35, height: 0.18, span: 0.36, tilt: 0.1 },
            { start: 2.15, height: 0.13, span: 0.28, tilt: -0.18 },
            { start: 4.7, height: 0.16, span: 0.32, tilt: 0.22 },
        ];

        return configs.map((config) => {
            const points: THREE.Vector3[] = [];
            for (let i = 0; i <= 28; i += 1) {
                const t = i / 28;
                const a = config.start + (t - 0.5) * config.span;
                const lift = Math.sin(Math.PI * t) * config.height * radius;
                points.push(new THREE.Vector3(
                    Math.cos(a) * (radius + lift),
                    Math.sin(config.tilt) * lift + Math.sin(a * 1.7) * radius * 0.04,
                    Math.sin(a) * (radius + lift),
                ));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: '#ffb45c',
                transparent: true,
                opacity: 0.42,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const line = new THREE.Line(geometry, material);
            return line;
        });
    }, [radius]);

    useEffect(() => () => {
        arcs.forEach((line) => {
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        });
    }, [arcs]);

    useFrame((_state: unknown, delta: number) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.012;
    });

    return (
        <group ref={groupRef}>
            {arcs.map((line, index) => (
                <primitive key={index} object={line} />
            ))}
        </group>
    );
}
