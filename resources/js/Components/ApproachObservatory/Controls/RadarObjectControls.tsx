import { ChevronDown } from 'lucide-react';
import type { ObjectLimit, SelectionMode } from '@/types';

type Props = {
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    locale: 'pt-BR' | 'en';
    loading?: boolean;
    criterionLocked?: boolean;
};

const LIMITS: ObjectLimit[] = [5, 15, 30];

const MODE_OPTIONS: Array<{ value: SelectionMode; labelPt: string; labelEn: string }> = [
    { value: 'nearest', labelPt: 'Mais proximos agora', labelEn: 'Closest now' },
    { value: 'upcoming', labelPt: 'Proximas aproximacoes', labelEn: 'Upcoming passes' },
    { value: 'attention', labelPt: 'Maior atencao', labelEn: 'Watch list' },
];

/**
 * Controles principais do radar no topo da pagina.
 *
 * Criterio, quantidade e data precisam conversar visualmente; por isso este
 * componente usa campos baixos, alinhados e com o mesmo ritmo tipografico do
 * seletor de data.
 */
export function RadarObjectControls({
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    locale,
    loading = false,
    criterionLocked = false,
}: Props) {
    const en = locale === 'en';

    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="flex min-w-[16rem] flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                    {en ? 'Criterion' : 'Criterio'}
                </span>
                <div className="relative">
                    <select
                        value={selectionMode}
                        onChange={(event) => onModeChange(event.target.value as SelectionMode)}
                        disabled={loading || criterionLocked}
                        aria-label={en ? 'Selection criterion' : 'Criterio de selecao'}
                        className="w-full appearance-none rounded border border-white/10 bg-space-950/70 px-2.5 py-1.5 pr-9 text-sm text-white outline-none transition focus:border-signal-cyan disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {en ? option.labelEn : option.labelPt}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                </div>
            </label>

            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                    {en ? 'Show up to' : 'Exibir ate'}
                </span>
                <div className="flex h-[38px] items-center gap-1 rounded border border-white/10 bg-space-950/70 px-1.5">
                    {LIMITS.map((limit) => (
                        <button
                            key={limit}
                            type="button"
                            disabled={loading}
                            onClick={() => onLimitChange(limit)}
                            aria-pressed={objectLimit === limit}
                            className={[
                                'rounded-md px-3 py-1 text-sm font-medium transition outline-none',
                                'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait',
                                objectLimit === limit
                                    ? 'bg-signal-cyan/20 text-signal-cyan ring-1 ring-signal-cyan/40'
                                    : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                            ].join(' ')}
                        >
                            {limit}
                        </button>
                    ))}
                    <span className="pl-1 text-[11px] uppercase tracking-wide text-white/40">
                        {en ? 'Objects' : 'Objetos'}
                    </span>
                </div>
            </div>
        </div>
    );
}
