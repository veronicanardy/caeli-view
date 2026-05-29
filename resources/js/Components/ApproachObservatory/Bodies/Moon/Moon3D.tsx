import { useEffect, useRef, useState } from 'react';

/**
 * Props do componente Moon3D.
 *
 * @prop sizePx          Tamanho do canvas em pixels (largura e altura iguais). Padrão: 56.
 * @prop autoRotate      Habilita rotação automática em torno do eixo Y. Padrão: true.
 * @prop autoRotateSpeed Velocidade de rotação em radianos por segundo. Padrão: 0.08.
 * @prop label           Texto alternativo acessível (aria-label). Padrão: 'Lua'.
 */
type Props = {
    sizePx?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    label?: string;
};

/**
 * Renderiza uma Lua 3D procedural usando Three.js carregado sob demanda (lazy import).
 *
 * A textura e o bump map são gerados via Canvas 2D no cliente — sem arquivos externos —
 * usando um PRNG determinístico (Mulberry32) para garantir aparência consistente entre sessões.
 *
 * Em caso de falha no carregamento do Three.js, exibe um fallback CSS (círculo acinzentado)
 * que preserva o espaço visual sem quebrar o layout.
 *
 * Respeita `prefers-reduced-motion`: quando ativo, a rotação é suspensa automaticamente.
 */
export function Moon3D({ sizePx = 56, autoRotate = true, autoRotateSpeed = 0.08, label = 'Lua' }: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let cleanup: (() => void) | undefined;
        let cancelled = false;

        void import('three').then((THREE) => {
            // Aborta se o componente foi desmontado enquanto o import carregava
            if (cancelled || !mount.isConnected) return;

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            // Câmera com FOV estreito (32°) para reduzir distorção de perspectiva na esfera
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

            // Luz ambiente suave + luz direcional simulando o Sol (posição superior esquerda)
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
                    bumpScale: 0.04,  // relevo sutil — bump alto demais fica artificial
                    roughness: 0.9,
                    metalness: 0.02,
                }),
            );
            moon.rotation.x = 0.18; // leve inclinação para mostrar os polos
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

            // Libera todos os recursos WebGL ao desmontar para evitar vazamento de memória
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

    // Fallback CSS: círculo acinzentado com sombra interna simulando volume
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

/** Alias de tipo para o namespace do Three.js carregado dinamicamente */
type ThreeNamespace = typeof import('three');

/**
 * Gera a textura de cor (diffuse map) da Lua proceduralmente via Canvas 2D.
 *
 * Camadas sobrepostas com o mesmo PRNG determinístico (semente fixa):
 *   1. Gradiente linear de fundo em tons de cinza acinzentado
 *   2. 280 manchas pequenas circulares semi-transparentes (variação granular da superfície)
 *   3. 18 manchas escuras grandes com gradiente radial (maria lunares — planícies basálticas)
 *
 * A semente fixa garante que a textura seja idêntica a cada renderização.
 */
function buildMoonTexture(THREE: ThreeNamespace, size: number) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2; // proporção 2:1 para mapeamento esférico equirretangular
    const ctx = canvas.getContext('2d')!;

    // Camada base: gradiente vertical simulando variação de albedo polo-a-polo
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#aeb0b6');
    gradient.addColorStop(0.5, '#c2c4c8');
    gradient.addColorStop(1, '#9da0a6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camada de granularidade: manchas pequenas aleatórias (regolito e crateras rasas)
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

    // Camada de maria: manchas escuras grandes com gradiente radial (planícies basálticas)
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

/**
 * Gera o bump map da Lua proceduralmente via Canvas 2D.
 *
 * O bump map é uma textura em escala de cinza onde:
 *   - cinza médio (128) = superfície plana
 *   - escuro = depressão (interior de cratera)
 *   - claro = elevação (borda de cratera)
 *
 * Cada cratera é desenhada com um gradiente radial: centro escuro → borda clara → transparente,
 * simulando o perfil côncavo real. Semente diferente da textura diffuse para evitar
 * que as crateras coïncidam perfeitamente com as manchas escuras.
 */
function buildMoonBumpMap(THREE: ThreeNamespace, size: number) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;

    // Base neutra: cinza 50% = altura zero (sem elevação nem depressão)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 320 crateras com perfil radial: escuro no centro, claro na borda
    const rng = mulberry32(0xd4e5f6);
    for (let i = 0; i < 320; i += 1) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const r = 3 + rng() * 18;
        const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(40,40,40,0.6)');    // fundo da cratera (depressão)
        grad.addColorStop(0.7, 'rgba(180,180,180,0.4)'); // borda elevada
        grad.addColorStop(1, 'rgba(128,128,128,0)');    // transição suave para a superfície
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

/**
 * Gerador de números pseudo-aleatórios Mulberry32.
 *
 * Escolhido por ser determinístico (mesma semente = mesma sequência), rápido e com
 * boa distribuição para uso em texturas procedurais. A semente é fixada por componente
 * (textura vs bump map) para garantir aparência consistente entre sessões.
 *
 * Referência: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
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
