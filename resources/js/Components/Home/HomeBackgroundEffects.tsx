// Procedural starfield — no animation loop, no visible seam.
// Stars are placed deterministically via a seeded PRNG and twinkle in place.
// Three depth layers move at different parallax speeds for depth.

const LAYERS = [
    // [count, seed, minPx, maxPx, minOpacity, maxOpacity, parallaxScale]
    { count: 156, seed: 11, minSize: 0.5, maxSize: 1.25, minOp: 0.18, maxOp: 0.58, px: 0.18 },
    { count: 92, seed: 37, minSize: 0.78, maxSize: 1.9, minOp: 0.28, maxOp: 0.8, px: 0.38 },
    { count: 44, seed: 73, minSize: 1.18, maxSize: 2.8, minOp: 0.42, maxOp: 0.92, px: 0.68 },
    { count: 16, seed: 97, minSize: 1.7, maxSize: 3.6, minOp: 0.34, maxOp: 0.78, px: 0.95 },
] as const;

type Star = {
    id: string;
    x: number;
    y: number;
    size: number;
    opacity: number;
    twinkleDelay: number;
    twinkleDuration: number;
    colorClass: string;
};

const COLOR_CLASSES = ['star-white', 'star-blue', 'star-warm'] as const;

function buildLayer(count: number, seed: number, minSize: number, maxSize: number, minOp: number, maxOp: number): Star[] {
    return Array.from({ length: count }, (_, i) => {
        const r = (v: number) => Math.abs(Math.sin(v * 12.9898 + seed * 78.233) * 43758.5453) % 1;
        const x = r(seed + i * 2.17) * 102 - 1;
        const y = r(seed * 1.9 + i * 3.41) * 102 - 1;
        const size = minSize + r(seed * 2.7 + i * 5.13) * (maxSize - minSize);
        const opacity = minOp + r(seed * 4.1 + i * 7.77) * (maxOp - minOp);
        const twinkleDelay = r(seed * 6.3 + i * 2.91) * -12;
        const twinkleDuration = 4 + r(seed * 3.1 + i * 1.77) * 5;
        const colorIdx = Math.floor(r(seed * 8.8 + i * 4.44) * COLOR_CLASSES.length);
        return {
            id: `${seed}-${i}`,
            x, y, size, opacity,
            twinkleDelay,
            twinkleDuration,
            colorClass: COLOR_CLASSES[colorIdx],
        };
    });
}

const starLayers = LAYERS.map((l) => buildLayer(l.count, l.seed, l.minSize, l.maxSize, l.minOp, l.maxOp));

const constellationPoints = [
    { x: 12, y: 72 }, { x: 25, y: 58 }, { x: 38, y: 63 },
    { x: 52, y: 43 }, { x: 68, y: 49 }, { x: 82, y: 34 },
];

export function HomeBackgroundEffects() {
    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-space-950/80" />

            {/* Very subtle grid */}
            <div className="pointer-events-none absolute inset-0 space-grid opacity-[0.1]" />

            {/* Three star depth layers with different parallax speeds */}
            {starLayers.map((stars, layerIdx) => {
                const px = LAYERS[layerIdx].px;
                return (
                    <div
                        key={layerIdx}
                        className="pointer-events-none absolute inset-0 star-layer"
                        style={{
                            transform: `translate3d(calc(var(--parallax-x) * ${px}), calc(var(--parallax-y) * ${px * 0.72}), 0)`,
                            transition: 'transform 600ms cubic-bezier(0.16,1,0.3,1)',
                            willChange: 'transform',
                        }}
                    >
                        {stars.map((star) => (
                            <span
                                key={star.id}
                                className={`star-dot ${star.colorClass}`}
                                style={{
                                    left: `${star.x}%`,
                                    top: `${star.y}%`,
                                    width: `${star.size}px`,
                                    height: `${star.size}px`,
                                    opacity: star.opacity,
                                    animationDelay: `${star.twinkleDelay}s`,
                                    animationDuration: `${star.twinkleDuration}s`,
                                }}
                            />
                        ))}
                    </div>
                );
            })}

            {/* Deep halo behind the Earth — embeds the planet in atmosphere */}
            <div className="premium-nebula-deep" />

            <div className="premium-nebula premium-nebula-a" />
            <div className="premium-nebula premium-nebula-b" />
            <div className="premium-nebula premium-nebula-c" />
            <div className="premium-nebula premium-nebula-d" />
            {/* Deep galactic band — horizontal mid-plane depth layer */}
            <div className="premium-nebula premium-nebula-galaxy" />
            {/* Subtle warm accent near the Earth side */}
            <div className="premium-nebula premium-nebula-warmth" />
            <div className="premium-nebula premium-nebula-aurora" />

            {/* Hero stars — three luminous focal points */}
            <span className="hero-star hero-star-a" aria-hidden="true" />
            <span className="hero-star hero-star-b" aria-hidden="true" />
            <span className="hero-star hero-star-c" aria-hidden="true" />
            <span className="stellar-streak stellar-streak-a" aria-hidden="true" />
            <span className="stellar-streak stellar-streak-b" aria-hidden="true" />

            {/* Orbital arc decorations */}
            <div className="premium-orbit-field absolute inset-0">
                <div className="premium-orbit-arc premium-orbit-arc-a" />
                <div className="premium-orbit-arc premium-orbit-arc-b" />
                <div className="premium-orbit-arc premium-orbit-arc-c" />
            </div>

            {/* Constellation */}
            <svg
                className="premium-constellation absolute left-[6%] top-[58%] hidden h-44 w-96 md:block"
                style={{
                    transform: 'translate3d(calc(var(--parallax-x) * 0.14), calc(var(--parallax-y) * 0.10), 0)',
                    transition: 'transform 800ms cubic-bezier(0.16,1,0.3,1)',
                }}
                viewBox="0 0 100 100"
                role="presentation"
                aria-hidden="true"
            >
                <polyline
                    points={constellationPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.24"
                />
                {constellationPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={i === 3 ? 1.0 : 0.62} />
                ))}
            </svg>

        </div>
    );
}
