/**
 * Gráfico de volume diário de asteroides.
 *
 * Responsabilidade: exibir a contagem de aproximações por data recebida da
 * página de asteroides. O componente não calcula estatísticas; ele apenas
 * apresenta a série já agregada.
 */

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
    CHART_AXIS_TICK,
    CHART_BAR_RADIUS,
    CHART_BODY_HEIGHT,
    CHART_CARD_CLASS,
    CHART_COLORS,
    CHART_GRID_STROKE,
    CHART_TOOLTIP_STYLE,
} from './chartTheme';

export interface AsteroidsByDayChartPoint {
    date: string;
    total: number;
}

interface AsteroidsByDayChartProps {
    data: AsteroidsByDayChartPoint[];
}

export function AsteroidsByDayChart({ data }: AsteroidsByDayChartProps) {
    return (
        <div className={CHART_CARD_CLASS}>
            <h2 className="mb-4 text-sm font-semibold text-white">Asteroides por dia</h2>
            <ResponsiveContainer width="100%" height={CHART_BODY_HEIGHT}>
                <BarChart data={data}>
                    <CartesianGrid stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="date" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="total" fill={CHART_COLORS.asteroidCount} radius={CHART_BAR_RADIUS} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
