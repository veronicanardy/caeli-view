/**
 * Responsabilidade: derivar interpretações humanas dos dados brutos de aproximação.
 * Produz faixas de distância, razões de foco, comparações de tamanho e velocidade em linguagem
 * natural (pt-BR / en), agrupamentos por dia e resumos diários — tudo sem depender de DOM ou React.
 */
import { formatNumber } from '@/lib/format';
import type { UnifiedApproach } from '@/types';
import { averageDiameterMeters } from '@/lib/approachAttention';

export type DistanceBand = 'inside' | 'near' | 'beyond' | 'farBeyond' | 'unknown';

export function distanceBand(lunarDistance: number | null): DistanceBand {
    if (lunarDistance === null) return 'unknown';
    if (lunarDistance < 1) return 'inside';
    if (lunarDistance <= 3) return 'near';
    if (lunarDistance <= 20) return 'beyond';
    return 'farBeyond';
}

export type FocusReason = 'closest' | 'fastest' | 'largest' | 'next' | 'flagged' | 'attention';

export function pickFocusReasons(approach: UnifiedApproach, all: UnifiedApproach[]): FocusReason[] {
    const reasons: FocusReason[] = [];
    if (approach.hazardFlag) reasons.push('flagged');

    if (approach.nominalDistanceKm !== null) {
        const closer = all.every((other) => other === approach || other.nominalDistanceKm === null || other.nominalDistanceKm >= approach.nominalDistanceKm!);
        if (closer) reasons.push('closest');
    }

    if (approach.relativeVelocityKph !== null) {
        const faster = all.every((other) => other === approach || other.relativeVelocityKph === null || other.relativeVelocityKph <= approach.relativeVelocityKph!);
        if (faster) reasons.push('fastest');
    }

    const size = averageDiameterMeters(approach);
    if (size !== null) {
        const largest = all.every((other) => {
            if (other === approach) return true;
            const otherSize = averageDiameterMeters(other);
            return otherSize === null || otherSize <= size;
        });
        if (largest) reasons.push('largest');
    }

    if (approach.approachDate) {
        const today = localDateIso(new Date());
        if (approach.approachDate >= today) {
            const earliestFuture = all
                .filter((a) => a.approachDate && a.approachDate >= today)
                .sort((left, right) => (left.approachDate ?? '').localeCompare(right.approachDate ?? ''))[0];
            if (earliestFuture === approach) reasons.push('next');
        }
    }

    if (!reasons.length) reasons.push('attention');
    return reasons;
}

export type HumanSizeComparison = {
    estimatedMeters: number;
    label: string;
    note: string;
};

const FOOTBALL_FIELD_METERS = 105;

export function humanizeSize(meters: number | null, locale: 'pt-BR' | 'en'): HumanSizeComparison | null {
    if (meters === null || meters <= 0) return null;
    const en = locale === 'en';

    if (meters < 25) {
        return { estimatedMeters: meters, label: en ? `≈ ${formatNumber(meters, 0)} m wide — a small bus` : `≈ ${formatNumber(meters, 0)} m de largura — um ônibus pequeno`, note: en ? 'Estimated diameter.' : 'Diâmetro estimado.' };
    }
    if (meters < 90) {
        const floors = Math.round(meters / 3);
        return { estimatedMeters: meters, label: en ? `≈ a ${floors}-storey building` : `≈ um prédio de ${floors} andares`, note: en ? 'Estimated diameter.' : 'Diâmetro estimado.' };
    }
    if (meters < 600) {
        const fields = Math.max(1, Math.round(meters / FOOTBALL_FIELD_METERS));
        return { estimatedMeters: meters, label: en ? `≈ ${fields} football field${fields === 1 ? '' : 's'} long` : `≈ ${fields} campo${fields === 1 ? '' : 's'} de futebol de extensão`, note: en ? 'Estimated diameter.' : 'Diâmetro estimado.' };
    }
    if (meters < 2000) {
        return { estimatedMeters: meters, label: en ? `≈ the size of a small district` : `≈ do tamanho de um bairro pequeno`, note: en ? 'Estimated diameter.' : 'Diâmetro estimado.' };
    }
    return { estimatedMeters: meters, label: en ? `≈ the size of a small city` : `≈ do tamanho de uma cidade pequena`, note: en ? 'Estimated diameter.' : 'Diâmetro estimado.' };
}

const EARTH_PERIMETER_KM = 40075;

export type HumanVelocity = {
    label: string;
};

export function humanizeVelocity(kph: number | null, locale: 'pt-BR' | 'en'): HumanVelocity | null {
    if (kph === null || kph <= 0) return null;
    const en = locale === 'en';
    const lapsPerHour = kph / EARTH_PERIMETER_KM;

    if (lapsPerHour < 0.25) {
        const minutesPerLap = Math.round(60 / lapsPerHour);
        return { label: en ? `would circle Earth in about ${minutesPerLap} min` : `daria a volta na Terra em cerca de ${minutesPerLap} min` };
    }

    const formatted = formatNumber(lapsPerHour, lapsPerHour < 5 ? 1 : 0);
    return { label: en ? `≈ ${formatted} laps around Earth per hour` : `≈ ${formatted} ${lapsPerHour < 1.5 ? 'volta' : 'voltas'} na Terra por hora` };
}

export type TimelineGroup = {
    date: string;
    dateLabel: string;
    items: UnifiedApproach[];
    isPast: boolean;
    isToday: boolean;
};

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
            dateLabel: formatTimelineDay(formatter, date),
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

export function buildDailySummary(approaches: UnifiedApproach[], locale: 'pt-BR' | 'en'): DaySummary[] {
    const groups = groupApproachesByDay(approaches, locale);
    if (!groups.length) return [];
    const peakTotal = Math.max(...groups.map((group) => group.items.length));
    const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
    return groups.map((group) => ({
        date: group.date,
        label: formatDayLabel(formatter, group.date),
        total: group.items.length,
        isPeak: group.items.length === peakTotal,
        isToday: group.isToday,
        isPast: group.isPast,
    }));
}

function formatDayLabel(formatter: Intl.DateTimeFormat, value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatter.format(parsed);
}

function formatTimelineDay(formatter: Intl.DateTimeFormat, value: string): string {
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
