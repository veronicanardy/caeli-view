import { useEffect, useRef, useState } from 'react';
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

type ModeOption = {
    value: SelectionMode;
    labelPt: string;
    labelEn: string;
    tooltipPt: string;
    tooltipEn: string;
    detailPt: string;
    detailEn: string;
    icon: string;
};

const MODE_OPTIONS: ModeOption[] = [
    {
        value: 'nearest',
        labelPt: 'Mais próximos agora',
        labelEn: 'Closest now',
        tooltipPt: 'Os asteroides que estão mais perto da Terra agora',
        tooltipEn: 'The asteroids currently nearest to Earth',
        detailPt: 'Pense neles como os vizinhos de hoje. Neste momento, são os que estão no nosso "quintal" do sistema solar.',
        detailEn: "Think of them as today's neighbors. Right now, they happen to be in our corner of the solar system.",
        icon: '◎',
    },
    {
        value: 'upcoming',
        labelPt: 'Próximas aproximações',
        labelEn: 'Upcoming passes',
        tooltipPt: 'Asteroides que passam pelo ponto mais perto da Terra',
        tooltipEn: 'Asteroids making their closest pass to Earth up to 3 days',
        detailPt: 'Cada asteroide faz sua passagem mais próxima da Terra em um dia específico. Esses são os que têm essa passagem agendada para breve.',
        detailEn: 'Every asteroid has one closest-pass day. These are the ones with that moment coming soon.',
        icon: '⟶',
    },
    {
        value: 'attention',
        labelPt: 'Maior atenção',
        labelEn: 'Watch list',
        tooltipPt: 'Asteroides que os cientistas acompanham com mais cuidado',
        tooltipEn: 'Asteroids scientists monitor more carefully',
        detailPt: 'São grandes o suficiente ou passam perto o suficiente para valer um monitoramento contínuo.',
        detailEn: 'Large enough or close enough to warrant ongoing monitoring.',
        icon: '◈',
    },
];

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
    const currentMode = MODE_OPTIONS.find((o) => o.value === selectionMode) ?? MODE_OPTIONS[0];
    const [open, setOpen] = useState(false);
    const [hoveredTooltip, setHoveredTooltip] = useState<SelectionMode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    useEffect(() => {
        if (criterionLocked && open) setOpen(false);
    }, [criterionLocked, open]);

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
                <span className="select-none text-[11px] uppercase tracking-wide text-white/45">
                    {en ? 'Show up to' : 'Exibir até'}
                </span>
                <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
                    {LIMITS.map((limit) => (
                        <button
                            key={limit}
                            type="button"
                            disabled={loading}
                            onClick={() => onLimitChange(limit)}
                            aria-pressed={objectLimit === limit}
                            className={[
                                'rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-all outline-none',
                                'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait',
                                objectLimit === limit
                                    ? 'bg-signal-cyan/20 text-signal-cyan ring-1 ring-signal-cyan/40'
                                    : 'text-white/55 hover:text-white/80',
                            ].join(' ')}
                        >
                            {limit}
                        </button>
                    ))}
                </div>
                <span className="select-none text-[11px] uppercase tracking-wide text-white/45">
                    {en ? 'Objects' : 'Objetos'}
                </span>
            </div>

            <div className="flex items-center gap-1.5">
                <span className="select-none text-[11px] uppercase tracking-wide text-white/45">
                    {en ? 'Criterion' : 'Critério'}
                </span>
                <div ref={containerRef} className="relative">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                            if (criterionLocked) return;
                            setOpen((v) => !v);
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={open && !criterionLocked}
                        aria-disabled={criterionLocked}
                        aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                        title={criterionLocked
                            ? (en ? 'Change the criterion in radar mode' : 'Mude o critério no modo radar')
                            : undefined}
                        className={[
                            'flex items-center gap-2 rounded-full border pl-3 pr-2.5 py-0.5 text-[12px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            criterionLocked
                                ? 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30'
                                : 'border-white/15 bg-white/[0.06] text-white/80 hover:border-white/25 hover:text-white cursor-pointer disabled:cursor-wait',
                        ].join(' ')}
                    >
                        <span>{en ? currentMode.labelEn : currentMode.labelPt}</span>
                        <span className="text-white/40" aria-hidden>
                            ▾
                        </span>
                    </button>

                    {open && !criterionLocked ? (
                        <ul
                            role="listbox"
                            aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                            className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-lg border border-white/12 bg-space-950 shadow-glow"
                        >
                            {MODE_OPTIONS.map((opt) => {
                                const selected = opt.value === selectionMode;
                                const tooltipVisible = hoveredTooltip === opt.value;
                                return (
                                    <li
                                        key={opt.value}
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => {
                                            onModeChange(opt.value);
                                            setOpen(false);
                                        }}
                                        onMouseEnter={() => setHoveredTooltip(opt.value)}
                                        onMouseLeave={() => setHoveredTooltip(null)}
                                        className={[
                                            'group relative cursor-pointer px-3.5 py-2.5 text-[12px] transition-colors',
                                            selected
                                                ? 'bg-signal-cyan/15 text-signal-cyan'
                                                : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={[
                                                        'text-[10px] tabular-nums',
                                                        selected ? 'text-signal-cyan/70' : 'text-white/30 group-hover:text-white/50',
                                                    ].join(' ')}
                                                >
                                                    {opt.icon}
                                                </span>
                                                <span className="whitespace-nowrap">{en ? opt.labelEn : opt.labelPt}</span>
                                            </div>
                                            <span
                                                className={[
                                                    'shrink-0 rounded-full text-[9px] leading-none px-1 py-0.5 border transition-colors',
                                                    selected
                                                        ? 'border-signal-cyan/30 text-signal-cyan/60'
                                                        : 'border-white/10 text-white/25 group-hover:border-white/20 group-hover:text-white/40',
                                                ].join(' ')}
                                            >
                                                ?
                                            </span>
                                        </div>

                                        {tooltipVisible ? (
                                            <div className="pointer-events-none absolute left-full top-0 z-[100] ml-2 w-60 rounded-xl border border-white/15 bg-[#07111f]/95 p-3.5 shadow-glow backdrop-blur-md">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <span className="text-base text-signal-cyan/80">{opt.icon}</span>
                                                    <span className="text-[13px] font-semibold text-white">
                                                        {en ? opt.labelEn : opt.labelPt}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] leading-relaxed text-white/80">
                                                    {en ? opt.tooltipEn : opt.tooltipPt}
                                                </p>
                                                <div className="mt-2.5 border-t border-white/10 pt-2.5">
                                                    <p className="text-[12px] leading-relaxed text-white/65">
                                                        {en ? opt.detailEn : opt.detailPt}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
            </div>

            {loading ? <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan/70" aria-hidden /> : null}

            {objectLimit > 5 ? (
                <span className="select-none text-[11px] text-white/35">
                    {en
                        ? 'More objects - the scene gets denser. Take your time.'
                        : 'Mais objetos - a cena fica mais densa. Explore com calma.'}
                </span>
            ) : null}
        </div>
    );
}
