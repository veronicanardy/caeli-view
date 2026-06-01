/**
 * Prévia procedural 3D de um pequeno corpo.
 *
 * Renderiza uma forma ilustrativa com Three.js a partir de seed e nível de
 * fidelidade já resolvidos. Não busca dados externos, não calcula órbita e não
 * transforma fallback simbólico em modelo real.
 */
import { Box } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AsteroidModelMetadata } from '@/types';

type Props = {
    seed: number;
    level: AsteroidModelMetadata['fidelityLevel'];
    diameter: number | null;
    compact: boolean;
};

export function ProceduralAsteroidPreview({ seed, level, diameter, compact }: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const scale = useMemo(() => Math.max(0.62, Math.min(1.42, Math.sqrt((diameter ?? 80) / 90))), [diameter]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let cleanup: (() => void) | undefined;
        let cancelled = false;

        void import('three').then((THREE) => {
            if (cancelled || !mount.isConnected) return;

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
            camera.position.set(0, 0.08, compact ? 5.2 : 4.6);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
            renderer.domElement.style.display = 'block';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            mount.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xb8d7df, 0.5));
            const key = new THREE.DirectionalLight(0xffffff, 2.3);
            key.position.set(-3, 2.2, 4);
            scene.add(key);
            const rim = new THREE.DirectionalLight(0x76e4b5, 1.1);
            rim.position.set(3, -1.4, -2.2);
            scene.add(rim);

            const detail = level === 'N5' ? 2 : level === 'N4' ? 4 : 5;
            const geometry = new THREE.IcosahedronGeometry(1, detail);
            const position = geometry.attributes.position;
            const vertex = new THREE.Vector3();
            const rand = seeded(seed);
            const roughness = level === 'N3' ? 0.12 : level === 'N4' ? 0.08 : 0.04;

            for (let index = 0; index < position.count; index += 1) {
                vertex.fromBufferAttribute(position, index);
                const noise =
                    Math.sin(vertex.x * (5.5 + rand() * 3)) * roughness +
                    Math.cos(vertex.y * (6.8 + rand() * 3)) * roughness * 0.8 +
                    (rand() - 0.5) * roughness;
                vertex.normalize().multiplyScalar(1 + noise);
                position.setXYZ(index, vertex.x, vertex.y, vertex.z);
            }
            geometry.computeVertexNormals();

            const asteroid = new THREE.Mesh(
                geometry,
                new THREE.MeshStandardMaterial({
                    color: level === 'N5' ? 0x4b5563 : 0x6b7280,
                    roughness: 0.95,
                    metalness: 0.03,
                    flatShading: true,
                }),
            );
            asteroid.scale.setScalar(scale);
            asteroid.rotation.set(-0.14, -0.38, 0.08);
            scene.add(asteroid);

            const resize = () => {
                const { width, height } = mount.getBoundingClientRect();
                camera.aspect = width / Math.max(height, 1);
                camera.updateProjectionMatrix();
                renderer.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), false);
            };

            const observer = new ResizeObserver(resize);
            observer.observe(mount);
            resize();

            let frame = 0;
            const clock = new THREE.Clock();
            const animate = () => {
                const delta = clock.getDelta();
                if (!reducedMotion) {
                    asteroid.rotation.y += delta * 0.16;
                    asteroid.rotation.x += delta * 0.02;
                }
                renderer.render(scene, camera);
                frame = window.requestAnimationFrame(animate);
            };
            animate();

            cleanup = () => {
                window.cancelAnimationFrame(frame);
                observer.disconnect();
                geometry.dispose();
                asteroid.material.dispose();
                renderer.dispose();
                renderer.domElement.remove();
            };
        }).catch(() => setFailed(true));

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [compact, level, scale, seed]);

    if (failed) {
        return (
            <div className="flex h-full min-h-28 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/45">
                <Box className="size-7" aria-hidden="true" />
            </div>
        );
    }

    return <div ref={mountRef} className="h-full min-h-28 rounded bg-black/10" />;
}

function seeded(seed: number) {
    let value = seed || 1;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}
