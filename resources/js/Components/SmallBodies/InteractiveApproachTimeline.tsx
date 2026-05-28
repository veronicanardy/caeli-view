import { useState } from 'react';
import { compactKm, formatNumber } from '@/lib/format';
import { SmallBodyCloseApproach } from '@/types';
import { EmptyScientificData } from './EmptyScientificData';

export function InteractiveApproachTimeline({ approaches }: { approaches: SmallBodyCloseApproach[] }) {
    const [active, setActive] = useState(0);
    const visible = approaches.slice(0, 12);

    if (!visible.length) {
        return <EmptyScientificData title="Aproximações conhecidas não retornaram" message="Retorne à listagem para observar passagens calculadas pela CAD API." />;
    }

    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
            <div className="relative flex gap-3 overflow-x-auto pb-4">
                {visible.map((approach, index) => (
                    <button
                        key={`${approach.date}-${index}`}
                        className={`min-w-48 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan ${active === index ? 'border-signal-cyan/50 bg-signal-cyan/10' : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.07]'}`}
                        onClick={() => setActive(index)}
                    >
                        <span className="block text-sm font-medium text-white">{approach.date ?? 'Data sem formato'}</span>
                        <span className="mt-2 block text-xs text-white/55">{approach.body ?? 'Corpo não informado'}</span>
                    </button>
                ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Metric label="Distância" value={compactKm(visible[active]?.distanceKm)} />
                <Metric label="Velocidade relativa" value={`${formatNumber(visible[active]?.relativeVelocityKmS, 2)} km/s`} />
                <Metric label="Incerteza temporal" value={visible[active]?.timeUncertainty ?? 'Sem incerteza formatada'} />
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded border border-white/10 bg-space-950/45 p-4">
            <p className="text-xs text-white/45">{label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{value}</p>
        </div>
    );
}
