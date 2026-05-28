import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReactNode } from 'react';
import { JplApproachCharts } from '@/types';
import { EmptyScientificData } from './EmptyScientificData';

const tooltipStyle = {
    background: 'rgba(9, 11, 16, 0.96)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    color: '#f7fafc',
};

export function ApproachOverviewCharts({ charts }: { charts: JplApproachCharts }) {
    if (!charts.byDay.length) {
        return <EmptyScientificData title="Sem séries para desenhar" message="Ajuste as datas ou a distância máxima para criar gráficos de aproximações." />;
    }

    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <ChartShell title="Aproximações por dia">
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={charts.byDay}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.55)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.55)" fontSize={12} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(84, 214, 214, 0.08)' }} />
                        <Bar dataKey="total" name="Aproximações" fill="#54d6d6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartShell>
            <ChartShell title="Asteroides e cometas">
                <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                        <Pie data={charts.byType} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>
                            {charts.byType.map((entry) => (
                                <Cell key={entry.name} fill={entry.name === 'Cometas' ? '#f8c76b' : '#54d6d6'} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartShell>
            <ChartShell title="Top 5 menores distâncias">
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.closest} layout="vertical" margin={{ left: 22 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(255,255,255,0.55)" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.55)" fontSize={12} width={100} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="distanceAu" name="Distância nominal (au)" fill="#76e4b5" radius={[0, 6, 6, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartShell>
            <ChartShell title="Top 5 maiores velocidades">
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.fastest} layout="vertical" margin={{ left: 22 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(255,255,255,0.55)" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.55)" fontSize={12} width={100} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="velocityKmS" name="Velocidade relativa (km/s)" fill="#f8c76b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartShell>
        </div>
    );
}

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}
