import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function AsteroidsByDayChart({ data }: { data: Array<{ date: string; total: number }> }) {
    return (
        <div className="h-72 rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-glow">
            <h2 className="mb-4 text-sm font-semibold text-white">Asteroides por dia</h2>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
                    <Bar dataKey="total" fill="#54d6d6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
