import { Link } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, FileText, Maximize2, Route } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import type { Translator } from '@/i18n';
import { averageDiameterMeters } from '@/lib/approachAttention';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { humanizeVelocity } from '@/lib/approachInterpretation';
import { compactKm, formatNumber } from '@/lib/format';
import type { AsteroidModelMetadata, UnifiedApproach } from '@/types';
import { AsteroidFidelityModel } from './AsteroidFidelityModel';
import { ObjectTypeBadge } from './ObjectTypeBadge';

const AsteroidScaleComparison = lazy(() =>
    import('@/Components/SmallBodies/AsteroidScaleComparison').then((module) => ({ default: module.AsteroidScaleComparison })),
);

const EN_MONTH_NUMBER: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
};

const ASTRONOMICAL_UNIT_KM = 149_597_870.7;

type Props = {
    approach: UnifiedApproach | null;
    locale: 'pt-BR' | 'en';
    t: Translator;
    onOpenScale: () => void;
    onOpenTrajectory: () => void;
    trajectoryLoading: boolean;
    hasTrajectory: boolean;
    model: AsteroidModelMetadata | null;
    modelLoading: boolean;
};

export function ObservatoryFocusPanel({
    approach,
    locale,
    t,
    onOpenScale,
    onOpenTrajectory,
    trajectoryLoading,
    hasTrajectory,
    model,
    modelLoading,
}: Props) {
    const [visualMode, setVisualMode] = useState<'model' | 'scale' | 'none'>('model');

    if (!approach) {
        return (
            <aside className="section-slide flex h-full min-h-[24rem] flex-col items-start justify-center rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                <p className="text-xs uppercase tracking-wide text-white/45">{t('observatory.panel.focus.title')}</p>
                <p className="mt-3 leading-6 text-white/65">{t('observatory.panel.focus.empty')}</p>
            </aside>
        );
    }

    const identity = resolveApproachIdentity(approach);
    const avgDiameter = averageDiameterMeters(approach);
    const velocityHuman = humanizeVelocity(approach.relativeVelocityKph, locale);
    const sourceLabel = approach.source === 'neows'
        ? t('observatory.panel.source.neows')
        : t('observatory.panel.source.cad');
    const physicalIsEstimated = approach.diameterMeters === null
        && (approach.estimatedDiameterMinMeters !== null || approach.estimatedDiameterMaxMeters !== null);

    return (
        <aside className="section-slide flex h-full flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-glow">
            <header>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-signal-cyan/85">
                    {t('observatory.panel.focus.title')}
                </p>
                <h2 className="mt-1.5 break-words text-lg font-semibold leading-snug text-white">
                    {identity.displayName}
                </h2>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <ObjectTypeBadge type={approach.objectType} />
                    <Badge tone="neutral">{sourceLabel}</Badge>
                    {approach.hazardFlag ? (
                        <Badge tone="hazard" icon={<AlertTriangle className="size-3" aria-hidden="true" />}>
                            {t('observatory.panel.flag.hazard')}
                        </Badge>
                    ) : null}
                    {physicalIsEstimated ? (
                        <Badge tone="estimated">{t('observatory.panel.flag.estimated')}</Badge>
                    ) : null}
                </div>
            </header>

            <dl className="divide-y divide-white/8 rounded-lg border border-white/10 bg-space-950/40">
                <Metric
                    label={t('observatory.panel.metrics.distance')}
                    primary={compactKm(approach.nominalDistanceKm)}
                    secondary={formatAstronomicalUnit(approach.nominalDistanceKm, locale)}
                />
                <Metric
                    label={t('observatory.panel.metrics.velocity')}
                    primary={approach.relativeVelocityKph !== null
                        ? `${formatNumber(approach.relativeVelocityKph, 0)} km/h`
                        : '-'}
                    secondary={velocityHuman?.label ?? null}
                />
                <Metric
                    label={t('observatory.panel.metrics.nextPass')}
                    primary={formatApproachDate(approach.approachDate, locale)}
                />
                <Metric
                    label={t('observatory.panel.metrics.diameter')}
                    primary={formatDiameterRange(approach)}
                    secondary={avgDiameter !== null && hasDiameterRange(approach)
                        ? `${t('observatory.panel.metrics.diameterAverage')} ${formatNumber(avgDiameter, 0)} m`
                        : null}
                />
            </dl>

            <section
                className="overflow-hidden rounded-lg border border-white/10 bg-space-950/35"
                aria-labelledby="focus-scale-eyebrow"
            >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
                    <p id="focus-scale-eyebrow" className="text-[10px] uppercase tracking-wide text-white/55">
                        {t('observatory.panel.scale.eyebrow')}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onOpenScale}
                            className="ml-1 inline-flex size-6 items-center justify-center rounded-full text-signal-cyan/90 outline-none transition hover:bg-white/10 hover:text-signal-cyan focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            aria-label={t('observatory.panel.scale.expand')}
                            title={t('observatory.panel.scale.expand')}
                        >
                            <Maximize2 className="size-3" aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div className="overflow-hidden">
                    {visualMode === 'model' ? (
                        <AsteroidFidelityModel
                            approach={approach}
                            model={model}
                            loading={modelLoading}
                            locale={locale}
                            compact
                            embedded
                        />
                    ) : null}

                    {visualMode === 'scale' ? (
                        <div className="max-h-[22rem] overflow-hidden">
                            <Suspense fallback={<div className="h-44 animate-pulse bg-white/[0.04]" />}>
                                <AsteroidScaleComparison
                                    diameterMinMeters={approach.estimatedDiameterMinMeters}
                                    diameterMaxMeters={approach.estimatedDiameterMaxMeters}
                                    diameterAverageMeters={approach.diameterMeters}
                                    label={t('observatory.panel.scale.eyebrow')}
                                    note={t('observatory.panel.scale.note')}
                                    layout="stacked"
                                />
                            </Suspense>
                        </div>
                    ) : null}

                    {visualMode === 'none' ? (
                        <div className="px-3 py-4 text-xs leading-5 text-white/50">
                            {locale === 'en'
                                ? '3D fidelity is hidden. Choose Model or Scale to bring the visual back.'
                            : 'A fidelidade 3D esta oculta. Escolha Modelo ou Escala para trazer o visual de volta.'}
                        </div>
                    ) : null}

                    <div className="flex items-center justify-center gap-1 border-t border-white/8 px-3 py-2">
                        <VisualModeButton active={visualMode === 'model'} onClick={() => setVisualMode('model')}>
                            3D
                        </VisualModeButton>
                        <VisualModeButton active={visualMode === 'scale'} onClick={() => setVisualMode('scale')}>
                            {locale === 'en' ? 'Scale' : 'Escala'}
                        </VisualModeButton>
                        <VisualModeButton active={visualMode === 'none'} onClick={() => setVisualMode('none')}>
                            {locale === 'en' ? 'No visual' : 'Sem visual'}
                        </VisualModeButton>
                    </div>
                </div>
            </section>

            <div className="mt-auto flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onOpenTrajectory}
                    disabled={!hasTrajectory && !trajectoryLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-signal-cyan/50 bg-signal-cyan/15 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:bg-signal-cyan/25 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/45"
                >
                    <Route className="size-4" aria-hidden="true" />
                    {trajectoryLoading || hasTrajectory
                        ? t('observatory.panel.actions.trajectory')
                        : t('observatory.panel.actions.trajectoryUnavailable')}
                </button>
                <Link
                    href={approach.detailRoute}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/85 outline-none transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                >
                    <FileText className="size-4" aria-hidden="true" />
                    {t('observatory.panel.actions.dossier')}
                    <ChevronRight className="size-3.5 text-white/55" aria-hidden="true" />
                </Link>
            </div>
        </aside>
    );
}

function VisualModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'rounded-full px-2 py-0.5 text-[10px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-signal-cyan ' +
                (active
                    ? 'bg-signal-cyan/15 text-signal-cyan'
                    : 'text-white/50 hover:bg-white/[0.08] hover:text-white/80')
            }
        >
            {children}
        </button>
    );
}

function Metric({
    label,
    primary,
    secondary,
}: {
    label: string;
    primary: string;
    secondary?: string | null;
}) {
    return (
        <div className="px-3 py-2.5">
            <dt className="text-[10px] uppercase tracking-wide text-white/45">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">{primary}</dd>
            {secondary ? <dd className="text-[11px] text-white/55">{secondary}</dd> : null}
        </div>
    );
}

function Badge({
    tone,
    icon,
    children,
}: {
    tone: 'neutral' | 'hazard' | 'estimated';
    icon?: ReactNode;
    children: ReactNode;
}) {
    const classes = {
        neutral: 'border-white/15 bg-white/[0.04] text-white/65',
        hazard: 'border-signal-coral/45 bg-signal-coral/12 text-signal-coral',
        estimated: 'border-signal-amber/35 bg-signal-amber/10 text-signal-amber',
    }[tone];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${classes}`}>
            {icon}
            {children}
        </span>
    );
}

function hasDiameterRange(approach: UnifiedApproach): boolean {
    return approach.estimatedDiameterMinMeters !== null
        && approach.estimatedDiameterMaxMeters !== null
        && approach.estimatedDiameterMinMeters !== approach.estimatedDiameterMaxMeters;
}

function formatDiameterRange(approach: UnifiedApproach): string {
    const min = approach.estimatedDiameterMinMeters;
    const max = approach.estimatedDiameterMaxMeters;
    if (min !== null && max !== null && min !== max) {
        return `${formatNumber(min, 0)} - ${formatNumber(max, 0)} m`;
    }
    const avg = averageDiameterMeters(approach);
    if (avg !== null) {
        return `${formatNumber(avg, 0)} m`;
    }
    return '-';
}

function formatAstronomicalUnit(distanceKm: number | null, locale: 'pt-BR' | 'en'): string | null {
    if (distanceKm === null) return null;

    const au = distanceKm / ASTRONOMICAL_UNIT_KM;
    const precision = au < 0.1 ? 4 : 3;
    const formatted = formatNumber(au, precision);

    return locale === 'en'
        ? `${formatted} AU`
        : `${formatted} UA`;
}

function formatApproachDate(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '-';

    const normalized = value.replace(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/,
        (month) => EN_MONTH_NUMBER[month] ?? month,
    );
    const match = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2}))?/);

    if (!match) return value;

    const [, year, month, day, hour, minute] = match;
    if (locale === 'en') {
        return `${year}-${month}-${day}${hour ? ` ${hour}:${minute}` : ''}`;
    }

    return `${day}/${month}/${year}${hour ? ` ${hour}:${minute}` : ''}`;
}
