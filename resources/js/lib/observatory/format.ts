/**
 * Display formatters used by the observatory UI. Pure (Intl is deterministic per locale).
 */

import { KM_PER_AU } from '@/lib/sceneEphemeris';

export function formatTimestamp(value: string, locale: 'pt-BR' | 'en'): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    }).format(date);
}

export function formatDistanceAU(distanceKm: number | null | undefined, locale: 'pt-BR' | 'en'): string {
    if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) return '—';
    const au = distanceKm / KM_PER_AU;
    return `${new Intl.NumberFormat(locale, {
        maximumFractionDigits: au < 0.01 ? 5 : au < 0.1 ? 4 : 3,
    }).format(au)} ${locale === 'en' ? 'AU' : 'UA'}`;
}
