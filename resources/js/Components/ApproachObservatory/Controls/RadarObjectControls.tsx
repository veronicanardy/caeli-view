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
 * Controles discretos do radar: chips de quantidade (5/15/30) e select de critério de seleção.
 * Posicionado no painel de cabeçalho acima da cena 3D.
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

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

            {/* Chips de quantidade */}
            <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/45 uppercase tracking-wide select-none">
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
            </div>

            {/* Select de critério */}
            <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/45 uppercase tracking-wide select-none">
                    {en ? 'Criterion' : 'Critério'}
                </span>
                <div className="relative">
                    <select
                        value={selectionMode}
                        disabled={loading}
                        onChange={(e) => onModeChange(e.target.value as SelectionMode)}
                        title={en ? currentMode.tooltipEn : currentMode.tooltipPt}
                        aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                        className={[
                            'appearance-none rounded-full border border-white/15 bg-white/[0.06]',
                            'pl-3 pr-7 py-0.5 text-[12px] text-white/80 transition',
                            'outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            'hover:border-white/25 hover:text-white cursor-pointer disabled:cursor-wait',
                        ].join(' ')}
                    >
                        {MODE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {en ? opt.labelEn : opt.labelPt}
                            </option>
                        ))}
                    </select>
                    {/* Seta custom — o select nativo não deixa estilizar o ícone */}
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white/40" aria-hidden>
                        ▾
                    </span>
                </div>
            </div>

            {/* Indicador de carregamento discreto */}
            {loading ? (
                <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan/70" aria-hidden />
            ) : null}

            {/* Aviso sutil quando 15 ou 30 objetos ativos */}
            {objectLimit > 5 ? (
                <span className="text-[11px] text-white/35 select-none">
                    {en
                        ? 'More objects — scene gets denser. Take your time.'
                        : 'Mais objetos — a cena fica mais densa. Explore com calma.'}
                </span>
            ) : null}

        </div>
    );
}
