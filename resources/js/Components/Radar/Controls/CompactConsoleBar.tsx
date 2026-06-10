/**
 * Barra de controles compacta do radar.
 *
 * Responsabilidade: agrupar os controles de limite e modo de seleção em um
 * formato colapsável em telas estreitas. Não decide ranking nem acessa dados —
 * apenas repassa callbacks para RadarObjectControls.
 */

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { RadarObjectControls } from './RadarObjectControls';
import type { ObjectLimit, SelectionMode } from '@/types';

type Props = {
    locale: 'pt-BR' | 'en';
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    radarLoading?: boolean;
};

/**
 * Barra superior dos filtros do radar.
 *
 * Em desktop os controles ficam sempre visíveis. Em mobile (< md) colapsa num
 * resumo clicável. A altura dos controles se adapta proporcionalmente via CSS
 * clamp() no RadarObjectControls.
 */
export function CompactConsoleBar({
    locale,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading = false,
}: Props) {
    const [mobileOpen, setMobileOpen] = useState(false);

    const currentModeLabel = (() => {
        if (locale === 'en') {
            if (selectionMode === 'upcoming') return 'Upcoming passes';
            return 'Closest now';
        }
        if (selectionMode === 'upcoming') return 'Próximas passagens';
        return 'Mais próximos agora';
    })();

    const filtersContent = (
        <RadarObjectControls
            objectLimit={objectLimit}
            selectionMode={selectionMode}
            onLimitChange={onLimitChange}
            onModeChange={onModeChange}
            locale={locale}
            loading={radarLoading}
        />
    );

    return (
        <section
            aria-label={locale === 'en' ? 'Radar filters' : 'Filtros do radar'}
            className="relative z-50 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur md:inline-block md:max-w-full md:border-0 md:bg-transparent md:backdrop-blur-none md:p-0"
        >
            <div className="hidden md:block">{filtersContent}</div>

            <div className="md:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-expanded={mobileOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
                >
                    {mobileOpen ? (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                            {locale === 'en' ? 'Filters' : 'Filtros'}
                        </span>
                    ) : (
                        <span className="truncate text-[12px] text-white/65">
                            {currentModeLabel}
                            <span className="text-white/35"> · {objectLimit} {locale === 'en' ? 'objects' : 'objetos'}</span>
                        </span>
                    )}
                    <ChevronDown
                        className={`size-3.5 shrink-0 text-white/40 transition ${mobileOpen ? 'rotate-180 text-white/70' : ''}`}
                        aria-hidden="true"
                    />
                </button>

                {mobileOpen ? (
                    <div className="border-t border-white/10 px-4 pb-3 pt-3">{filtersContent}</div>
                ) : null}
            </div>
        </section>
    );
}
