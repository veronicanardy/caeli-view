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
    { value: 'nearest', labelPt: 'Mais próximos agora', labelEn: 'Closest now' },
    { value: 'upcoming', labelPt: 'Próximas aproximações', labelEn: 'Upcoming passes' },
    { value: 'attention', labelPt: 'Maior atenção', labelEn: 'Watch list' },
];

/**
 * Controles principais do radar no topo da pagina.
 *
 * Critério e quantidade precisam conversar visualmente; por isso este
 * componente usa controles baixos, alinhados e compactos.
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
    const modeDescriptions = {
        nearest: en ? 'Shows the bodies closest to Earth right now.' : 'Mostra os corpos mais próximos da Terra agora.',
        upcoming: en ? 'Prioritizes the next close approaches in time order.' : 'Prioriza as próximas aproximações em ordem temporal.',
        attention: en ? 'Highlights objects that deserve extra attention now.' : 'Destaca objetos que merecem atenção extra agora.',
    } satisfies Record<SelectionMode, string>;

    return (
        <div className="grid gap-2.5 md:inline-flex md:flex-wrap md:items-end md:gap-3">
            <label className="flex min-w-0 flex-col gap-1 md:w-[18rem] lg:w-[19.5rem]">
                <span className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                    {en ? 'Criterion' : 'Critério'}
                </span>
                <div className="relative">
                    <select
                        value={selectionMode}
                        onChange={(event) => onModeChange(event.target.value as SelectionMode)}
                        disabled={loading || criterionLocked}
                        aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                        className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-space-950/70 px-3 pr-9 text-[13px] text-white outline-none transition focus:border-signal-cyan disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                    {en ? 'Show up to' : 'Exibir até'}
                </span>
                <div className="flex h-10 flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-space-950/70 px-1.5 md:flex-nowrap">
                    {LIMITS.map((limit) => (
                        <button
                            key={limit}
                            type="button"
                            disabled={loading}
                            onClick={() => onLimitChange(limit)}
                            aria-pressed={objectLimit === limit}
                            className={[
                                'min-w-[2.6rem] rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition outline-none',
                                'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait',
                                objectLimit === limit
                                    ? 'bg-signal-cyan/20 text-signal-cyan ring-1 ring-signal-cyan/40'
                                    : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                            ].join(' ')}
                        >
                            {limit}
                        </button>
                    ))}
                    <span className="pl-1 text-[11px] uppercase tracking-wide text-white/40 md:ml-1">
                        {en ? 'Objects' : 'Objetos'}
                    </span>
                </div>
            </div>
        </div>
    );
}
