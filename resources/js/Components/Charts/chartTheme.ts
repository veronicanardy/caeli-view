/**
 * Tema compartilhado dos gráficos Recharts do painel de asteroides.
 *
 * Responsabilidade: concentrar estilos visuais repetidos entre cards, eixos,
 * tooltips e barras. Este arquivo não transforma dados nem define regra de
 * negócio; ele apenas mantém os gráficos pequenos e visualmente consistentes.
 */

import type { CSSProperties } from 'react';

export const CHART_CARD_CLASS = 'h-72 rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-glow';

export const CHART_BODY_HEIGHT = '85%';

export const CHART_GRID_STROKE = 'rgba(255,255,255,0.08)';

export const CHART_AXIS_TICK = {
    fill: 'rgba(255,255,255,0.6)',
    fontSize: 12,
};

export const CHART_TOOLTIP_STYLE: CSSProperties = {
    background: '#11131a',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
};

export const CHART_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

export const CHART_COLORS = {
    asteroidCount: '#54d6d6',
    estimatedDiameter: '#f8c76b',
    hazardous: '#ff7b72',
    safe: '#76e4b5',
};
