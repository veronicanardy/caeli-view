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
 * Barra superior enxuta dos filtros do radar.
 *
 * Em desktop os controles ficam sempre visiveis. Em mobile, o resumo aparece
 * apenas quando o bloco esta recolhido para economizar area util do radar.
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
        if (selectionMode === 'upcoming') return 'Próximas aproximações';
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
            className="relative z-50 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur md:inline-block md:max-w-full md:px-4"
        >
            <div className="hidden md:block">{filtersContent}</div>

            <div className="md:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen((value) => !value)}
                    aria-expanded={mobileOpen}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-space-950/45 px-3 py-2 text-left"
                >
                    <div className="min-w-0">
                        {!mobileOpen ? (
                            <>
                                <div className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                                    {locale === 'en' ? 'Radar filters' : 'Filtros do radar'}
                                </div>
                                <div className="truncate pt-1 text-xs text-white/65">
                                    {currentModeLabel} • {objectLimit} {locale === 'en' ? 'objects' : 'objetos'}
                                </div>
                            </>
                        ) : (
                            <div className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                                {locale === 'en' ? 'Hide filters' : 'Ocultar filtros'}
                            </div>
                        )}
                    </div>
                    <ChevronDown
                        className={`size-4 shrink-0 text-white/55 transition ${mobileOpen ? 'rotate-180 text-white' : ''}`}
                        aria-hidden="true"
                    />
                </button>

                {mobileOpen ? <div className="pt-3">{filtersContent}</div> : null}
            </div>
        </section>
    );
}
