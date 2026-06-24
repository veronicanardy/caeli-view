/**
 * Formatadores locais de apresentação usados pelos painéis.
 *
 * Responsabilidade: padronizar datas e unidades exibidas na UI. Não calcula
 * órbita, ranking, trajetória ou posições reais da cena.
 */

import { formatNumber } from '@/lib/format';

const EN_MONTH_NUMBER: Record<string, string> = {
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

const ASTRONOMICAL_UNIT_KM = 149_597_870.7;

/** Formata a data e hora da aproximação (DD/MM + HH:MM + timezone) — inclui dia e mês. */
export function formatApproachDateTime(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(parsed);
}

export function formatApproachDate(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '-';

    const normalized = value.replace(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/,
        (month) => EN_MONTH_NUMBER[month] ?? month,
    );
    const match = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2}))?/);

    if (!match) return value;

    const [, year, month, day, hour, minute] = match;
    if (locale === 'en') {
        return `${year}-${month}-${day}${hour ? ` ${hour}:${minute}` : ''}`;
    }

    return `${day}/${month}/${year}${hour ? ` ${hour}:${minute}` : ''}`;
}

export function formatAstronomicalUnit(distanceKm: number | null, locale: 'pt-BR' | 'en'): string | null {
    if (distanceKm === null) return null;

    const au = distanceKm / ASTRONOMICAL_UNIT_KM;
    const precision = au < 0.1 ? 4 : 3;
    const formatted = formatNumber(au, precision);

    return locale === 'en'
        ? `${formatted} AU`
        : `${formatted} UA`;
}
