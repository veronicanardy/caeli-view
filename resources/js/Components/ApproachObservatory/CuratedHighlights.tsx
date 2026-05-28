import { Link } from '@inertiajs/react';
import { CalendarClock, Gauge, MoveRight, Ruler, ShieldAlert, Target } from 'lucide-react';
import type { Translator } from '@/i18n';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { ObjectTypeBadge } from './ObjectTypeBadge';
import { CuratedHighlight, CuratedRole } from '@/lib/approachInterpretation';

const ROLE_ICON: Record<CuratedRole, typeof Target> = {
    closest: Target,
    fastest: Gauge,
    largest: Ruler,
    next: CalendarClock,
    flagged: ShieldAlert,
};

const ROLE_TONE: Record<CuratedRole, { ring: string; chip: string; iconBg: string }> = {
    closest: { ring: 'hover:border-signal-cyan/50', chip: 'text-signal-cyan', iconBg: 'bg-signal-cyan/10 text-signal-cyan' },
    fastest: { ring: 'hover:border-signal-amber/50', chip: 'text-signal-amber', iconBg: 'bg-signal-amber/10 text-signal-amber' },
    largest: { ring: 'hover:border-signal-violet/50', chip: 'text-signal-violet', iconBg: 'bg-signal-violet/10 text-signal-violet' },
    next: { ring: 'hover:border-signal-mint/50', chip: 'text-signal-mint', iconBg: 'bg-signal-mint/10 text-signal-mint' },
    flagged: { ring: 'hover:border-signal-coral/50', chip: 'text-signal-coral', iconBg: 'bg-signal-coral/10 text-signal-coral' },
};

type Props = {
    highlights: CuratedHighlight[];
    t: Translator;
};

export function CuratedHighlights({ highlights, t }: Props) {
    if (!highlights.length) {
        return (
            <p className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
                {t('observatory.highlights.empty')}
            </p>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {highlights.map((highlight) => (
                <HighlightCard key={`${highlight.role}-${highlight.approach.id}`} highlight={highlight} t={t} />
            ))}
        </div>
    );
}

function HighlightCard({ highlight, t }: { highlight: CuratedHighlight; t: Translator }) {
    const Icon = ROLE_ICON[highlight.role];
    const tone = ROLE_TONE[highlight.role];
    const { approach } = highlight;
    const identity = resolveApproachIdentity(approach);

    return (
        <Link
            href={approach.detailRoute}
            className={`group flex h-full flex-col rounded-lg border border-white/10 bg-white/[0.045] p-4 outline-none transition hover:-translate-y-0.5 ${tone.ring} focus-visible:ring-2 focus-visible:ring-signal-cyan`}
        >
            <div className="flex items-center justify-between">
                <span className={`inline-flex size-9 items-center justify-center rounded-full ${tone.iconBg}`}>
                    <Icon className="size-4" aria-hidden="true" />
                </span>
                <ObjectTypeBadge type={approach.objectType} />
            </div>
            <p className={`mt-3 text-[11px] font-medium uppercase tracking-wide ${tone.chip}`}>{highlight.headline}</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{identity.displayName}</p>
            {identity.subtitle ? <p className="mt-1 line-clamp-1 text-xs text-white/45">{identity.subtitle}</p> : null}
            <p className="mt-2 text-lg font-semibold text-white">{highlight.metric}</p>
            {approach.approachDate ? (
                <p className="mt-1 text-xs text-white/50">{approach.approachDate}</p>
            ) : null}
            <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-medium text-signal-cyan">
                {t('observatory.role.openDossier')}
                <MoveRight className="size-3.5 transition group-hover:translate-x-1" aria-hidden="true" />
            </span>
        </Link>
    );
}
