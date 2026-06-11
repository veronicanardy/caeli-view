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
 * Rótulo relativo de calendário entre `nowMs` e um timestamp alvo, em dias UTC.
 *
 * Compara dias de calendário em UTC (mesmo fuso do formatTimestamp), não janelas
 * de 24h: às 23h de hoje, um evento à 01h de amanhã retorna "amanhã".
 *   - mesmo dia    → "hoje" / "today"
 *   - dia seguinte → "amanhã" / "tomorrow"
 *   - 2+ dias      → "em N dias" / "in N days"
 *
 * Retorna null para datas inválidas ou já passadas (dia anterior ao atual),
 * deixando o chamador cair no formato absoluto.
 */
export function formatRelativeDayLabel(value: string, nowMs: number, locale: 'pt-BR' | 'en'): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const DAY_MS = 86_400_000;
    const diffDays = Math.floor(date.getTime() / DAY_MS) - Math.floor(nowMs / DAY_MS);
    if (diffDays < 0) return null;
    if (diffDays === 0) return locale === 'en' ? 'today' : 'hoje';
    if (diffDays === 1) return locale === 'en' ? 'tomorrow' : 'amanhã';
    return locale === 'en' ? `in ${diffDays} days` : `em ${diffDays} dias`;
}

/**
 * Converte uma distância em km para UA com precisão adaptativa.
 *
 * A quantidade de casas decimais aumenta para distâncias menores, porque NEOs próximos
 * (<0,01 UA ≈ distância lunar) exigem mais algarismos para não exibir "0,00 UA":
 *   - < 0,01 UA → 4 casas (ex.: 0,0023 UA)
 *   - < 0,10 UA → 3 casas (ex.: 0,052 UA)
 *   - ≥ 0,10 UA → 2 casas (ex.: 1,23 UA)
 *
 * Retorna '—' para valores ausentes ou não-finitos.
 */
export function formatDistanceAU(distanceKm: number | null | undefined, locale: 'pt-BR' | 'en'): string {
    if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) return '—';
    const au = distanceKm / KM_PER_AU;
    return `${new Intl.NumberFormat(locale, {
        maximumFractionDigits: au < 0.01 ? 4 : au < 0.1 ? 3 : 2,
    }).format(au)} ${locale === 'en' ? 'AU' : 'UA'}`;
}
