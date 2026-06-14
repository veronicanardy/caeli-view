/**
 * Helpers de apresentação compartilhados da navegação do radar.
 *
 * Responsabilidade: títulos de lista e mensagens de estado vazio usados pelo
 * painel desktop e pelos sheets mobile. Não decide ranking, seleção global,
 * filtros reais ou modo orbital.
 */

import type { SelectionMode } from '@/types';

export function listTitle(count: number, mode: SelectionMode, en: boolean): string {
    if (mode === 'upcoming') return en ? `${count} upcoming passes` : `${count} próximas aproximações`;
    return en ? `${count} closest objects now` : `${count} objetos mais próximos agora`;
}

const EMPTY_MODE_MESSAGES: Record<SelectionMode, { pt: string; en: string }> = {
    nearest: { pt: 'Nenhum objeto próximo encontrado agora.', en: 'No nearby objects found right now.' },
    upcoming: { pt: 'Nenhuma aproximação prevista para os próximos dias.', en: 'No close approaches scheduled for the next few days.' },
};

export function EmptyModeMessage({ selectionMode, locale }: { selectionMode: SelectionMode; locale: 'pt-BR' | 'en' }) {
    const msg = EMPTY_MODE_MESSAGES[selectionMode];
    return (
        <p className="px-2 py-2 text-[11.5px] leading-relaxed text-white/40">
            {locale === 'en' ? msg.en : msg.pt}
        </p>
    );
}
