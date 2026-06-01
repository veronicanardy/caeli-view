/**
 * Camadas SVG para Sol, Terra e Lua no radar 2D.
 *
 * Os corpos aqui apenas interpretam posicoes e opacidades ja prontas. Nao
 * devem recalcular efemerides, mudar fallback simbolico nem arbitrar foco.
 */
import type { ReactNode } from 'react';
import { visualMoonRadius } from './radarSvgPresentation';
import type { RadarSvgLayoutProps } from './radarSvgTypes';

export function RadarSvgEarthLayer({ layout }: RadarSvgLayoutProps) {
    const { x, y, radiusPx } = layout.earth;
    return (
        <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <defs>
                <radialGradient id="earth-outer-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(96,168,236,0.28)" />
                    <stop offset="55%" stopColor="rgba(96,168,236,0.10)" />
                    <stop offset="100%" stopColor="rgba(96,168,236,0)" />
                </radialGradient>
            </defs>
            <circle cx={x} cy={y} r={radiusPx * 2.4} fill="url(#earth-outer-glow)" />
            <circle cx={x} cy={y} r={radiusPx * 1.08} fill="none" stroke="rgba(124,211,255,0.18)" strokeWidth={0.6} />
        </g>
    );
}

export function RadarSvgMoonLayer({ layout }: RadarSvgLayoutProps) {
    const { x, y } = layout.moon;
    const radiusPx = visualMoonRadius(layout);
    return (
        <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <circle cx={x} cy={y} r={radiusPx * 1.8} fill="rgba(225,229,236,0.12)" />
            <circle cx={x} cy={y} r={radiusPx * 1.05} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
        </g>
    );
}

export function RadarSvgSunLayer({ layout }: RadarSvgLayoutProps) {
    if (!layout.sun.visible) return null;
    const { x, y, radiusPx, opacity } = layout.sun;
    return (
        <g aria-hidden="true" style={{ opacity }}>
            <circle cx={x} cy={y} r={radiusPx * 1.8} fill="rgba(255,196,108,0.10)" />
            <circle cx={x} cy={y} r={radiusPx} fill="rgba(255,196,108,0.22)" stroke="rgba(255,196,108,0.6)" strokeWidth="0.9" />
            <circle cx={x} cy={y} r={radiusPx * 0.5} fill="rgba(255,206,128,0.9)" />
        </g>
    );
}

type RadarSvgGlobeLayerProps = RadarSvgLayoutProps & {
    zoom: number;
    canvasSize: { width: number; height: number };
    children: (scaledX: number, scaledY: number, scaledRadius: number) => ReactNode;
};

export function RadarSvgGlobeLayer({
    layout,
    zoom,
    canvasSize,
    children,
}: RadarSvgGlobeLayerProps) {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const scaledX = centerX + (layout.earth.x - centerX) * zoom;
    const scaledY = centerY + (layout.earth.y - centerY) * zoom;
    const scaledRadius = layout.earth.radiusPx * zoom * 1.12;
    if (canvasSize.width < 2 || canvasSize.height < 2 || scaledRadius * 2 < 8) return null;
    return <>{children(scaledX, scaledY, scaledRadius)}</>;
}
