import { Link } from '@inertiajs/react';
import { CalendarClock, Gauge, MoveRight, Ruler, Sparkles, Target } from 'lucide-react';
import { ReactNode } from 'react';
import type { TranslationKey, Translator } from '@/i18n';
import { averageDiameterMeters, classifyApproachAttention } from '@/lib/approachAttention';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactKm, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { UnifiedApproach } from '@/types';
import { DistanceBand, FocusReason, distanceBand, humanizeSize, humanizeVelocity, pickFocusReasons } from '@/lib/approachInterpretation';
import { EarthMoonRuler } from '../Presenters/EarthMoonRuler';
import { ObjectTypeBadge } from '../Presenters/ObjectTypeBadge';

type Props = {
    approach: UnifiedApproach;
    pool: UnifiedApproach[];
    locale: 'pt-BR' | 'en';
    t: Translator;
};

const REASON_KEY: Record<FocusReason, TranslationKey> = {
    closest: 'observatory.focus.reasons.closest',
    fastest: 'observatory.focus.reasons.fastest',
    largest: 'observatory.focus.reasons.largest',
    next: 'observatory.focus.reasons.next',
    flagged: 'observatory.focus.reasons.flagged',
    attention: 'observatory.focus.reasons.attention',
};

const BAND_KEY: Record<DistanceBand, TranslationKey> = {
    inside: 'observatory.band.inside',
    near: 'observatory.band.near',
    beyond: 'observatory.band.beyond',
    farBeyond: 'observatory.band.farBeyond',
    unknown: 'observatory.band.unknown',
};

const BAND_TONE: Record<DistanceBand, string> = {
    inside: 'border-signal-coral/40 bg-signal-coral/10 text-signal-coral',
    near: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
    beyond: 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan',
    farBeyond: 'border-white/15 bg-white/[0.06] text-white/70',
    unknown: 'border-white/10 bg-white/[0.04] text-white/55',
};

export function FocusObject({ approach, pool, locale, t }: Props) {
    const attention = classifyApproachAttention(approach);
    const identity = resolveApproachIdentity(approach);
    const lunarDistance = lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance;
    const size = averageDiameterMeters(approach);
    const reasons = pickFocusReasons(approach, pool);
    const band = distanceBand(lunarDistance);
    const sizeHuman = humanizeSize(size, locale);
    const velocityHuman = humanizeVelocity(approach.relativeVelocityKph, locale);

    return (
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-signal-cyan/10 via-white/[0.04] to-signal-violet/10 p-5 shadow-glow sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-signal-cyan/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-signal-violet/15 blur-3xl" aria-hidden="true" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-signal-cyan">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        {t('observatory.focus.eyebrow')}
                        <ObjectTypeBadge type={approach.objectType} />
                        <span className="rounded-full border border-signal-violet/30 bg-signal-violet/10 px-2 py-0.5 text-[10px] font-medium text-signal-violet">
                            {attention.label}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BAND_TONE[band]}`}>
                            {t(BAND_KEY[band])}
                        </span>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-semibold text-white sm:text-3xl">{identity.displayName}</h2>
                    <p className="mt-1 text-sm text-white/55">
                        {identity.subtitle ?? approach.designation ?? approach.detailIdentifier}
                        {approach.sourceLabel ? ` · ${approach.sourceLabel}` : ''}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">{t('observatory.focus.subtitle')}</p>

                    <div className="mt-4">
                        <p className="text-[11px] uppercase tracking-wide text-white/45">{t('observatory.focus.reasons.title')}</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                            {reasons.map((reason) => (
                                <li key={reason}>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/75">
                                        <span className="size-1.5 rounded-full bg-signal-cyan" aria-hidden="true" />
                                        {t(REASON_KEY[reason])}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <Link
                    href={approach.detailRoute}
                    className="group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-signal-cyan/40 bg-signal-cyan/15 px-4 py-2.5 text-sm font-semibold text-white outline-none transition hover:bg-signal-cyan/25 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                >
                    {t('observatory.focus.cta')}
                    <MoveRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
            </div>

            <dl className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric icon={<Target className="size-4" />} label={t('observatory.focus.distance')} value={compactKm(approach.nominalDistanceKm)} />
                <Metric icon={<span className="text-base leading-none">☾</span>} label={t('observatory.focus.lunar')} value={lunarDistanceLabel(lunarDistance)} />
                <Metric icon={<Gauge className="size-4" />} label={t('observatory.focus.velocity')} value={approach.relativeVelocityKph !== null ? `${formatNumber(approach.relativeVelocityKph, 0)} km/h` : '—'} helper={velocityHuman?.label} />
                <Metric icon={<CalendarClock className="size-4" />} label={t('observatory.focus.date')} value={approach.approachDate ?? '—'} />
            </dl>

            <div className="relative mt-4">
                <EarthMoonRuler
                    lunarDistance={lunarDistance}
                    distanceKm={approach.nominalDistanceKm}
                    earthLabel={t('observatory.focus.ruler.earth')}
                    moonLabel={t('observatory.focus.ruler.moon')}
                    objectLabel={t('observatory.focus.ruler.object')}
                    noteLabel={t('observatory.focus.ruler.note')}
                    titleLabel={t('observatory.focus.ruler.title')}
                    unavailableLabel={t('observatory.focus.ruler.unavailable')}
                />
            </div>

            <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
                <ComparisonRow icon={<Ruler className="size-3.5" />} label={t('observatory.focus.size.comparison')}>
                    {sizeHuman ? (
                        <>
                            <span className="font-medium text-white">{formatSize(sizeHuman.estimatedMeters)}</span>
                            <span className="text-white/55"> · {sizeHuman.label}</span>
                        </>
                    ) : (
                        <span className="text-white/45">{t('observatory.focus.size.unavailable')}</span>
                    )}
                </ComparisonRow>
                <ComparisonRow icon={<Gauge className="size-3.5" />} label={t('observatory.focus.velocity.comparison')}>
                    {velocityHuman ? (
                        <span className="text-white/70">{velocityHuman.label}</span>
                    ) : (
                        <span className="text-white/45">—</span>
                    )}
                </ComparisonRow>
            </div>

            <p className="relative mt-4 max-w-3xl text-xs leading-5 text-white/45">{t('observatory.focus.note')}</p>
        </section>
    );
}

function Metric({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper?: string }) {
    return (
        <div className="rounded-lg border border-white/10 bg-space-950/55 p-3">
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50">
                <span className="text-signal-cyan">{icon}</span>
                {label}
            </dt>
            <dd className="mt-1.5 truncate text-base font-semibold text-white">{value}</dd>
            {helper ? <dd className="mt-0.5 truncate text-[11px] text-white/45">{helper}</dd> : null}
        </div>
    );
}

function ComparisonRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-space-950/40 px-3 py-2 text-xs">
            <span className="text-signal-cyan">{icon}</span>
            <span className="text-white/45">{label}:</span>
            <span className="min-w-0 truncate">{children}</span>
        </div>
    );
}

function formatSize(meters: number): string {
    if (meters >= 1000) return `${formatNumber(meters / 1000, 2)} km`;
    return `${formatNumber(meters, 0)} m`;
}
