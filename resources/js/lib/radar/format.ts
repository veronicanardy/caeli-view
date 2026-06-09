/**
 * Responsabilidade: formatadores de exibição específicos da cena 3D do radar.
 * Formatação de timestamps UTC e distâncias em UA para os painéis e marcadores da cena.
 * Puro: Intl é determinístico por locale — não depende de DOM nem de estado global.
 */

import { KM_PER_AU } from '@/lib/sceneEphemeris';

/**
 * Formata um timestamp ISO 8601 para exibição compacta nos marcadores da cena.
 * Retorna o valor original se a string não for uma data válida.
 */
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

/**
 * Converte uma distância em km para UA com precisão adaptativa.
 *
 * A quantidade de casas decimais aumenta para distâncias menores, porque NEOs próximos
 * (<0,01 UA ≈ distância lunar) exigem mais algarismos para não exibir "0,000 UA":
 *   - < 0,01 UA → 5 casas (ex.: 0,00234 UA)
 *   - < 0,10 UA → 4 casas (ex.: 0,0521 UA)
 *   - ≥ 0,10 UA → 3 casas (ex.: 1,234 UA)
 *
 * Retorna '—' para valores ausentes ou não-finitos.
 */
export function formatDistanceAU(distanceKm: number | null | undefined, locale: 'pt-BR' | 'en'): string {
    if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) return '—';
    const au = distanceKm / KM_PER_AU;
    return `${new Intl.NumberFormat(locale, {
        maximumFractionDigits: au < 0.01 ? 5 : au < 0.1 ? 4 : 3,
    }).format(au)} ${locale === 'en' ? 'AU' : 'UA'}`;
}
