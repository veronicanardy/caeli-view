import { Diameter, Moon, RotateCw, Sparkle } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { SmallBody } from '@/types';
import { EmptyScientificData } from './EmptyScientificData';

export function PhysicalDataVisualCards({ smallBody }: { smallBody: SmallBody }) {
    const items = [
        { label: 'Magnitude absoluta', value: smallBody.absoluteMagnitude, suffix: 'H', icon: Sparkle, max: 30 },
        { label: 'Diâmetro estimado', value: smallBody.diameterKm, suffix: 'km', icon: Diameter, max: 20 },
        { label: 'Albedo', value: smallBody.albedo, suffix: '', icon: Moon, max: 1 },
        { label: 'Período de rotação', value: smallBody.rotationPeriodHours, suffix: 'h', icon: RotateCw, max: 48 },
    ];
    const hasData = items.some((item) => item.value !== null && item.value !== undefined) || smallBody.physicalParameters.length > 0;

    if (!hasData) {
        return <EmptyScientificData title="Ainda sem registros físicos suficientes" message="A NASA/JPL ainda não possui parâmetros físicos suficientes para este viajante." />;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
                const percent = item.value === null || item.value === undefined ? 0 : Math.max(6, Math.min(100, (item.value / item.max) * 100));
                const Icon = item.icon;

                return (
                    <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-white/60">{item.label}</p>
                            <Icon className="size-4 text-signal-cyan" aria-hidden="true" />
                        </div>
                        <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(item.value, 3)} {item.value === null || item.value === undefined ? '' : item.suffix}</p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-signal-cyan to-signal-amber" style={{ width: `${percent}%` }} />
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
