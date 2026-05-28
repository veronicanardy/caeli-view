import { ChevronDown, Ruler } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@/i18n';
import { COMPARISON_OBJECTS, ComparisonObject, ComparisonObjectType } from './comparisonObjects';
import { buildComparisonSentence, formatMeters, getAsteroidAverageDiameter } from './scaleUtils';

type Props = {
    diameterMinMeters: number | null;
    diameterMaxMeters: number | null;
    diameterAverageMeters: number | null;
    label: string;
    note: string;
    layout?: 'default' | 'stacked';
};

const SCENE_MAX_PX = 270;
const SCENE_MIN_PX = 16;

export function AsteroidScaleComparison({
    diameterMinMeters,
    diameterMaxMeters,
    diameterAverageMeters,
    label,
    note,
    layout = 'default',
}: Props) {
    const { locale } = useTranslation();
    const average = getAsteroidAverageDiameter(diameterMinMeters, diameterMaxMeters, diameterAverageMeters);
    const [selectedId, setSelectedId] = useState<ComparisonObjectType>('field');
    const selected = COMPARISON_OBJECTS.find((item) => item.id === selectedId) ?? COMPARISON_OBJECTS[0];
    const sceneMaxMeters = Math.max(average ?? 0, selected.sizeMeters, 1.7) * 1.14;
    const asteroidSize = visualSize(average, sceneMaxMeters);
    const referenceSize = visualSize(selected.sizeMeters, sceneMaxMeters);
    const humanSize = visualSize(1.7, sceneMaxMeters, 8);
    const sentence = buildComparisonSentence(average, selected, locale);

    const stacked = layout === 'stacked';

    return (
        <section className="section-slide overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-glow">
            <div className={`grid gap-0 ${stacked ? 'grid-cols-1' : 'xl:grid-cols-[1.12fr_0.88fr]'}`}>
                <div className="relative min-h-[30rem] overflow-hidden bg-space-950/70 p-5">
                    <div className="absolute inset-0 star-field opacity-20" aria-hidden="true" />
                    <div className="relative z-10 flex flex-col gap-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{locale === 'en' ? 'Scale comparison' : 'Comparação de escala'}</h3>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-white/58">{label}</p>
                            </div>
                            <label className="relative block min-w-56 text-sm text-white/60">
                                {locale === 'en' ? 'Compare with' : 'Comparar com'}
                                <select
                                    className="mt-2 w-full appearance-none rounded border border-white/10 bg-space-950/80 px-3 py-2 pr-9 text-white outline-none transition focus:border-signal-cyan"
                                    value={selectedId}
                                    onChange={(event) => setSelectedId(event.target.value as ComparisonObjectType)}
                                >
                                    {COMPARISON_OBJECTS.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {locale === 'en' ? item.labelEn : item.labelPt}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute bottom-2.5 right-3 size-4 text-white/45" aria-hidden="true" />
                            </label>
                        </div>

                        <div className="relative min-h-[21rem] rounded-lg border border-white/10 bg-black/20 p-4">
                            <div className="absolute bottom-8 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" aria-hidden="true" />
                            <div className="absolute bottom-10 right-4 top-6 flex flex-col items-center justify-between text-[0.65rem] uppercase tracking-wide text-white/45">
                                <span>{formatMeters(sceneMaxMeters, locale)}</span>
                                <span className="h-full w-px bg-gradient-to-b from-white/10 via-signal-cyan/65 to-white/10" />
                                <span>0 m</span>
                            </div>
                            <div className="absolute bottom-10 left-5 flex items-end gap-2 opacity-75" title={locale === 'en' ? 'Human reference: 1.70 m' : 'Referência humana: 1,70 m'}>
                                <HumanSilhouette size={humanSize} />
                                <span className="mb-1 text-[0.65rem] text-white/45">1,70 m</span>
                            </div>

                            <div className="absolute inset-x-8 bottom-12 top-16 flex items-end justify-center gap-8 sm:gap-14">
                                <div className="flex min-w-24 flex-col items-center gap-3 transition-all duration-500" style={{ width: `${Math.max(asteroidSize + 18, 112)}px` }}>
                                    <AsteroidCanvas size={asteroidSize} />
                                    <div className="text-center">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-signal-cyan">{locale === 'en' ? 'Asteroid' : 'Asteroide'}</p>
                                        <p className="text-xs text-white/55">{formatMeters(average, locale)}</p>
                                    </div>
                                </div>
                                <div className="flex min-w-24 flex-col items-center gap-3 transition-all duration-500" style={{ width: `${Math.max(referenceSize + 18, 112)}px` }}>
                                    <ComparisonSilhouette object={selected} size={referenceSize} />
                                    <div className="text-center">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{locale === 'en' ? selected.labelEn : selected.labelPt}</p>
                                        <p className="text-xs text-white/55">{formatMeters(selected.sizeMeters, locale)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-sm leading-6 text-white/62">{note}</p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <MeasureCard label={locale === 'en' ? 'Minimum diameter' : 'Diâmetro mínimo'} value={formatMeters(diameterMinMeters, locale)} />
                        <MeasureCard label={locale === 'en' ? 'Average diameter' : 'Diâmetro médio'} value={formatMeters(average, locale)} highlight />
                        <MeasureCard label={locale === 'en' ? 'Maximum diameter' : 'Diâmetro máximo'} value={formatMeters(diameterMaxMeters, locale)} />
                        <MeasureCard label={locale === 'en' ? 'Comparing with' : 'Comparando com'} value={`${locale === 'en' ? selected.labelEn : selected.labelPt} · ${formatMeters(selected.sizeMeters, locale)}`} />
                    </div>
                    <div className="mt-5 rounded border border-signal-cyan/20 bg-signal-cyan/10 p-4 text-sm leading-6 text-white/75">
                        <Ruler className="mb-2 size-4 text-signal-cyan" aria-hidden="true" />
                        {sentence}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-white/45">
                        {locale === 'en'
                            ? 'The camera pulls back when needed so both shapes fit, but the proportion between the asteroid and the selected reference is preserved.'
                            : 'A câmera se afasta quando necessário para caberem os dois elementos, mas a proporção entre o asteroide e a referência escolhida é preservada.'}
                    </p>
                </div>
            </div>
        </section>
    );
}

function AsteroidCanvas({ size }: { size: number }) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const roundedSize = Math.round(size);

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
            const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
            camera.position.set(0, 0.08, 4.4);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.display = 'block';
            mount.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xb8d7df, 0.46));
            const key = new THREE.DirectionalLight(0xffffff, 2.35);
            key.position.set(-3, 2.4, 4);
            scene.add(key);
            const rim = new THREE.DirectionalLight(0x76e4b5, 1);
            rim.position.set(3, -1.4, -2.2);
            scene.add(rim);

            const geometry = new THREE.IcosahedronGeometry(1.04, 5);
            const position = geometry.attributes.position;
            const vertex = new THREE.Vector3();

            for (let index = 0; index < position.count; index += 1) {
                vertex.fromBufferAttribute(position, index);
                const noise =
                    Math.sin(vertex.x * 7.4) * 0.06 +
                    Math.cos(vertex.y * 9.1) * 0.05 +
                    Math.sin((vertex.x + vertex.z) * 11.3) * 0.04 +
                    (Math.random() - 0.5) * 0.07;

                vertex.normalize().multiplyScalar(1 + noise);
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
            scene.add(asteroid);

            const craterMaterial = new THREE.MeshBasicMaterial({ color: 0x20242c, transparent: true, opacity: 0.38, depthWrite: false });

            for (let index = 0; index < 18; index += 1) {
                const normal = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                const crater = new THREE.Mesh(new THREE.CircleGeometry(0.035 + Math.random() * 0.07, 18), craterMaterial);
                crater.position.copy(normal.clone().multiplyScalar(1.075));
                crater.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
                asteroid.add(crater);
            }

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
    }, [roundedSize]);

    if (failed) {
        return <div className="asteroid-fallback-rock" style={{ width: `${size}px`, height: `${size}px` }} />;
    }

    return <div ref={mountRef} className="transition-all duration-500" style={{ width: `${size}px`, height: `${size}px` }} />;
}

function ComparisonSilhouette({ object, size }: { object: ComparisonObject; size: number }) {
    const style = silhouetteStyle(object, size);

    return (
        <div className={`comparison-silhouette comparison-${object.id}`} style={style}>
            {object.id === 'building' ? <span className="building-windows" /> : null}
            {object.id === 'bus' || object.id === 'car' ? <span className="vehicle-wheels" /> : null}
            {object.id === 'field' ? <span className="field-lines" /> : null}
        </div>
    );
}

function HumanSilhouette({ size }: { size: number }) {
    return <div className="comparison-silhouette comparison-person" style={{ height: `${size}px`, width: `${Math.max(7, size * 0.34)}px` }} />;
}

function MeasureCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`rounded border p-3 ${highlight ? 'border-signal-cyan/25 bg-signal-cyan/10' : 'border-white/10 bg-space-950/35'}`}>
            <p className="text-xs text-white/45">{label}</p>
            <p className="mt-1 text-sm font-semibold text-white">{value}</p>
        </div>
    );
}

function visualSize(meters: number | null, maxMeters: number, min = SCENE_MIN_PX): number {
    if (!meters) {
        return min;
    }

    return Math.max(min, Math.min(SCENE_MAX_PX, (meters / maxMeters) * SCENE_MAX_PX));
}

function silhouetteStyle(object: ComparisonObject, size: number): CSSProperties {
    if (object.id === 'field' || object.id === 'plane' || object.id === 'bus' || object.id === 'car') {
        const ratio = object.id === 'field' ? 0.42 : object.id === 'plane' ? 0.28 : 0.38;

        return {
            width: `${size}px`,
            height: `${Math.max(8, size * ratio)}px`,
        };
    }

    const ratio = object.id === 'person' ? 0.34 : object.id === 'christ' ? 0.7 : object.id === 'liberty' ? 0.42 : 0.5;

    return {
        height: `${size}px`,
        width: `${Math.max(8, size * ratio)}px`,
    };
}
