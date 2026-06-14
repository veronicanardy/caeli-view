/**
 * Barra de controles do radar no topo da página (desktop).
 *
 * Responsabilidade: agrupar os controles de limite e modo de seleção acima da
 * cena. Visível apenas em lg:+ (a página esconde abaixo disso): no mobile os
 * mesmos filtros vivem no bottom sheet aberto pela barra de ações da cena.
 * Não decide ranking nem acessa dados — apenas repassa callbacks para
 * RadarObjectControls.
 */

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

export function CompactConsoleBar({
    locale,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading = false,
}: Props) {
    return (
        <section
            aria-label={locale === 'en' ? 'Radar filters' : 'Filtros do radar'}
            data-tutorial="radar-filters"
            className="relative z-50 inline-block max-w-full"
        >
            <RadarObjectControls
                objectLimit={objectLimit}
                selectionMode={selectionMode}
                onLimitChange={onLimitChange}
                onModeChange={onModeChange}
                locale={locale}
                loading={radarLoading}
            />
        </section>
    );
}
