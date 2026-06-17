/**
 * Barra de ações inferior do radar mobile.
 *
 * Responsabilidade: concentrar as três portas de entrada da interface mobile
 * (lista de objetos, filtros e guia) em uma única barra fixa na base da cena,
 * sempre visível enquanto nenhum sheet ou card cobre o rodapé. Não decide
 * estado: apenas repassa intenções via callbacks.
 *
 * Os atributos `data-tutorial` espelham os alvos que o tutorial usa no
 * desktop (`object-list-toggle`, `radar-filters`, `radar-guide`); a resolução
 * por visibilidade em `radarTutorialDom.ts` escolhe a versão correta.
 */

import type { ReactNode } from 'react';
import { BookOpen, List, SlidersHorizontal } from 'lucide-react';

type Props = {
    en: boolean;
    /** Oculta a barra enquanto um sheet ou card ocupa o rodapé da cena. */
    hidden: boolean;
    onOpenObjects: () => void;
    onOpenFilters: () => void;
    onOpenGuide: () => void;
};

export function MobileActionBar({ en, hidden, onOpenObjects, onOpenFilters, onOpenGuide }: Props) {
    if (hidden) return null;

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] lg:hidden">
            <div className="pointer-events-auto flex items-stretch divide-x divide-white/[0.08] overflow-hidden rounded-2xl border border-white/12 bg-space-950/92 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl cursor-auto">
                <ActionButton
                    icon={<List className="size-5" aria-hidden />}
                    label={en ? 'Objects' : 'Objetos'}
                    onClick={onOpenObjects}
                    dataTutorial="object-list-toggle"
                />
                <ActionButton
                    icon={<SlidersHorizontal className="size-5" aria-hidden />}
                    label={en ? 'Filters' : 'Filtros'}
                    onClick={onOpenFilters}
                    dataTutorial="radar-filters"
                />
                <ActionButton
                    icon={<BookOpen className="size-5" aria-hidden />}
                    label={en ? 'Guide' : 'Guia'}
                    onClick={onOpenGuide}
                    dataTutorial="radar-guide"
                />
            </div>
        </div>
    );
}

function ActionButton({ icon, label, onClick, dataTutorial }: {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    dataTutorial?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-tutorial={dataTutorial}
            /* min-w + py garantem área de toque confortável (~88x48px) sem inflar a barra */
            className="flex min-w-[5.5rem] flex-col items-center gap-0.5 px-4 py-2 text-white/65 transition outline-none hover:bg-white/[0.05] hover:text-white/90 focus-visible:ring-2 focus-visible:ring-signal-cyan"
        >
            <span className="text-signal-cyan/70">{icon}</span>
            <span className="text-[10.5px] font-medium tracking-wide">{label}</span>
        </button>
    );
}
