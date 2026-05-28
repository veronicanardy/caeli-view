import { CalendarClock, Gauge, HelpCircle, Layers, Ruler, Target } from 'lucide-react';
import { RangeInsight, RangeInsightKey } from '@/lib/approachInterpretation';

const KEY_ICON: Record<RangeInsightKey, typeof CalendarClock> = {
    busiestDay: CalendarClock,
    closest: Target,
    fastest: Gauge,
    largest: Ruler,
    mix: Layers,
};

const KEY_TONE: Record<RangeInsightKey, { ring: string; text: string }> = {
    busiestDay: { ring: 'border-signal-mint/30', text: 'text-signal-mint' },
    closest: { ring: 'border-signal-cyan/30', text: 'text-signal-cyan' },
    fastest: { ring: 'border-signal-amber/30', text: 'text-signal-amber' },
    largest: { ring: 'border-signal-violet/30', text: 'text-signal-violet' },
    mix: { ring: 'border-white/15', text: 'text-white/70' },
};

export function RangeInsightsCards({ insights }: { insights: RangeInsight[] }) {
    if (!insights.length) return null;
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {insights.map((insight) => {
                const Icon = KEY_ICON[insight.key];
                const tone = KEY_TONE[insight.key];
                return (
                    <article
                        key={insight.key}
                        className={`flex h-full flex-col rounded-lg border bg-white/[0.04] p-4 transition hover:bg-white/[0.06] ${tone.ring}`}
                    >
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/45">
                            <HelpCircle className="size-3.5 text-white/35" aria-hidden="true" />
                            <span className="line-clamp-2">{insight.question}</span>
                        </div>
                        <div className="mt-3 flex items-start gap-2">
                            <span className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ${tone.text}`}>
                                <Icon className="size-3.5" aria-hidden="true" />
                            </span>
                            <p className="break-words text-base font-semibold leading-snug text-white">{insight.answer}</p>
                        </div>
                        <p className="mt-2 text-xs text-white/55">{insight.detail}</p>
                    </article>
                );
            })}
        </div>
    );
}
