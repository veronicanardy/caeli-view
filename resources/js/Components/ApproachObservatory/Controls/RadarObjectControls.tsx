import { useEffect, useRef, useState } from 'react';
import type { ObjectLimit, SelectionMode } from '@/types';

type Props = {
    objectLimit:      ObjectLimit;
    selectionMode:    SelectionMode;
    onLimitChange:    (limit: ObjectLimit) => void;
    onModeChange:     (mode: SelectionMode) => void;
    locale:           'pt-BR' | 'en';
    loading?:         boolean;
};

const LIMITS: ObjectLimit[] = [5, 15, 30];

type ModeOption = { value: SelectionMode; labelPt: string; labelEn: string; tooltipPt: string; tooltipEn: string };

const MODE_OPTIONS: ModeOption[] = [
    {
        value:     'nearest',
        labelPt:   'Mais próximos agora',
        labelEn:   'Closest now',
        tooltipPt: 'Objetos com menor distância atual da Terra, derivada de vetores reais do JPL Horizons.',
        tooltipEn: 'Objects with the smallest current distance from Earth, derived from real JPL Horizons vectors.',
    },
    {
        value:     'upcoming',
        labelPt:   'Próximas aproximações',
        labelEn:   'Upcoming passes',
        tooltipPt: 'Objetos cuja data de máxima aproximação é a mais próxima do momento atual. Não indica risco.',
        tooltipEn: 'Objects whose closest approach date is nearest to now. Does not indicate risk.',
    },
    {
        value:     'featured',
        labelPt:   'Em destaque',
        labelEn:   'Featured',
        tooltipPt: 'Seleção de objetos conhecidos, historicamente relevantes ou cientificamente interessantes.',
        tooltipEn: 'A curated selection of well-known, historically relevant, or scientifically interesting objects.',
    },
    {
        value:     'attention',
        labelPt:   'Maior atenção',
        labelEn:   'Watch list',
        tooltipPt: 'Objetos que merecem acompanhamento por tamanho, órbita ou classificação PHA. Não implica risco imediato.',
        tooltipEn: 'Objects worth tracking for size, orbit, or PHA classification. Does not imply immediate risk.',
    },
];

/**
 * Controles discretos do radar: chips de quantidade (5/15/30) e dropdown customizado de critério.
 * O dropdown é implementado com divs para permitir estilização completa — o <select> nativo
 * não aceita CSS nas <option> abertas (fundo branco ilegível no tema escuro).
 */
export function RadarObjectControls({
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    locale,
    loading = false,
}: Props) {
    const en = locale === 'en';
    const currentMode = MODE_OPTIONS.find((o) => o.value === selectionMode) ?? MODE_OPTIONS[0];
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora
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

    // Fecha com Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

            {/* Chips de quantidade */}
            <div className="flex items-center gap-1.5">
                <span className="select-none text-[11px] uppercase tracking-wide text-white/45">
                    {en ? 'Show' : 'Exibir'}
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

            {/* Dropdown customizado de critério */}
            <div className="flex items-center gap-1.5">
                <span className="select-none text-[11px] uppercase tracking-wide text-white/45">
                    {en ? 'Criterion' : 'Critério'}
                </span>
                <div ref={containerRef} className="relative">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => setOpen((v) => !v)}
                        title={en ? currentMode.tooltipEn : currentMode.tooltipPt}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                        className={[
                            'flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06]',
                            'pl-3 pr-2.5 py-0.5 text-[12px] text-white/80 transition outline-none',
                            'focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            'hover:border-white/25 hover:text-white cursor-pointer disabled:cursor-wait',
                        ].join(' ')}
                    >
                        <span>{en ? currentMode.labelEn : currentMode.labelPt}</span>
                        <span className="text-white/40" aria-hidden>▾</span>
                    </button>

                    {open ? (
                        <ul
                            role="listbox"
                            aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                            className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/12 bg-space-950 shadow-glow"
                        >
                            {MODE_OPTIONS.map((opt) => {
                                const selected = opt.value === selectionMode;
                                return (
                                    <li
                                        key={opt.value}
                                        role="option"
                                        aria-selected={selected}
                                        title={en ? opt.tooltipEn : opt.tooltipPt}
                                        onClick={() => { onModeChange(opt.value); setOpen(false); }}
                                        className={[
                                            'cursor-pointer whitespace-nowrap px-3.5 py-2 text-[12px] transition-colors',
                                            selected
                                                ? 'bg-signal-cyan/15 text-signal-cyan'
                                                : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
                                        ].join(' ')}
                                    >
                                        {en ? opt.labelEn : opt.labelPt}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
            </div>

            {/* Indicador de carregamento discreto */}
            {loading ? (
                <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan/70" aria-hidden />
            ) : null}

            {/* Aviso sutil quando 15 ou 30 objetos ativos */}
            {objectLimit > 5 ? (
                <span className="select-none text-[11px] text-white/35">
                    {en
                        ? 'More objects — scene gets denser. Take your time.'
                        : 'Mais objetos — a cena fica mais densa. Explore com calma.'}
                </span>
            ) : null}

        </div>
    );
}
