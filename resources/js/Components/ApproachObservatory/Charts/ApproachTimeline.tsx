import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Crown } from 'lucide-react';
import type { Translator } from '@/i18n';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactKm, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { UnifiedApproach } from '@/types';
import { buildDailySummary, groupApproachesByDay } from '@/lib/approachInterpretation';
import { ObjectTypeBadge } from '../Presenters/ObjectTypeBadge';

type Props = {
    approaches: UnifiedApproach[];
    locale: 'pt-BR' | 'en';
    t: Translator;
};

const MAX_DAYS = 14;

export function ApproachTimeline({ approaches, locale, t }: Props) {
    const groups = useMemo(() => groupApproachesByDay(approaches, locale), [approaches, locale]);
    const daily = useMemo(() => buildDailySummary(approaches, locale), [approaches, locale]);

    const nextId = useMemo(() => {
        const today = localDateIso(new Date());
        for (const group of groups) {
            if (group.date < today) continue;
            return group.items[0]?.id ?? null;
        }
        return null;
    }, [groups]);

    const initialExpanded = useMemo(() => {
        const today = localDateIso(new Date());
        const next = groups.find((group) => group.date >= today);
        return new Set([next?.date].filter(Boolean) as string[]);
    }, [groups]);

    const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

    if (!groups.length) {
        return (
            <p className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-white/55">
                {t('observatory.timeline.empty')}
            </p>
        );
    }

    const visible = groups.slice(0, MAX_DAYS);
    const peakTotal = Math.max(...daily.map((day) => day.total), 1);

    const toggle = (date: string) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            <DailySummary daily={daily} peakTotal={peakTotal} t={t} />

            <div className="relative rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                <span className="pointer-events-none absolute bottom-5 left-[26px] top-5 w-px bg-gradient-to-b from-signal-cyan/30 via-white/10 to-transparent sm:left-[30px]" aria-hidden="true" />
                <ol className="relative space-y-4">
                    {visible.map((group) => {
                        const isOpen = expanded.has(group.date);
                        const isPeak = group.items.length === peakTotal && peakTotal > 1;

                        return (
                            <li key={group.date}>
                                <button
                                    type="button"
                                    onClick={() => toggle(group.date)}
                                    aria-expanded={isOpen}
                                    className="flex w-full items-center gap-3 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                >
                                    <span className={`relative z-10 inline-flex size-3 shrink-0 rounded-full ring-4 ${group.isToday ? 'bg-signal-amber ring-signal-amber/20' : group.isPast ? 'bg-white/30 ring-white/5' : 'bg-signal-cyan ring-signal-cyan/15'}`} aria-hidden="true" />
                                    <div className="flex flex-1 flex-wrap items-baseline justify-between gap-2">
                                        <p className="flex items-center gap-2 text-sm font-semibold text-white">
                                            {group.dateLabel}
                                            {group.isToday ? (
                                                <span className="rounded-full border border-signal-amber/40 bg-signal-amber/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-amber">
                                                    {t('observatory.timeline.today')}
                                                </span>
                                            ) : null}
                                            {isPeak ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-signal-mint/40 bg-signal-mint/10 px-2 py-0.5 text-[10px] font-medium text-signal-mint">
                                                    <Crown className="size-3" aria-hidden="true" />
                                                    {t('observatory.timeline.summary.peak')}
                                                </span>
                                            ) : null}
                                        </p>
                                        <p className="flex items-center gap-2 text-[11px] text-white/45">
                                            <span>{group.items.length} {group.items.length === 1 ? t('observatory.timeline.events.one') : t('observatory.timeline.events.other')}</span>
                                            <ChevronDown className={`size-3.5 transition ${isOpen ? 'rotate-180 text-signal-cyan' : ''}`} aria-hidden="true" />
                                        </p>
                                    </div>
                                </button>

                                {isOpen ? (
                                    <ul className="ml-6 mt-2 space-y-1.5 sm:ml-8">
                                        {group.items.map((approach) => (
                                            <TimelineRow
                                                key={approach.id}
                                                approach={approach}
                                                highlighted={approach.id === nextId}
                                                nextLabel={t('observatory.timeline.next')}
                                            />
                                        ))}
                                    </ul>
                                ) : null}
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}

function localDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function DailySummary({ daily, peakTotal, t }: { daily: ReturnType<typeof buildDailySummary>; peakTotal: number; t: Translator }) {
    if (!daily.length) return null;
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:p-4">
            <p className="text-[11px] uppercase tracking-wide text-white/45">{t('observatory.timeline.summary.title')}</p>
            <div className="mt-2 flex items-end gap-1 overflow-x-auto pb-1">
                {daily.map((day) => {
                    const height = Math.max(6, Math.round((day.total / peakTotal) * 36));
                    return (
                        <div key={day.date} className="flex min-w-[44px] flex-col items-center gap-1">
                            <span className="text-[10px] font-medium text-white/65">{day.total}</span>
                            <div
                                className={`w-3 rounded-sm transition-all ${day.isPeak ? 'bg-signal-mint' : day.isToday ? 'bg-signal-amber' : day.isPast ? 'bg-white/25' : 'bg-signal-cyan/70'}`}
                                style={{ height: `${height}px` }}
                                aria-hidden="true"
                            />
                            <span className="whitespace-nowrap text-[10px] text-white/45">{day.label}</span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function TimelineRow({ approach, highlighted, nextLabel }: { approach: UnifiedApproach; highlighted: boolean; nextLabel: string }) {
    const lunarDistance = lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance;
    const identity = resolveApproachIdentity(approach);

    return (
        <li>
            <Link
                href={approach.detailRoute}
                className={`group flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-signal-cyan ${highlighted ? 'border-signal-cyan/40 bg-signal-cyan/10 hover:bg-signal-cyan/15' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'}`}
            >
                <div className="flex min-w-0 items-center gap-2">
                    {highlighted ? (
                        <span className="rounded-full border border-signal-cyan/40 bg-signal-cyan/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-cyan">
                            {nextLabel}
                        </span>
                    ) : null}
                    <ObjectTypeBadge type={approach.objectType} />
                    <div className="min-w-0">
                        <p className="truncate font-medium text-white">{identity.displayName}</p>
                        {identity.subtitle ? <p className="truncate text-[11px] text-white/45">{identity.subtitle}</p> : null}
                    </div>
                </div>
                <div className="hidden shrink-0 items-center gap-3 text-xs text-white/55 sm:flex">
                    <span>{compactKm(approach.nominalDistanceKm)}</span>
                    <span className="text-white/40">·</span>
                    <span>{lunarDistanceLabel(lunarDistance)}</span>
                    <ChevronRight className="size-3.5 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-signal-cyan" aria-hidden="true" />
                </div>
                <ChevronRight className="size-3.5 shrink-0 text-white/40 sm:hidden" aria-hidden="true" />
            </Link>
        </li>
    );
}
