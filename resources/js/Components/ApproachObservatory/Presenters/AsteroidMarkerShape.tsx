import { useMemo } from 'react';
import { SmallBodyObjectType } from '@/types';

type Props = {
    seed: string;
    type: SmallBodyObjectType;
    sizePx: number;
};

const SIZE_PALETTE = {
    asteroid: { base: '#8a7a68', shade: '#3b3328', light: '#c8b394' },
    comet: { base: '#cfd6e0', shade: '#404a5e', light: '#e8eef6' },
    other: { base: '#9097a3', shade: '#3a3f4d', light: '#c5cad4' },
};

export function AsteroidMarkerShape({ seed, type, sizePx }: Props) {
    const shape = useMemo(() => generateShape(seed), [seed]);
    const palette = SIZE_PALETTE[type] ?? SIZE_PALETTE.other;
    const gradientId = `asteroid-gradient-${sanitize(seed)}`;
    const craterPositions = shape.craters;

    return (
        <svg
            width={sizePx}
            height={sizePx}
            viewBox="-100 -100 200 200"
            className="block drop-shadow-[0_0_4px_rgba(0,0,0,0.55)]"
            aria-hidden="true"
        >
            <defs>
                <radialGradient id={gradientId} cx="35%" cy="32%" r="75%">
                    <stop offset="0%" stopColor={palette.light} />
                    <stop offset="55%" stopColor={palette.base} />
                    <stop offset="100%" stopColor={palette.shade} />
                </radialGradient>
            </defs>
            <polygon
                points={shape.points}
                fill={`url(#${gradientId})`}
                stroke={palette.shade}
                strokeWidth={4}
                strokeLinejoin="round"
            />
            {craterPositions.map((c, i) => (
                <ellipse
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    rx={c.r}
                    ry={c.r * 0.78}
                    fill={palette.shade}
                    opacity={0.42}
                />
            ))}
            {craterPositions.slice(0, 2).map((c, i) => (
                <ellipse
                    key={`hi-${i}`}
                    cx={c.x - c.r * 0.35}
                    cy={c.y - c.r * 0.35}
                    rx={c.r * 0.35}
                    ry={c.r * 0.3}
                    fill={palette.light}
                    opacity={0.35}
                />
            ))}
        </svg>
    );
}

function generateShape(seed: string): { points: string; craters: Array<{ x: number; y: number; r: number }> } {
    const rng = seededRandom(seed);
    const vertexCount = 9 + Math.floor(rng() * 4);
    const baseRadius = 78;
    const jitter = 22;
    const pts: string[] = [];

    for (let i = 0; i < vertexCount; i += 1) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const radius = baseRadius - jitter / 2 + rng() * jitter;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    const craterCount = 2 + Math.floor(rng() * 3);
    const craters = [] as Array<{ x: number; y: number; r: number }>;
    for (let i = 0; i < craterCount; i += 1) {
        const angle = rng() * Math.PI * 2;
        const distance = rng() * (baseRadius - 30);
        craters.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            r: 8 + rng() * 14,
        });
    }

    return { points: pts.join(' '), craters };
}

function seededRandom(seed: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => {
        h += 0x6d2b79f5;
        let t = h;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}
