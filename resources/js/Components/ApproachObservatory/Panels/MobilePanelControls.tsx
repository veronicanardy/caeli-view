/**
 * Controles reutilizáveis do painel mobile.
 *
 * Responsabilidade: renderizar botões, cabeçalhos e mensagens vazias. Não decide
 * ranking, seleção global, filtros reais ou modo orbital.
 */

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SelectionMode } from '@/types';

export type MobilePanelSection = 'menu' | 'filters' | 'reference' | 'objects';

export function listTitle(count: number, mode: SelectionMode, en: boolean): string {
    if (mode === 'upcoming') return en ? `${count} upcoming passes` : `${count} próximas aproximações`;
    return en ? `${count} closest objects now` : `${count} objetos mais próximos agora`;
}

export function MobilePanelSectionHeader({
    title,
    backLabel,
    onBack,
    trailing,
}: {
    title: string;
    backLabel?: string;
    onBack?: () => void;
    trailing?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5">
            {backLabel && onBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-signal-cyan/75 transition hover:text-signal-cyan"
                >
                    <ChevronDown className="size-3 -rotate-90" aria-hidden />
                    {backLabel}
                </button>
            ) : (
                <div className="min-w-4" />
            )}
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">{title}</span>
            <div className="flex min-w-4 items-center justify-end">{trailing}</div>
        </div>
    );
}

const EMPTY_MODE_MESSAGES: Record<SelectionMode, { pt: string; en: string }> = {
    nearest: { pt: 'Nenhum objeto próximo encontrado agora.', en: 'No nearby objects found right now.' },
    upcoming: { pt: 'Nenhuma aproximação prevista para os próximos dias.', en: 'No close approaches scheduled for the next few days.' },
};

export function EmptyModeMessage({ selectionMode, locale }: { selectionMode: SelectionMode; locale: 'pt-BR' | 'en' }) {
    const msg = EMPTY_MODE_MESSAGES[selectionMode];
    return (
        <p className="px-1 py-2 text-[11px] leading-relaxed text-white/40">
            {locale === 'en' ? msg.en : msg.pt}
        </p>
    );
}
