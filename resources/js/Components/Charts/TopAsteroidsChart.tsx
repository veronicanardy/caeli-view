/**
 * Gráfico dos maiores asteroides estimados.
 *
 * Responsabilidade: formatar nomes longos e exibir o diâmetro estimado recebido
 * da página de asteroides. Valores ausentes entram como zero para manter a série
 * renderizável sem alterar o dado original fora do gráfico.
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

export interface TopAsteroidsChartPoint {
    name: string;
    diameterKm: number | null;
}

interface TopAsteroidsChartProps {
    data: TopAsteroidsChartPoint[];
}

export function TopAsteroidsChart({ data }: TopAsteroidsChartProps) {
    const chartData = data.map((item) => ({
        name: item.name.replace(/[()]/g, '').slice(0, 18),
        diameterKm: item.diameterKm ?? 0,
    }));

    return (
        <div className={`${CHART_CARD_CLASS} lg:col-span-2`}>
            <h2 className="mb-4 text-sm font-semibold text-white">Top 5 maiores estimados</h2>
            <ResponsiveContainer width="100%" height={CHART_BODY_HEIGHT}>
                <BarChart data={chartData}>
                    <CartesianGrid stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="diameterKm" fill={CHART_COLORS.estimatedDiameter} radius={CHART_BAR_RADIUS} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
