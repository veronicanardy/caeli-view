import { ArrowLeft, Loader2, Route, Ruler } from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { TranslationKey, Translator } from '@/i18n';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import type { AsteroidModelMetadata, AsteroidTrajectory, UnifiedApproach } from '@/types';
import { AsteroidFidelityModel } from '../Presenters/AsteroidFidelityModel';

const AsteroidScaleComparison = lazy(() =>
    import('@/Components/SmallBodies/AsteroidScaleComparison').then((module) => ({ default: module.AsteroidScaleComparison })),
);

type ActiveDetail = 'scale' | 'trajectory';

type Props = {
    activePanel: ActiveDetail;
    approach: UnifiedApproach;
    trajectory: AsteroidTrajectory | null;
    trajectoryLoading: boolean;
    locale: 'pt-BR' | 'en';
    t: Translator;
    model: AsteroidModelMetadata | null;
    modelLoading: boolean;
    onClose: () => void;
};

const MOTION_KEY: Record<NonNullable<AsteroidTrajectory['motionState']>, TranslationKey> = {
    approaching: 'observatory.detail.trajectory.motion.approaching',
    receding: 'observatory.detail.trajectory.motion.receding',
    near_closest: 'observatory.detail.trajectory.motion.near_closest',
    unknown: 'observatory.detail.trajectory.motion.unknown',
};

export function ObservatoryDetailOverlay({
    activePanel,
    approach,
    trajectory,
    trajectoryLoading,
    locale,
    t,
    model,
    modelLoading,
    onClose,
}: Props) {
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const identity = resolveApproachIdentity(approach);
    const title = activePanel === 'scale'
        ? t('observatory.detail.scale.title')
        : t('observatory.detail.trajectory.title');
    const TitleIcon = activePanel === 'scale' ? Ruler : Route;

    return (
        <section
            className="section-slide flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-space-950/65 shadow-glow backdrop-blur"
            role="dialog"
            aria-label={title}
        >
            <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-signal-cyan/85">
                        <TitleIcon className="size-3.5" aria-hidden="true" />
                        {title}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-white">{identity.displayName}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/80 outline-none transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    {t('observatory.detail.back')}
                </button>
            </header>

            <div className="flex-1 overflow-auto p-4">
                {activePanel === 'scale' ? (
                    <div className="space-y-4">
                        <AsteroidFidelityModel
                            approach={approach}
                            model={model}
                            loading={modelLoading}
                            locale={locale}
                        />
                        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />}>
                            <AsteroidScaleComparison
                                diameterMinMeters={approach.estimatedDiameterMinMeters}
                                diameterMaxMeters={approach.estimatedDiameterMaxMeters}
                                diameterAverageMeters={approach.diameterMeters}
                                label={locale === 'en'
                                    ? 'Compare the estimated size with familiar references: a person, a bus, a building, a football field.'
                                    : 'Compare o tamanho estimado com referencias familiares: uma pessoa, um onibus, um predio, um campo de futebol.'}
                                note={t('observatory.panel.scale.note')}
                                layout="default"
                            />
                        </Suspense>
                    </div>
                ) : (
                    <TrajectoryReport
                        trajectory={trajectory}
                        loading={trajectoryLoading}
                        locale={locale}
                        t={t}
                    />
                )}
            </div>
        </section>
    );
}

function TrajectoryReport({
    trajectory,
    loading,
    locale,
    t,
}: {
    trajectory: AsteroidTrajectory | null;
    loading: boolean;
    locale: 'pt-BR' | 'en';
    t: Translator;
}) {
    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-white/65">
                <Loader2 className="size-4 animate-spin text-signal-cyan" aria-hidden="true" />
                {t('observatory.detail.trajectory.loading')}
            </div>
        );
    }

    if (!trajectory || trajectory.status !== 'available') {
        return (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/65">
                <p>{t('observatory.detail.trajectory.unavailable')}</p>
                {trajectory?.note ? <p className="mt-2 text-xs text-white/45">{trajectory.note}</p> : null}
            </div>
        );
    }

    const motion = trajectory.motionState ?? 'unknown';
    const pointsLabel = t('observatory.detail.trajectory.points').replace('{count}', String(trajectory.points.length));

    return (
        <div className="space-y-4 text-sm leading-6 text-white/75">
            <dl className="grid gap-3 sm:grid-cols-2">
                <Field label={t('observatory.detail.trajectory.source')}>{trajectory.source}</Field>
                <Field label={locale === 'en' ? 'Reference center' : 'Centro de referencia'}>{trajectory.center}</Field>
                <Field label={locale === 'en' ? 'Projection' : 'Projecao'}>{trajectory.projection}</Field>
                <Field label={locale === 'en' ? 'Closest approach' : 'Maxima aproximacao'}>
                    {formatIsoToLocal(trajectory.closestApproachTime, locale)}
                </Field>
                <Field label={locale === 'en' ? 'Motion' : 'Movimento'}>{t(MOTION_KEY[motion])}</Field>
                <Field label={locale === 'en' ? 'Ephemeris' : 'Efemeride'}>{pointsLabel}</Field>
            </dl>

            <p className="rounded-lg border border-signal-cyan/20 bg-signal-cyan/10 px-3 py-2 text-xs leading-5 text-white/75">
                {t('observatory.detail.trajectory.legend')}
            </p>

            {trajectory.note ? <p className="text-xs text-white/55">{trajectory.note}</p> : null}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="rounded border border-white/10 bg-space-950/40 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-white/45">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-white">{children}</dd>
        </div>
    );
}

function formatIsoToLocal(value: string, locale: 'pt-BR' | 'en'): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(parsed);
}
