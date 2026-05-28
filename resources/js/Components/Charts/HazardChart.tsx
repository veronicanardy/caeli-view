import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const colors = ['#ff7b72', '#76e4b5'];

export function HazardChart({ data }: { data: Array<{ name: string; value: number }> }) {
    return (
        <div className="h-72 rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-glow">
            <h2 className="mb-4 text-sm font-semibold text-white">Classificação de risco</h2>
            <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" outerRadius={88} label>
                        {data.map((entry, index) => (
                            <Cell key={entry.name} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
