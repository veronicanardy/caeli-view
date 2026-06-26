/**
 * Badge de tipo de objeto do radar (asteroide, cometa, outro).
 *
 * Responsabilidade: mapear o tipo canônico de SmallBodyObjectType para um
 * rótulo e ícone visual padronizados. Componente atômico sem estado próprio.
 */

import { Orbit, Rocket, Sparkles } from 'lucide-react';
import type { SmallBodyObjectType } from '@/types';

const labels: Record<SmallBodyObjectType, string> = {
    asteroid: 'Asteroide',
    comet: 'Cometa',
    spacecraft: 'Nave',
    other: 'Pequeno corpo',
};

export function ObjectTypeBadge({ type }: { type: SmallBodyObjectType }) {
    const comet = type === 'comet';
    const spacecraft = type === 'spacecraft';
    const Icon = spacecraft ? Rocket : comet ? Sparkles : Orbit;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            spacecraft
                ? 'border-[#9fc0e8]/45 bg-[#9fc0e8]/15 text-[#9fc0e8]'
                : comet
                    ? 'border-signal-amber/45 bg-signal-amber/15 text-signal-amber'
                    : 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan'
        }`}>
            <Icon className="size-3.5" aria-hidden="true" />
            {labels[type] ?? labels.other}
        </span>
    );
}
