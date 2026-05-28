import { useEffect, useRef, useState } from 'react';

type Props = {
    sizePx?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    label?: string;
};

export function Moon3D({ sizePx = 56, autoRotate = true, autoRotateSpeed = 0.08, label = 'Lua' }: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let cleanup: (() => void) | undefined;
        let cancelled = false;

        void import('three').then((THREE) => {
            if (cancelled || !mount.isConnected) return;

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
            camera.position.set(0, 0, 3.6);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.display = 'block';
            mount.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xc8cad6, 0.78));
            const sun = new THREE.DirectionalLight(0xffffff, 1.9);
            sun.position.set(-3, 1.5, 3);
            scene.add(sun);

            const diffuse = buildMoonTexture(THREE, 512);
            const bump = buildMoonBumpMap(THREE, 512);

            const moon = new THREE.Mesh(
                new THREE.SphereGeometry(1, 64, 64),
                new THREE.MeshStandardMaterial({
                    map: diffuse,
                    bumpMap: bump,
                    bumpScale: 0.04,
                    roughness: 0.9,
                    metalness: 0.02,
                }),
            );
            moon.rotation.x = 0.18;
            scene.add(moon);

            const resize = () => {
                const { width, height } = mount.getBoundingClientRect();
                if (width < 1 || height < 1) return;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(Math.round(width), Math.round(height), false);
            };

            const observer = new ResizeObserver(resize);
            observer.observe(mount);
            resize();

            let frame = 0;
            const clock = new THREE.Clock();
            const animate = () => {
                const delta = clock.getDelta();
                if (autoRotate && !reducedMotion) {
                    moon.rotation.y += delta * autoRotateSpeed;
                }
                renderer.render(scene, camera);
                frame = window.requestAnimationFrame(animate);
            };
            animate();

            cleanup = () => {
                window.cancelAnimationFrame(frame);
                observer.disconnect();
                scene.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        const material = object.material as import('three').MeshStandardMaterial;
                        material.map?.dispose();
                        material.bumpMap?.dispose();
                        material.dispose();
                    }
                });
                renderer.dispose();
                if (renderer.domElement.parentNode === mount) {
                    mount.removeChild(renderer.domElement);
                }
            };
        }).catch(() => {
            setFailed(true);
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [autoRotate, autoRotateSpeed]);

    if (failed) {
        return (
            <div
                className="rounded-full bg-slate-200 shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.35)]"
                style={{ width: sizePx, height: sizePx }}
                aria-label={label}
                role="img"
            />
        );
    }

    return (
        <div
            ref={mountRef}
            className="rounded-full"
            style={{ width: sizePx, height: sizePx }}
            aria-label={label}
            role="img"
        />
    );
}

type ThreeNamespace = typeof import('three');

function buildMoonTexture(THREE: ThreeNamespace, size: number) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#aeb0b6');
    gradient.addColorStop(0.5, '#c2c4c8');
    gradient.addColorStop(1, '#9da0a6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rng = mulberry32(0xa1b2c3);
    for (let i = 0; i < 280; i += 1) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const r = 2 + rng() * 14;
        const shade = 100 + Math.floor(rng() * 80);
        ctx.fillStyle = `rgba(${shade},${shade},${shade + 4},${0.18 + rng() * 0.25})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = 0; i < 18; i += 1) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const r = 30 + rng() * 60;
        const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(70,72,78,0.42)');
        grad.addColorStop(1, 'rgba(70,72,78,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function buildMoonBumpMap(THREE: ThreeNamespace, size: number) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rng = mulberry32(0xd4e5f6);
    for (let i = 0; i < 320; i += 1) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const r = 3 + rng() * 18;
        const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(40,40,40,0.6)');
        grad.addColorStop(0.7, 'rgba(180,180,180,0.4)');
        grad.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t = (t + 0x6d2b79f5) >>> 0;
        let r = t;
        r = Math.imul(r ^ (r >>> 15), r | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
