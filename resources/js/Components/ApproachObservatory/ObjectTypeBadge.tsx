import { Orbit, Sparkles } from 'lucide-react';
import { SmallBodyObjectType } from '@/types';

const labels: Record<SmallBodyObjectType, string> = {
    asteroid: 'Asteroide',
    comet: 'Cometa',
    other: 'Pequeno corpo',
};

export function ObjectTypeBadge({ type }: { type: SmallBodyObjectType }) {
    const comet = type === 'comet';
    const Icon = comet ? Sparkles : Orbit;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${comet ? 'border-signal-amber/45 bg-signal-amber/15 text-signal-amber' : 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan'}`}>
            <Icon className="size-3.5" aria-hidden="true" />
            {labels[type] ?? labels.other}
        </span>
    );
}
