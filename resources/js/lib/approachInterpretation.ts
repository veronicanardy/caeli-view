import { compactKm, formatNumber, lunarDistanceFromKm } from '@/lib/format';
import { ApproachObservatoryCharts, ApproachObservatorySummary, UnifiedApproach } from '@/types';
import { averageDiameterMeters, classifyApproachAttention } from '@/lib/approachAttention';

export type RangeStatusTone = 'calm' | 'attentive' | 'elevated';

export type RangeStatus = {
    tone: RangeStatusTone;
    headline: string;
    detail: string;
};

export function deriveRangeStatus(summary: ApproachObservatorySummary, locale: 'pt-BR' | 'en'): RangeStatus {
    const en = locale === 'en';
    const closestLunar = summary.closestLunarDistance
        ?? lunarDistanceFromKm(summary.closestDistanceKm);

    if (summary.total === 0) {
        return {
            tone: 'calm',
            headline: en ? 'No approaches catalogued in this range.' : 'Nenhuma aproximação catalogada neste recorte.',
            detail: en ? 'Adjust the dates or the object type to widen the observation.' : 'Ajuste as datas ou o tipo de objeto para ampliar a observação.',
        };
    }

    if (summary.closerThanMoon > 0) {
        return {
            tone: 'elevated',
            headline: en
                ? `${summary.closerThanMoon} object${summary.closerThanMoon === 1 ? '' : 's'} pass${summary.closerThanMoon === 1 ? 'es' : ''} inside the average Moon distance.`
                : `${summary.closerThanMoon} ${summary.closerThanMoon === 1 ? 'objeto passa' : 'objetos passam'} dentro da distância média da Lua.`,
            detail: en
                ? 'Visually closer than the Moon. No object on this list has been declared an impact threat — proximity alone does not imply danger.'
                : 'Mais próximos que a Lua, visualmente. Nenhum objeto desta lista foi declarado ameaça de impacto — proximidade não significa perigo.',
        };
    }

    if (summary.nearMoon > 0 || (closestLunar !== null && closestLunar <= 3)) {
        return {
            tone: 'attentive',
            headline: en
                ? 'No object passes inside the Moon distance in this range.'
                : 'Nenhum objeto passa dentro da distância média da Lua neste recorte.',
            detail: en
                ? `${summary.nearMoon} object${summary.nearMoon === 1 ? '' : 's'} stay${summary.nearMoon === 1 ? 's' : ''} within a few lunar distances. Routine monitoring.`
                : `${summary.nearMoon} ${summary.nearMoon === 1 ? 'objeto permanece' : 'objetos permanecem'} a poucas distâncias lunares. Monitoramento de rotina.`,
        };
    }

    return {
        tone: 'calm',
        headline: en
            ? 'No object passes inside the Moon distance in this range.'
            : 'Nenhum objeto passa dentro da distância média da Lua neste recorte.',
        detail: en
            ? 'All catalogued approaches stay well beyond the Moon. Routine monitoring.'
            : 'Todas as aproximações catalogadas permanecem bem além da Lua. Monitoramento de rotina.',
    };
}

export function formatDateRange(start: string, end: string, locale: 'pt-BR' | 'en'): string {
    const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    if (start === end) {
        return safeFormat(formatter, start);
    }

    return `${safeFormat(formatter, start)} → ${safeFormat(formatter, end)}`;
}

function safeFormat(formatter: Intl.DateTimeFormat, value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatter.format(parsed);
}

function formatDayLabel(value: string, locale: 'pt-BR' | 'en'): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(parsed);
}

export type CuratedRole = 'closest' | 'fastest' | 'largest' | 'next' | 'flagged';

export type CuratedHighlight = {
    role: CuratedRole;
    approach: UnifiedApproach;
    headline: string;
    metric: string;
};

export function buildCuratedHighlights(approaches: UnifiedApproach[], locale: 'pt-BR' | 'en'): CuratedHighlight[] {
    if (!approaches.length) return [];
    const en = locale === 'en';
    const highlights: CuratedHighlight[] = [];
    const used = new Set<string>();

    const closest = pickBy(approaches, (a) => a.nominalDistanceKm, 'asc');
    if (closest) {
        highlights.push({
            role: 'closest',
            approach: closest,
            headline: en ? 'Closest pass' : 'Mais próximo',
            metric: closest.nominalDistanceKm !== null ? compactKm(closest.nominalDistanceKm) : '—',
        });
        used.add(closest.id);
    }

    const fastest = pickBy(approaches, (a) => a.relativeVelocityKph, 'desc');
    if (fastest && !used.has(fastest.id)) {
        highlights.push({
            role: 'fastest',
            approach: fastest,
            headline: en ? 'Fastest' : 'Mais rápido',
            metric: fastest.relativeVelocityKph !== null ? `${formatNumber(fastest.relativeVelocityKph, 0)} km/h` : '—',
        });
        used.add(fastest.id);
    }

    const largest = pickBy(approaches, (a) => averageDiameterMeters(a), 'desc');
    if (largest && !used.has(largest.id)) {
        const size = averageDiameterMeters(largest);
        highlights.push({
            role: 'largest',
            approach: largest,
            headline: en ? 'Largest estimate' : 'Maior estimado',
            metric: size !== null ? formatSize(size) : '—',
        });
        used.add(largest.id);
    }

    const next = pickNext(approaches);
    if (next && !used.has(next.id)) {
        highlights.push({
            role: 'next',
            approach: next,
            headline: en ? 'Next pass' : 'Próxima passagem',
            metric: next.approachDate ?? (en ? 'No date' : 'Sem data'),
        });
        used.add(next.id);
    }

    const flagged = approaches.find((a) => a.hazardFlag && !used.has(a.id));
    if (flagged) {
        highlights.push({
            role: 'flagged',
            approach: flagged,
            headline: en ? 'Flagged by NASA/JPL' : 'Sinalizado pela NASA/JPL',
            metric: en ? 'Technical flag, not impact alert' : 'Marcação técnica, não alerta de impacto',
        });
    }

    return highlights;
}

function pickBy<T>(items: UnifiedApproach[], getter: (a: UnifiedApproach) => number | null, direction: 'asc' | 'desc'): UnifiedApproach | null {
    let pick: UnifiedApproach | null = null;
    let pickValue: number | null = null;

    for (const item of items) {
        const value = getter(item);
        if (value === null) continue;
        if (pickValue === null
            || (direction === 'asc' && value < pickValue)
            || (direction === 'desc' && value > pickValue)) {
            pick = item;
            pickValue = value;
        }
    }

    return pick;
}

function pickNext(items: UnifiedApproach[]): UnifiedApproach | null {
    const today = localDateIso(new Date());
    const future = items
        .filter((a) => a.approachDate && a.approachDate >= today)
        .sort((left, right) => (left.approachDate ?? '').localeCompare(right.approachDate ?? ''));
    return future[0] ?? null;
}

export function pickFocusApproach(approaches: UnifiedApproach[]): UnifiedApproach | null {
    if (!approaches.length) return null;
    const closest = pickBy(approaches, (a) => a.nominalDistanceKm, 'asc');
    return closest ?? approaches[0];
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

function formatTimelineDay(formatter: Intl.DateTimeFormat, value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatter.format(parsed);
}

function formatSize(meters: number): string {
    if (meters >= 1000) return `${formatNumber(meters / 1000, 2)} km`;
    return `${formatNumber(meters, 0)} m`;
}

export function closestLunarLabel(summary: ApproachObservatorySummary, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    const closestLunar = summary.closestLunarDistance ?? lunarDistanceFromKm(summary.closestDistanceKm);
    if (closestLunar === null) return en ? 'No reference available' : 'Sem referência';
    return en
        ? `≈ ${formatNumber(closestLunar, closestLunar < 10 ? 1 : 0)}× the Moon distance`
        : `≈ ${formatNumber(closestLunar, closestLunar < 10 ? 1 : 0)}x a distância da Lua`;
}

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

function localDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

export type RangeInsightKey = 'busiestDay' | 'closest' | 'fastest' | 'largest' | 'mix';

export type RangeInsight = {
    key: RangeInsightKey;
    question: string;
    answer: string;
    detail: string;
};

export function buildRangeInsights(
    summary: ApproachObservatorySummary,
    charts: ApproachObservatoryCharts,
    approaches: UnifiedApproach[],
    locale: 'pt-BR' | 'en',
): RangeInsight[] {
    const en = locale === 'en';
    const insights: RangeInsight[] = [];

    if (charts.byDay.length) {
        const peak = charts.byDay.reduce((max, day) => (day.total > max.total ? day : max), charts.byDay[0]);
        insights.push({
            key: 'busiestDay',
            question: en ? 'When did the range get busiest?' : 'Quando o recorte ficou mais movimentado?',
            answer: formatDayLabel(peak.date, locale),
            detail: en
                ? `${peak.total} approach${peak.total === 1 ? '' : 'es'} on that day.`
                : `${peak.total} ${peak.total === 1 ? 'aproximação' : 'aproximações'} nesse dia.`,
        });
    }

    if (summary.closestObjectName && summary.closestDistanceKm !== null) {
        const lunar = summary.closestLunarDistance ?? lunarDistanceFromKm(summary.closestDistanceKm);
        const lunarLabel = lunar !== null
            ? (en ? `${formatNumber(lunar, lunar < 10 ? 1 : 0)}× the Moon distance` : `${formatNumber(lunar, lunar < 10 ? 1 : 0)}x a distância da Lua`)
            : '';
        insights.push({
            key: 'closest',
            question: en ? 'Who came closest?' : 'Quem chegou mais perto?',
            answer: summary.closestObjectName,
            detail: `${compactKm(summary.closestDistanceKm)}${lunarLabel ? ` · ${lunarLabel}` : ''}`,
        });
    }

    if (summary.fastestObjectName && summary.fastestVelocityKph !== null) {
        const velocity = humanizeVelocity(summary.fastestVelocityKph, locale);
        insights.push({
            key: 'fastest',
            question: en ? 'Who went fastest?' : 'Quem passou mais rápido?',
            answer: summary.fastestObjectName,
            detail: `${formatNumber(summary.fastestVelocityKph, 0)} km/h${velocity ? ` · ${velocity.label}` : ''}`,
        });
    }

    const largest = pickBy(approaches, (a) => averageDiameterMeters(a), 'desc');
    if (largest) {
        const size = averageDiameterMeters(largest);
        const human = size !== null ? humanizeSize(size, locale) : null;
        insights.push({
            key: 'largest',
            question: en ? 'What was the largest estimate?' : 'Qual foi o maior objeto estimado?',
            answer: largest.name,
            detail: size !== null
                ? `${formatSize(size)}${human ? ` · ${human.label}` : ''}`
                : (en ? 'Size not reported.' : 'Tamanho não informado.'),
        });
    }

    const total = summary.total || 1;
    const asteroidShare = Math.round((summary.asteroids / total) * 100);
    insights.push({
        key: 'mix',
        question: en ? 'What kinds of objects showed up?' : 'Que tipos de objetos apareceram?',
        answer: en
            ? `${asteroidShare}% asteroids`
            : `${asteroidShare}% asteroides`,
        detail: en
            ? `${summary.asteroids} asteroid${summary.asteroids === 1 ? '' : 's'} · ${summary.comets} comet${summary.comets === 1 ? '' : 's'}`
            : `${summary.asteroids} ${summary.asteroids === 1 ? 'asteroide' : 'asteroides'} · ${summary.comets} ${summary.comets === 1 ? 'cometa' : 'cometas'}`,
    });

    return insights;
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
        label: formatDayLabel(group.date, locale) || formatter.format(new Date(`${group.date}T00:00:00`)),
        total: group.items.length,
        isPeak: group.items.length === peakTotal,
        isToday: group.isToday,
        isPast: group.isPast,
    }));
}
