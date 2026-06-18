/**
 * Conteúdo do sheet de filtros do radar mobile.
 *
 * Responsabilidade: apresentar critério de seleção e limite de objetos em
 * formato confortável para toque, com a descrição de cada critério sempre
 * visível (tooltips de hover não funcionam bem no touch). Não decide ranking
 * nem altera dados: repassa intenções via callbacks recebidos por props.
 *
 * Os atributos `data-tutorial` dos grupos espelham os do `RadarObjectControls`
 * desktop; a resolução por visibilidade escolhe a versão correta.
 */

import { Check } from 'lucide-react';
import { OBJECT_LIMITS } from '@/types';
import type { ObjectLimit, SelectionMode } from '@/types';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';

type Props = {
    en: boolean;
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    loading: boolean;
};

const MODE_OPTIONS: Array<{
    value: SelectionMode;
    labelPt: string;
    labelEn: string;
    descriptionPt: string;
    descriptionEn: string;
}> = [
    {
        value: 'nearest',
        labelPt: 'Mais próximos agora',
        labelEn: 'Closest now',
        descriptionPt: 'Ranking ao vivo de quem está mais perto da Terra neste momento.',
        descriptionEn: 'Live ranking of what is nearest to Earth right now.',
    },
    {
        value: 'upcoming',
        labelPt: 'Próximas aproximações',
        labelEn: 'Upcoming passes',
        descriptionPt: 'Quem ainda vai passar perto da Terra nos próximos dias, em ordem de chegada.',
        descriptionEn: 'What will pass close to Earth in the coming days, sorted by arrival.',
    },
    {
        value: 'famous',
        labelPt: 'Objetos famosos',
        labelEn: 'Famous objects',
        descriptionPt: 'Corpos conhecidos visitados por missões, vistos na régua do Sistema Solar.',
        descriptionEn: 'Known bodies visited by missions, shown on the Solar System scale.',
    },
];

export function MobileFiltersSheetContent({
    en,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    loading,
}: Props) {
    const tutorial = useRadarTutorialOptional();
    const tutorialActive = tutorial?.active ?? false;
    const canChangeMode = (mode: SelectionMode) => tutorial?.isActionAllowed('set-selection-mode', { mode }) ?? true;
    const canChangeLimit = (limit: ObjectLimit) => tutorial?.isActionAllowed('set-object-limit', { limit }) ?? true;

    return (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
            <fieldset data-tutorial="radar-filter-criterion">
                <legend className="pb-2 text-[10.5px] font-semibold uppercase tracking-widest text-signal-cyan/70">
                    {en ? 'Criterion' : 'Critério'}
                </legend>
                <div className="space-y-1.5">
                    {MODE_OPTIONS.map((option) => {
                        const active = selectionMode === option.value;
                        const tutorialLocked = !canChangeMode(option.value) || (tutorialActive && active);
                        return (
                            <button
                                key={option.value}
                                type="button"
                                disabled={loading || tutorialLocked}
                                onClick={() => {
                                    if (!canChangeMode(option.value)) return;
                                    onModeChange(option.value);
                                    tutorial?.completeStep('set-selection-mode', { mode: option.value });
                                }}
                                aria-pressed={active}
                                className={[
                                    'flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition outline-none',
                                    'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:opacity-50',
                                    loading && !tutorialLocked ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed',
                                    active
                                        ? 'border-signal-cyan/40 bg-signal-cyan/10'
                                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
                                ].join(' ')}
                            >
                                <span
                                    className={[
                                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                                        active ? 'border-signal-cyan bg-signal-cyan/20 text-signal-cyan' : 'border-white/25 text-transparent',
                                    ].join(' ')}
                                    aria-hidden
                                >
                                    <Check className="size-2.5" strokeWidth={3} />
                                </span>
                                <span className="min-w-0">
                                    <span className={`block text-[13px] font-semibold ${active ? 'text-signal-cyan' : 'text-white/85'}`}>
                                        {en ? option.labelEn : option.labelPt}
                                    </span>
                                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-white/50">
                                        {en ? option.descriptionEn : option.descriptionPt}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <fieldset data-tutorial="radar-filter-limit">
                <legend className="pb-2 text-[10.5px] font-semibold uppercase tracking-widest text-signal-cyan/70">
                    {en ? 'Show' : 'Exibir'}
                </legend>
                <div className="flex gap-1.5">
                    {OBJECT_LIMITS.map((limit) => {
                        const tutorialLocked = !canChangeLimit(limit) || (tutorialActive && objectLimit === limit);
                        return (
                            <button
                                key={limit}
                                type="button"
                                disabled={loading || tutorialLocked}
                                onClick={() => {
                                    if (!canChangeLimit(limit)) return;
                                    onLimitChange(limit);
                                    tutorial?.completeStep('set-object-limit', { limit });
                                }}
                                aria-pressed={objectLimit === limit}
                                className={[
                                    'flex-1 rounded-xl border py-2.5 text-center text-[14px] font-semibold transition outline-none',
                                    'focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:opacity-50',
                                    loading && !tutorialLocked ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed',
                                    objectLimit === limit
                                        ? 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan'
                                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]',
                                ].join(' ')}
                            >
                                {limit === 'all' ? (en ? 'All' : 'Todos') : limit}
                            </button>
                        );
                    })}
                </div>
                <p className="pt-1.5 text-[11px] leading-relaxed text-white/40">
                    {en
                        ? 'Fewer objects keep the scene clean. More objects show a busier sky.'
                        : 'Menos objetos deixam a cena limpa. Mais objetos mostram um céu cheio.'}
                </p>
            </fieldset>

            <p className="border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-white/40">
                {en
                    ? 'Changes apply instantly to the scene.'
                    : 'As mudanças se aplicam na cena imediatamente.'}
            </p>
        </div>
    );
}
