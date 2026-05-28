import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SUN_FRAG, SUN_GLOW_FRAG, SUN_GLOW_VERT, SUN_VERT } from '@/lib/observatory/shaders/sun.glsl';
import { ScreenLabel } from '../Overlays/SceneLabels';

/**
 * The visual Sun. Unified component that powers both:
 *  - the radar scene (passing the projected SUN_DISPLAY_DL position and enabling the directional
 *    light + warm point light along the real Sun direction);
 *  - the heliocentric scene (passing the origin [0, 0, 0] without the lighting — the heliocentric
 *    scene supplies its own lighting at the Sun position).
 *
 * Previously this was two near-identical components (Sun and SunAtOrigin). Unifying them removed a
 * ~50-line duplication.
 */
export function Sun({
    position,
    radius,
    locale,
    withLighting = false,
}: {
    position: [number, number, number];
    radius: number;
    locale: 'pt-BR' | 'en';
    /**
     * When true, attaches a directional light + point light at `position` so the Sun illuminates
     * the rest of the scene. The heliocentric layer wires its own lighting separately and passes
     * false to avoid duplicate lights.
     */
    withLighting?: boolean;
}) {
    const en = locale === 'en';
    const surfaceMat = useRef<THREE.ShaderMaterial>(null);

    // Animated photosphere (granulation + sunspots) — a star with life, not a flat disc.
    const surfaceMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: SUN_VERT,
            fragmentShader: SUN_FRAG,
        }),
        [],
    );

    // Corona glow as a single fresnel shell: a back-facing sphere whose opacity falls off smoothly
    // toward the rim. This gives a soft halo that fades to nothing — no hard translucent disc that
    // smears across the screen as a yellow blob when the Sun sits off-frame.
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

    useFrame(({ clock }) => {
        if (surfaceMat.current) surfaceMat.current.uniforms.uTime.value = clock.getElapsedTime();
    });

    return (
        <group>
            {withLighting ? (
                <>
                    <directionalLight position={position} intensity={2.2} color="#fff6e8" />
                    <pointLight position={position} intensity={0.5} distance={80} color="#ffdca8" />
                </>
            ) : null}

            <group position={position}>
                <mesh>
                    <sphereGeometry args={[radius, 160, 96]} />
                    <primitive ref={surfaceMat} object={surfaceMaterial} attach="material" />
                </mesh>
                <mesh scale={1.018}>
                    <sphereGeometry args={[radius, 96, 64]} />
                    <meshBasicMaterial color="#ffd27a" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
                </mesh>
                <mesh scale={1.18}>
                    <sphereGeometry args={[radius, 96, 64]} />
                    <primitive object={glowMaterial} attach="material" />
                </mesh>
                <SunProminences radius={radius} />
                <ScreenLabel position={[0, radius + 0.42, 0]} protectFromFocus={false}>
                    <span className="font-semibold">{en ? 'Sun' : 'Sol'}</span>
                </ScreenLabel>
            </group>
        </group>
    );
}

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

    useFrame((_, delta) => {
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
