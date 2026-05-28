import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function TopAsteroidsChart({ data }: { data: Array<{ name: string; diameterKm: number | null }> }) {
    const chartData = data.map((item) => ({
        name: item.name.replace(/[()]/g, '').slice(0, 18),
        diameterKm: item.diameterKm ?? 0,
    }));

    return (
        <div className="h-72 rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-glow lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-white">Top 5 maiores estimados</h2>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
                    <Bar dataKey="diameterKm" fill="#f8c76b" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
