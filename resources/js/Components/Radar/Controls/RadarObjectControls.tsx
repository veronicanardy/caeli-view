/**
 * Controles de limite e modo de seleção do radar.
 *
 * Responsabilidade: renderizar os botões de quantidade de objetos e modo
 * (closest/upcoming), repassando intenções via callbacks. Não decide ranking
 * nem altera dados — apenas apresenta as opções disponíveis.
 */

import type { CSSProperties } from 'react';
import { OBJECT_LIMITS } from '@/types';
import type { ObjectLimit, SelectionMode } from '@/types';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';
import { Tooltip } from './Tooltip';

type Props = {
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    locale: 'pt-BR' | 'en';
    loading?: boolean;
    criterionLocked?: boolean;
};

const LIMITS = OBJECT_LIMITS;

const MODE_OPTIONS: Array<{ value: SelectionMode; labelPt: string; labelEn: string }> = [
    { value: 'nearest',  labelPt: 'Mais próximos agora',   labelEn: 'Closest now' },
    { value: 'upcoming', labelPt: 'Próximas aproximações', labelEn: 'Upcoming passes' },
    { value: 'famous',   labelPt: 'Asteroides famosos',    labelEn: 'Famous asteroids' },
];

/**
 * Controles principais do radar no topo da pagina.
 *
 * Critério e quantidade precisam conversar visualmente; por isso este
 * componente usa controles baixos, alinhados e compactos. A altura dos grupos
 * e o tamanho do texto escalam proporcionalmente à altura da viewport via
 * clamp() com 100dvh como unidade fluida.
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
    const tutorial = useRadarTutorialOptional();
    const tutorialActive = tutorial?.active ?? false;
    // "Famosos" é um conjunto fixo de corpos: a quantidade de objetos não se aplica.
    const limitDisabled = selectionMode === 'famous';
    const modeDescriptions: Record<SelectionMode, string> = {
        nearest: en
            ? 'Shows asteroids and comets that are closest to Earth right now — like a live distance ranking.'
            : 'Mostra os asteroides e cometas mais perto da Terra neste momento — como um ranking de distância ao vivo.',
        upcoming: en
            ? 'Shows objects that will pass closest to Earth in the coming days, sorted by when they arrive.'
            : 'Mostra os objetos que vão passar mais perto da Terra nos próximos dias, em ordem de chegada.',
        famous: en
            ? 'Shows famous asteroids visited by space missions (Ceres, Vesta, Eros, Bennu, Itokawa) where they are now in the Solar System.'
            : 'Mostra asteroides famosos visitados por missões espaciais (Ceres, Vesta, Eros, Bennu, Itokawa) onde estão agora no Sistema Solar.',
    };

    // Interpolação contínua baseada em 100dvh:
    // altura do grupo:  clamp(1.5rem, 3.2dvh, 2.25rem)  → 24px..36px
    // padding botão:    clamp(0px,    0.5dvh, 4px)
    // px botão modo:    clamp(0.4rem, 1.2dvh, 0.75rem)
    // px botão limite:  clamp(0.3rem, 1dvh,   0.625rem)
    // tamanho do texto: clamp(10px,   1.2dvh, 13px)
    // texto label:      clamp(9px,    1dvh,   11px)
    const fluidVars = {
        '--ctrl-h':         'clamp(1.5rem, 3.2dvh, 2.25rem)',
        '--ctrl-fs':        'clamp(10px, 1.2dvh, 13px)',
        '--ctrl-fs-label':  'clamp(9px, 1dvh, 11px)',
        '--ctrl-py':        'clamp(0px, 0.5dvh, 4px)',
        '--ctrl-px-mode':   'clamp(0.4rem, 1.2dvh, 0.75rem)',
        '--ctrl-px-limit':  'clamp(0.3rem, 1dvh, 0.625rem)',
        '--ctrl-gap':       'clamp(0.125rem, 0.4dvh, 0.25rem)',
        '--ctrl-px-group':  'clamp(0.25rem, 0.6dvh, 0.5rem)',
    } as CSSProperties;

    return (
        <div className="grid gap-2 md:inline-flex md:flex-wrap md:items-center md:gap-2.5" style={fluidVars}>
            <div
                className="flex min-w-0 items-center rounded-xl border border-white/10 bg-space-950/70"
                style={{ height: 'var(--ctrl-h)', gap: 'var(--ctrl-gap)', paddingInline: 'var(--ctrl-px-group)' }}
                role="group"
                aria-label={en ? 'Selection criterion' : 'Critério de seleção'}
                data-tutorial="radar-filter-criterion"
            >
                <span
                    className="font-medium uppercase tracking-wide text-signal-cyan/70 whitespace-nowrap"
                    style={{ fontSize: 'var(--ctrl-fs-label)', marginRight: 'var(--ctrl-gap)' }}
                >
                    {en ? 'Criterion' : 'Critério'}
                </span>
                {MODE_OPTIONS.map((option) => {
                    const btn = (
                        <button
                            type="button"
                            disabled={loading || criterionLocked}
                            onClick={() => onModeChange(option.value)}
                            aria-pressed={selectionMode === option.value}
                            aria-label={`${en ? option.labelEn : option.labelPt} — ${modeDescriptions[option.value]}`}
                            className={[
                                'rounded-lg font-medium transition outline-none whitespace-nowrap',
                                'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:opacity-50',
                                selectionMode === option.value
                                    ? 'bg-signal-cyan/20 text-signal-cyan ring-1 ring-signal-cyan/40'
                                    : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                            ].join(' ')}
                            style={{
                                fontSize:      'var(--ctrl-fs)',
                                paddingBlock:  'var(--ctrl-py)',
                                paddingInline: 'var(--ctrl-px-mode)',
                            }}
                        >
                            {en ? option.labelEn : option.labelPt}
                        </button>
                    );
                    if (tutorialActive) return <span key={option.value}>{btn}</span>;
                    return (
                        <Tooltip
                            key={option.value}
                            content={<span className="block w-52 leading-relaxed">{modeDescriptions[option.value]}</span>}
                            wrap
                            hideDelay={150}
                        >
                            {btn}
                        </Tooltip>
                    );
                })}
            </div>

            <div
                className={[
                    'flex min-w-0 flex-wrap items-center rounded-xl border border-white/10 bg-space-950/70 md:flex-nowrap',
                    // Quantidade não se aplica a "famosos": é um conjunto fixo de corpos conhecidos.
                    limitDisabled ? 'opacity-40' : '',
                ].join(' ')}
                style={{ height: 'var(--ctrl-h)', gap: 'var(--ctrl-gap)', paddingInline: 'var(--ctrl-px-group)' }}
                data-tutorial="radar-filter-limit"
            >
                <span
                    className="font-medium uppercase tracking-wide text-signal-cyan/70 whitespace-nowrap"
                    style={{ fontSize: 'var(--ctrl-fs-label)', marginRight: 'var(--ctrl-gap)' }}
                >
                    {en ? 'Show up to' : 'Exibir até'}
                </span>
                {LIMITS.map((limit) => (
                    <button
                        key={limit}
                        type="button"
                        disabled={loading || limitDisabled}
                        onClick={() => onLimitChange(limit)}
                        aria-pressed={objectLimit === limit}
                        className={[
                            'rounded-lg font-medium transition outline-none',
                            'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait',
                            objectLimit === limit
                                ? 'bg-signal-cyan/20 text-signal-cyan ring-1 ring-signal-cyan/40'
                                : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                        ].join(' ')}
                        style={{
                            fontSize:      'var(--ctrl-fs)',
                            paddingBlock:  'var(--ctrl-py)',
                            paddingInline: 'var(--ctrl-px-limit)',
                            minWidth:      'clamp(1.8rem, 3dvh, 2.6rem)',
                        }}
                    >
                        {limit}
                    </button>
                ))}
                <span
                    className="uppercase tracking-wide text-white/40"
                    style={{ fontSize: 'var(--ctrl-fs-label)', paddingLeft: 'var(--ctrl-gap)' }}
                >
                    {en ? 'Objects' : 'Objetos'}
                </span>
            </div>
        </div>
    );
}
