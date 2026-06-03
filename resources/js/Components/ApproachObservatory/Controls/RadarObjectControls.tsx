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
    const modeDescriptions: Record<SelectionMode, string> = {
        nearest: en
            ? 'Shows asteroids and comets that are closest to Earth right now — like a live distance ranking.'
            : 'Mostra os asteroides e cometas mais perto da Terra neste momento — como um ranking de distância ao vivo.',
        upcoming: en
            ? 'Shows objects that will pass closest to Earth in the coming days, sorted by when they arrive.'
            : 'Mostra os objetos que vão passar mais perto da Terra nos próximos dias, em ordem de chegada.',
    };

    return (
        <div className="grid gap-2.5 md:inline-flex md:flex-wrap md:items-end md:gap-3">
            <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                    {en ? 'Criterion' : 'Critério'}
                </span>
                <div className="flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-space-950/70 px-1.5" role="group" aria-label={en ? 'Selection criterion' : 'Critério de seleção'}>
                    {MODE_OPTIONS.map((option) => (
                        <span key={option.value} className="group relative inline-flex overflow-visible">
                            <button
                                type="button"
                                disabled={loading || criterionLocked}
                                onClick={() => onModeChange(option.value)}
                                aria-pressed={selectionMode === option.value}
                                aria-label={`${en ? option.labelEn : option.labelPt} — ${modeDescriptions[option.value]}`}
                                className={[
                                    'rounded-lg px-3 py-1.5 text-[13px] font-medium transition outline-none whitespace-nowrap',
                                    'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:opacity-50',
                                    selectionMode === option.value
                                        ? 'bg-signal-cyan/20 text-signal-cyan ring-1 ring-signal-cyan/40'
                                        : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                                ].join(' ')}
                            >
                                {en ? option.labelEn : option.labelPt}
                            </button>
                            <span className="pointer-events-none absolute top-full left-1/2 z-[120] mt-2.5 hidden w-56 -translate-x-1/2 rounded-md border border-signal-cyan/35 bg-[#07111f] px-2.5 py-2 text-[12px] leading-relaxed text-white/80 opacity-0 shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(34,211,238,0.14)] transition group-hover:translate-y-[1px] group-hover:opacity-100 group-focus-within:translate-y-[1px] group-focus-within:opacity-100 sm:block">
                                <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-signal-cyan/35 bg-[#07111f]" aria-hidden />
                                {modeDescriptions[option.value]}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

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
