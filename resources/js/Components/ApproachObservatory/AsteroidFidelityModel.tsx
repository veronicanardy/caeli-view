import { Box, Database, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { compactMeters, formatNumber } from '@/lib/format';
import type { AsteroidModelMetadata, UnifiedApproach } from '@/types';

type Props = {
    approach: UnifiedApproach;
    model: AsteroidModelMetadata | null;
    loading: boolean;
    locale: 'pt-BR' | 'en';
    compact?: boolean;
    embedded?: boolean;
};

const LEVEL_TONE: Record<AsteroidModelMetadata['fidelityLevel'], string> = {
    N1: 'border-signal-mint/50 bg-signal-mint/10 text-signal-mint',
    N2: 'border-signal-cyan/50 bg-signal-cyan/10 text-signal-cyan',
    N3: 'border-signal-violet/45 bg-signal-violet/10 text-signal-violet',
    N4: 'border-signal-amber/45 bg-signal-amber/10 text-signal-amber',
    N5: 'border-white/15 bg-white/[0.04] text-white/60',
};

export function AsteroidFidelityModel({ approach, model, loading, locale, compact = false, embedded = false }: Props) {
    const en = locale === 'en';
    const diameter = model?.diameterMeters ?? averageDiameter(approach);
    const level = model?.fidelityLevel ?? (diameter !== null ? 'N4' : 'N5');
    const seed = model?.shapeSeed ?? seedFrom(approach.id);
    const source = model?.sourceName ?? (en ? 'Local procedural resolver' : 'Resolvedor procedural local');

    if (compact) {
        return (
            <section className={embedded ? 'overflow-hidden bg-space-950/20' : 'overflow-hidden rounded-lg border border-white/10 bg-space-950/40'}>
                <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-white/45">
                            {en ? '3D fidelity' : 'Fidelidade 3D'}
                        </p>
                        <p className="truncate text-xs font-medium text-white/75">
                            {labelForLevel(level, locale)}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_TONE[level]}`}>
                        {loading ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-3" aria-hidden="true" />}
                        {level}
                    </span>
                </div>

                <div className="space-y-3 p-3">
                    {model?.sourceUrl ? (
                        <a
                            href={model.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-cyan outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        >
                            <Database className="size-3" aria-hidden="true" />
                            {source}
                        </a>
                    ) : (
                        <p className="inline-flex items-center gap-1 text-[11px] text-white/55">
                            <Database className="size-3" aria-hidden="true" />
                            {source}
                        </p>
                    )}

                    <div className="min-h-44">
                        <ProceduralAsteroid seed={seed} level={level} diameter={diameter} compact={false} />
                    </div>

                    <p className="text-[11px] leading-5 text-white/58">
                        {localizedModelNote(model, level, locale)}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                        <Datum label={en ? 'Diameter' : 'Diametro'} value={compactMeters(diameter)} />
                        <Datum label={en ? 'Kind' : 'Tipo'} value={modelKind(model?.modelKind, locale)} />
                        <Datum label={en ? 'Confidence' : 'Confianca'} value={model ? `${formatNumber(model.confidence * 100, 0)}%` : '-'} />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={embedded ? 'overflow-hidden bg-space-950/20' : 'overflow-hidden rounded-lg border border-white/10 bg-space-950/40'}>
            <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-white/45">
                        {en ? '3D fidelity' : 'Fidelidade 3D'}
                    </p>
                    <p className="truncate text-xs font-medium text-white/75">
                        {labelForLevel(level, locale)}
                    </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_TONE[level]}`}>
                    {loading ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-3" aria-hidden="true" />}
                    {level}
                </span>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-3">
                    <p className="text-sm leading-6 text-white/62">
                        {localizedModelNote(model, level, locale)}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <Datum label={en ? 'Diameter' : 'Diametro'} value={compactMeters(diameter)} />
                        <Datum label={en ? 'Kind' : 'Tipo'} value={modelKind(model?.modelKind, locale)} />
                        <Datum label={en ? 'Confidence' : 'Confianca'} value={model ? `${formatNumber(model.confidence * 100, 0)}%` : '-'} />
                    </div>
                    {model?.sourceUrl ? (
                        <a
                            href={model.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-cyan outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        >
                            <Database className="size-3" aria-hidden="true" />
                            {model.sourceName}
                        </a>
                    ) : (
                        <p className="inline-flex items-center gap-1 text-[11px] text-white/45">
                            <Database className="size-3" aria-hidden="true" />
                            {source}
                        </p>
                    )}
                </div>

                <div className={compact ? 'min-h-28' : 'min-h-64'}>
                    <ProceduralAsteroid seed={seed} level={level} diameter={diameter} compact={compact} />
                </div>
            </div>
        </section>
    );
}

function ProceduralAsteroid({
    seed,
    level,
    diameter,
    compact,
}: {
    seed: number;
    level: AsteroidModelMetadata['fidelityLevel'];
    diameter: number | null;
    compact: boolean;
}) {
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

function Datum({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded border border-white/10 bg-white/[0.025] px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/80">{value}</p>
        </div>
    );
}

function averageDiameter(approach: UnifiedApproach): number | null {
    if (approach.diameterMeters !== null) return approach.diameterMeters;
    if (approach.estimatedDiameterMinMeters !== null && approach.estimatedDiameterMaxMeters !== null) {
        return (approach.estimatedDiameterMinMeters + approach.estimatedDiameterMaxMeters) / 2;
    }
    return null;
}

function seedFrom(value: string): number {
    let seed = 0;
    for (let index = 0; index < value.length; index += 1) {
        seed = (seed * 31 + value.charCodeAt(index)) % 100000;
    }
    return seed;
}

function seeded(seed: number) {
    let value = seed || 1;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

function labelForLevel(level: AsteroidModelMetadata['fidelityLevel'], locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    return {
        N1: en ? 'Real shape model' : 'Modelo real de forma',
        N2: en ? 'Catalog reference' : 'Referencia catalogada',
        N3: en ? 'Physics-informed procedural' : 'Procedural com dados fisicos',
        N4: en ? 'Size-only procedural' : 'Procedural por tamanho',
        N5: en ? 'Placeholder only' : 'Placeholder',
    }[level];
}

function modelKind(kind: AsteroidModelMetadata['modelKind'] | undefined, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    if (kind === 'real_shape') return en ? 'Real' : 'Real';
    if (kind === 'catalog_reference') return en ? 'Catalog' : 'Catalogo';
    if (kind === 'procedural') return en ? 'Procedural' : 'Procedural';
    return en ? 'Placeholder' : 'Placeholder';
}

function fallbackNote(level: AsteroidModelMetadata['fidelityLevel'], locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    if (level === 'N5') {
        return en
            ? 'No reliable physical size is available yet, so this is only a neutral placeholder.'
            : 'Ainda nao ha tamanho fisico confiavel, entao isto e apenas um placeholder neutro.';
    }
    return en
        ? 'The resolver is loading. A procedural preview is shown until cached model metadata arrives.'
        : 'O resolvedor esta carregando. Uma previa procedural aparece ate os metadados em cache chegarem.';
}

function localizedModelNote(
    model: AsteroidModelMetadata | null,
    level: AsteroidModelMetadata['fidelityLevel'],
    locale: 'pt-BR' | 'en',
): string {
    const en = locale === 'en';

    if (!model) return fallbackNote(level, locale);

    if (model.fidelityLevel === 'N3') {
        return en
            ? 'Procedural model generated from known diameter and orbital identity. The shape is illustrative, not a measured shape model.'
            : 'Modelo procedural gerado a partir do diametro conhecido e da identidade orbital. A forma e ilustrativa, nao um modelo medido.';
    }

    if (model.fidelityLevel === 'N4') {
        return en
            ? 'Size-only procedural model generated from the available diameter range.'
            : 'Modelo procedural baseado apenas no intervalo de diametro disponivel.';
    }

    if (model.fidelityLevel === 'N5') {
        return en
            ? 'No reliable physical size is available yet, so this is only a neutral placeholder.'
            : 'Ainda nao ha tamanho fisico confiavel, entao isto e apenas um placeholder neutro.';
    }

    if (model.fidelityLevel === 'N2') {
        return en
            ? 'Catalog reference found, but no lightweight real model is configured yet.'
            : 'Referencia catalogada encontrada, mas ainda sem modelo real leve configurado.';
    }

    return en
        ? 'Validated real shape model resolved by backend catalog.'
        : 'Modelo real de forma resolvido pelo catalogo do backend.';
}
