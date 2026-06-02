/**
 * Gráfico de classificação de risco dos asteroides.
 *
 * Responsabilidade: apresentar a distribuição entre objetos potencialmente
 * perigosos e não perigosos. A classificação vem pronta da página; este
 * componente só aplica a visualização em pizza.
 */

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
    CHART_BODY_HEIGHT,
    CHART_CARD_CLASS,
    CHART_COLORS,
    CHART_TOOLTIP_STYLE,
} from './chartTheme';

const HAZARD_COLORS = [CHART_COLORS.hazardous, CHART_COLORS.safe];

export interface HazardChartSlice {
    name: string;
    value: number;
}

interface HazardChartProps {
    data: HazardChartSlice[];
}

export function HazardChart({ data }: HazardChartProps) {
    return (
        <div className={CHART_CARD_CLASS}>
            <h2 className="mb-4 text-sm font-semibold text-white">Classificação de risco</h2>
            <ResponsiveContainer width="100%" height={CHART_BODY_HEIGHT}>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" outerRadius={88} label>
                        {data.map((entry, index) => (
                            <Cell key={entry.name} fill={HAZARD_COLORS[index % HAZARD_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
