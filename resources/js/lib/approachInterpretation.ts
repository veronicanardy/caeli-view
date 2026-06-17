/**
 * Responsabilidade: derivar interpretações humanas dos dados brutos de aproximação.
 * Produz agrupamentos por dia e resumos diários (timeline) em linguagem natural (pt-BR / en),
 * sem depender de DOM ou React.
 */
import type { UnifiedApproach } from '@/types';

export type TimelineGroup = {
    date: string;
    dateLabel: string;
    items: UnifiedApproach[];
    isPast: boolean;
    isToday: boolean;
};

/** Agrupa aproximações por data de aproximação, ordenadas cronologicamente, com rótulos localizados. */
export function groupApproachesByDay(approaches: UnifiedApproach[], locale: 'pt-BR' | 'en'): TimelineGroup[] {
    const today = localDateIso(new Date());
    const buckets = new Map<string, UnifiedApproach[]>();

    for (const approach of approaches) {
        const key = approach.approachDate ?? '';
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(approach);
    }

    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: 'short' });
    return Array.from(buckets.entries())
        .filter(([date]) => date !== '')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, items]) => ({
            date,
            dateLabel: formatDateLabel(formatter, date),
            items,
            isPast: date < today,
            isToday: date === today,
        }));
}

export type DaySummary = {
    date: string;
    label: string;
    total: number;
    isPeak: boolean;
    isToday: boolean;
    isPast: boolean;
};

/** Produz um resumo por dia (total de aproximações, se é pico, hoje, passado) para a barra de timeline. */
export function buildDailySummary(approaches: UnifiedApproach[], locale: 'pt-BR' | 'en'): DaySummary[] {
    const groups = groupApproachesByDay(approaches, locale);
    if (!groups.length) return [];
    const peakTotal = Math.max(...groups.map((group) => group.items.length));
    const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
    return groups.map((group) => ({
        date: group.date,
        label: formatDateLabel(formatter, group.date),
        total: group.items.length,
        isPeak: group.items.length === peakTotal,
        isToday: group.isToday,
        isPast: group.isPast,
    }));
}

function formatDateLabel(formatter: Intl.DateTimeFormat, value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatter.format(parsed);
}

function localDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
