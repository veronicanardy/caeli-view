/**
 * Camada dos aneis SVG do radar 2D.
 *
 * Recebe raios e estados de hover ja calculados pelo layout puro. Este arquivo
 * nao deve recalcular orbitas, redefinir escalas ou decidir o tooltip global.
 */
import { ringStrokeColor, ringStrokeWidth } from './radarSvgPresentation';
import type { RadarSvgLayoutProps, RingHoverState } from './radarSvgTypes';

type RadarSvgRingsLayerProps = RadarSvgLayoutProps & {
    hoveredRingLD: number | null;
    onRingHoverChange?: (state: RingHoverState) => void;
};

export function RadarSvgRingsLayer({
    layout,
    hoveredRingLD,
    onRingHoverChange,
}: RadarSvgRingsLayerProps) {
    const outerRing = layout.rings.find((ring) => ring.ld === 150) ?? null;

    return (
        <g>
            {layout.rings.map((ring) => (
                <g key={ring.ld}>
                    <circle
                        cx={layout.center.x}
                        cy={layout.center.y}
                        r={ring.radiusPx}
                        fill="none"
                        stroke={ringStrokeColor(ring, hoveredRingLD === ring.ld)}
                        strokeWidth={ringStrokeWidth(ring, hoveredRingLD === ring.ld)}
                        vectorEffect="non-scaling-stroke"
                        aria-hidden="true"
                    />
                    <circle
                        cx={layout.center.x}
                        cy={layout.center.y}
                        r={ring.radiusPx}
                        fill="none"
                        stroke="rgba(0,0,0,0.001)"
                        strokeWidth={18}
                        vectorEffect="non-scaling-stroke"
                        style={{ pointerEvents: 'stroke' }}
                        onMouseEnter={(event) => {
                            const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            const x = rect ? event.clientX - rect.left : event.clientX;
                            const y = rect ? event.clientY - rect.top : event.clientY;
                            onRingHoverChange?.({ ld: ring.ld, x, y });
                        }}
                        onMouseMove={(event) => {
                            const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            const x = rect ? event.clientX - rect.left : event.clientX;
                            const y = rect ? event.clientY - rect.top : event.clientY;
                            onRingHoverChange?.({ ld: ring.ld, x, y });
                        }}
                        onMouseLeave={() => onRingHoverChange?.(null)}
                    />
                </g>
            ))}

            {outerRing ? (
                <text
                    x={layout.center.x + outerRing.radiusPx + 10}
                    y={layout.center.y - 8}
                    textAnchor="start"
                    fontSize={12}
                    fontWeight={600}
                    fill={hoveredRingLD === 150 ? 'rgba(84,214,214,0.95)' : 'rgba(255,255,255,0.92)'}
                    style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,28,0.85)', strokeWidth: 3, strokeLinejoin: 'round' }}
                    aria-hidden="true"
                >
                    150 DL
                </text>
            ) : null}
        </g>
    );
}
