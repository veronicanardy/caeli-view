import { Ruler } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n';
import { compactMeters } from '@/lib/format';

type Props = {
    diameterMinMeters: number | null;
    diameterMaxMeters: number | null;
    diameterAverageMeters: number | null;
    label: string;
    note: string;
};

export function Asteroid3DPrototype({
    diameterMinMeters,
    diameterMaxMeters,
    diameterAverageMeters,
    label,
    note,
}: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const { locale } = useTranslation();
    const modelScale = scaleFromDiameter(diameterAverageMeters);
    const comparison = comparisonForDiameter(diameterAverageMeters, locale);

    useEffect(() => {
        const mount = mountRef.current;

        if (!mount) {
            return undefined;
        }

        let cleanup: (() => void) | undefined;
        let cancelled = false;

        void import('three').then((THREE) => {
            if (cancelled || !mount.isConnected) {
                return;
            }

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
            camera.position.set(0, 0.12, 5.2);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.display = 'block';
            mount.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xb8d7df, 0.52));
            const key = new THREE.DirectionalLight(0xffffff, 2.4);
            key.position.set(-3, 2.4, 4);
            scene.add(key);
            const rim = new THREE.DirectionalLight(0x76e4b5, 1.1);
            rim.position.set(3, -1.4, -2.2);
            scene.add(rim);

            const geometry = new THREE.IcosahedronGeometry(1.08, 5);
            const position = geometry.attributes.position;
            const vertex = new THREE.Vector3();

            for (let index = 0; index < position.count; index += 1) {
                vertex.fromBufferAttribute(position, index);
                const directionalNoise =
                    Math.sin(vertex.x * 7.4) * 0.055 +
                    Math.cos(vertex.y * 9.1) * 0.05 +
                    Math.sin((vertex.x + vertex.z) * 11.3) * 0.04 +
                    (Math.random() - 0.5) * 0.075;

                vertex.normalize().multiplyScalar(1 + directionalNoise);
                position.setXYZ(index, vertex.x, vertex.y, vertex.z);
            }

            geometry.computeVertexNormals();

            const asteroid = new THREE.Mesh(
                geometry,
                new THREE.MeshStandardMaterial({
                    color: 0x6b7280,
                    roughness: 0.95,
                    metalness: 0.04,
                    flatShading: true,
                }),
            );
            asteroid.rotation.set(-0.14, -0.38, 0.08);
            asteroid.scale.setScalar(modelScale);
            scene.add(asteroid);

            const craterMaterial = new THREE.MeshBasicMaterial({
                color: 0x20242c,
                transparent: true,
                opacity: 0.38,
                depthWrite: false,
            });

            for (let index = 0; index < 22; index += 1) {
                const normal = new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                ).normalize();
                const crater = new THREE.Mesh(new THREE.CircleGeometry(0.035 + Math.random() * 0.075, 18), craterMaterial);
                crater.position.copy(normal.clone().multiplyScalar(1.095));
                crater.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
                asteroid.add(crater);
            }

            const stars = new THREE.Points(
                new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(randomStarPositions(THREE, 180), 3)),
                new THREE.PointsMaterial({ color: 0xd9fbff, size: 0.018, transparent: true, opacity: 0.5, depthWrite: false }),
            );
            scene.add(stars);

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
                    asteroid.rotation.x += delta * 0.025;
                    stars.rotation.y += delta * 0.012;
                }

                renderer.render(scene, camera);
                frame = window.requestAnimationFrame(animate);
            };

            animate();

            cleanup = () => {
                window.cancelAnimationFrame(frame);
                observer.disconnect();
                scene.traverse((object) => {
                    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
                        object.geometry.dispose();
                        const material = object.material;

                        if (Array.isArray(material)) {
                            material.forEach((item) => item.dispose());
                        } else {
                            material.dispose();
                        }
                    }
                });
                renderer.dispose();
                renderer.domElement.remove();
            };
        }).catch(() => {
            setFailed(true);
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [modelScale]);

    return (
        <section className="section-slide overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-glow">
            <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="relative min-h-[22rem] bg-space-950/70">
                    <div className="absolute inset-0 star-field opacity-20" aria-hidden="true" />
                    <div ref={mountRef} className="absolute inset-0" />
                    <div className="pointer-events-none absolute bottom-24 right-5 top-8 flex flex-col items-center justify-between text-[0.65rem] uppercase tracking-wide text-white/45">
                        <span>{compactMeters(scaleGuideMax(diameterAverageMeters))}</span>
                        <span className="h-full w-px bg-gradient-to-b from-white/10 via-signal-cyan/65 to-white/10" />
                        <span>0 m</span>
                    </div>
                    {failed ? (
                        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/60">
                            {locale === 'en' ? 'WebGL was not available, but the size data remains available beside the model.' : 'WebGL não ficou disponível, mas os dados de tamanho continuam ao lado.'}
                        </div>
                    ) : null}
                    <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded border border-white/10 bg-space-950/75 px-4 py-3 text-sm text-white/70 backdrop-blur">
                        <Ruler className="size-4 text-signal-cyan" aria-hidden="true" />
                        <span>{label} · {locale === 'en' ? 'visual scale' : 'escala visual'} {Math.round(modelScale * 100)}%</span>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-sm leading-6 text-white/62">{note}</p>
                    <div className="mt-6 space-y-4">
                        <Measure label={locale === 'en' ? 'Minimum diameter' : 'Diâmetro mínimo'} value={compactMeters(diameterMinMeters)} />
                        <Measure label={locale === 'en' ? 'Approximate average diameter' : 'Diâmetro médio aproximado'} value={compactMeters(diameterAverageMeters)} emphasized />
                        <Measure label={locale === 'en' ? 'Maximum diameter' : 'Diâmetro máximo'} value={compactMeters(diameterMaxMeters)} />
                    </div>
                    <div className="mt-6 rounded border border-signal-cyan/20 bg-signal-cyan/10 p-4 text-sm leading-6 text-white/70">
                        {comparison.description}
                        <div className="mt-4 space-y-3">
                            <ScaleBar label={locale === 'en' ? 'Asteroid' : 'Asteroide'} meters={diameterAverageMeters} maxMeters={comparison.maxMeters} accent />
                            <ScaleBar label={comparison.label} meters={comparison.meters} maxMeters={comparison.maxMeters} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Measure({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
    return (
        <div>
            <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white/55">{label}</span>
                <span className={emphasized ? 'font-semibold text-white' : 'text-white/75'}>{value}</span>
            </div>
            <div className="mt-2 h-px bg-gradient-to-r from-signal-cyan/50 via-white/12 to-transparent" />
        </div>
    );
}

function ScaleBar({ label, meters, maxMeters, accent = false }: { label: string; meters: number | null; maxMeters: number; accent?: boolean }) {
    const percent = meters ? Math.max(3, Math.min(100, (meters / maxMeters) * 100)) : 3;

    return (
        <div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/55">
                <span>{label}</span>
                <span>{compactMeters(meters)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-white/10">
                <div className={`h-full rounded-full ${accent ? 'bg-signal-cyan' : 'bg-white/35'}`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function scaleFromDiameter(value: number | null): number {
    if (!value) {
        return 0.62;
    }

    return Math.max(0.24, Math.min(1.36, Math.sqrt(value / 100) * 0.66));
}

function scaleGuideMax(value: number | null): number | null {
    if (!value) {
        return null;
    }

    if (value <= 25) {
        return 25;
    }

    if (value <= 100) {
        return 100;
    }

    if (value <= 250) {
        return 250;
    }

    if (value <= 500) {
        return 500;
    }

    return 1000;
}

function comparisonForDiameter(value: number | null, locale: string): { label: string; meters: number; maxMeters: number; description: string } {
    if (!value) {
        return {
            label: locale === 'en' ? 'City bus' : 'ônibus',
            meters: 12,
            maxMeters: 100,
            description: locale === 'en' ? 'Not enough diameter data for an honest scale comparison.' : 'Sem diâmetro suficiente para uma comparação honesta de escala.',
        };
    }

    if (value < 35) {
        const buses = value / 12;

        return {
            label: locale === 'en' ? 'City bus' : 'ônibus',
            meters: 12,
            maxMeters: Math.max(value, 12) * 1.35,
            description: locale === 'en'
                ? `Approximate scale: about ${Math.max(1, buses).toFixed(buses >= 10 ? 0 : 1)} city bus(es) long.`
                : `Escala aproximada: cerca de ${Math.max(1, buses).toFixed(buses >= 10 ? 0 : 1)} ônibus em comprimento.`,
        };
    }

    if (value < 90) {
        const christ = 38;

        return {
            label: locale === 'en' ? 'Christ the Redeemer' : 'Cristo Redentor',
            meters: christ,
            maxMeters: Math.max(value, christ) * 1.3,
            description: locale === 'en'
                ? `Approximate scale: comparable to ${Math.max(0.1, value / christ).toFixed(1)} Christ the Redeemer statue(s).`
                : `Escala aproximada: comparável a ${Math.max(0.1, value / christ).toFixed(1)} Cristo(s) Redentor(es).`,
        };
    }

    if (value < 180) {
        const field = 105;

        return {
            label: locale === 'en' ? 'Football field' : 'campo de futebol',
            meters: field,
            maxMeters: Math.max(value, field) * 1.25,
            description: locale === 'en'
                ? `Approximate scale: about ${Math.max(0.1, value / field).toFixed(1)} football field(s) long.`
                : `Escala aproximada: cerca de ${Math.max(0.1, value / field).toFixed(1)} campo(s) de futebol em comprimento.`,
        };
    }

    const liberty = 93;

    return {
        label: locale === 'en' ? 'Statue of Liberty' : 'Estátua da Liberdade',
        meters: liberty,
        maxMeters: Math.max(value, liberty) * 1.18,
        description: locale === 'en'
            ? `Approximate scale: about ${Math.max(0.1, value / liberty).toFixed(1)} Statue(s) of Liberty tall.`
            : `Escala aproximada: cerca de ${Math.max(0.1, value / liberty).toFixed(1)} Estátua(s) da Liberdade em altura.`,
    };
}

function randomStarPositions(THREE: typeof import('three'), count: number): Float32Array {
    const positions = new Float32Array(count * 3);
    const vector = new THREE.Vector3();

    for (let index = 0; index < count; index += 1) {
        vector.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(8 + Math.random() * 6);
        positions[index * 3] = vector.x;
        positions[index * 3 + 1] = vector.y;
        positions[index * 3 + 2] = vector.z;
    }

    return positions;
}
