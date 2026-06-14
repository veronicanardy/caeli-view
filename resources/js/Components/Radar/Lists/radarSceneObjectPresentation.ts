/**
 * Helpers de apresentação do item de lista da cena do radar.
 *
 * Responsabilidade: formatar o label trailing (data ou distância) de cada item.
 * Funções puras — não acessam cena nem API.
 */

import { compactKm } from '@/lib/format';
import type { SelectionMode } from '@/types';

type ObservatoryLocale = 'pt-BR' | 'en';

// Helpers locais de apresentacao do item da cena do radar.
export function formatObjectListTrailingLabel(
    selectionMode: SelectionMode,
    approachDate: string | null,
    currentDistanceKm: number | null,
    locale: ObservatoryLocale,
): string {
    if (selectionMode === 'upcoming' && approachDate) {
        const parsed = parseApproachDate(approachDate);
        if (parsed) {
            return new Intl.DateTimeFormat(locale, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).format(parsed);
        }
    }

    return compactKm(currentDistanceKm);
}

// Isola o parsing da data de aproximacao sem fabricar posicoes ou estados novos.
function parseApproachDate(value: string): Date | null {
    const normalized = value.replace(
        /^(\d{4})-([A-Za-z]{3})-(\d{2})\s/,
        (_, year, month, day) => `${year}-${monthTokenToNumber(month)}-${day}T`,
    ).replace(' ', 'T') + 'Z';
    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthTokenToNumber(token: string): string {
    const months: Record<string, string> = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',
        Nov: '11',
        Dec: '12',
    };

    return months[token] ?? token;
}
