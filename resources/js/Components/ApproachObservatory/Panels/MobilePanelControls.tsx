import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SelectionMode } from '@/types';

/**
 * Controles reutilizáveis do painel mobile.
 *
 * Este arquivo renderiza botões, cabeçalhos e mensagens vazias. Ele não decide
 * ranking, seleção global, filtros reais ou modo orbital.
 */

export type MobilePanelSection = 'menu' | 'filters' | 'reference' | 'objects';

export function listTitle(count: number, mode: SelectionMode, en: boolean): string {
    if (mode === 'upcoming') return en ? `${count} upcoming passes` : `${count} próximas aproximações`;
    if (mode === 'attention') return en ? `${count} watch-list objects` : `${count} objetos em maior atenção`;
    return en ? `${count} closest objects now` : `${count} objetos mais próximos agora`;
}

export function MobilePanelMenuButton({
    label,
    subtitle,
    onClick,
}: {
    label: string;
    subtitle: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-signal-cyan"
        >
            <div className="min-w-0">
                <div className="text-[12px] font-medium text-white/85">{label}</div>
                <div className="truncate text-[10px] uppercase tracking-wide text-white/40">{subtitle}</div>
            </div>
            <ChevronDown className="-rotate-90 size-3.5 shrink-0 text-white/35" aria-hidden />
        </button>
    );
}

export function MobilePanelSectionHeader({
    title,
    backLabel,
    onBack,
    trailing,
}: {
    title: string;
    backLabel: string;
    onBack: () => void;
    trailing?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-signal-cyan/75 transition hover:text-signal-cyan"
            >
                <ChevronDown className="size-3 -rotate-90" aria-hidden />
                {backLabel}
            </button>
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">{title}</span>
            <div className="flex min-w-4 items-center justify-end">{trailing}</div>
        </div>
    );
}

const EMPTY_MODE_MESSAGES: Record<SelectionMode, { pt: string; en: string }> = {
    nearest: { pt: 'Nenhum objeto próximo encontrado agora.', en: 'No nearby objects found right now.' },
    upcoming: { pt: 'Nenhuma aproximação prevista para hoje.', en: 'No close approaches scheduled for today.' },
    attention: {
        pt: 'Nenhum objeto monitorado pela NASA/JPL com posição disponível no radar agora.',
        en: 'No NASA/JPL-monitored objects with a position available in the radar right now.',
    },
};

export function EmptyModeMessage({ selectionMode, locale }: { selectionMode: SelectionMode; locale: 'pt-BR' | 'en' }) {
    const msg = EMPTY_MODE_MESSAGES[selectionMode];
    return (
        <p className="px-1 py-2 text-[11px] leading-relaxed text-white/40">
            {locale === 'en' ? msg.en : msg.pt}
        </p>
    );
}
