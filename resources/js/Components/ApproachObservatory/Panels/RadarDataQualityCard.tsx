import { AlertTriangle, Clock, Database, Eye, Moon, SatelliteDish, Target } from 'lucide-react';
import type { Translator } from '@/i18n';
import { compactKm, formatNumber, lunarDistanceLabel } from '@/lib/format';
import type { RadarObject } from '@/lib/radarData';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import type { HorizonsFailureKind } from '@/types';

type Props = {
    objects: RadarObject[];
    locale: 'pt-BR' | 'en';
    t: Translator;
};

export function RadarDataQualityCard({ objects, locale, t }: Props) {
    const en = locale === 'en';
    const closest = pickClosest(objects);
    const withinLunar = objects.filter((object) => object.classification === 'within-lunar');
    const withHorizons = objects.filter((object) => object.hasHorizonsPosition).length;
    const symbolic = objects.filter((object) => object.isSymbolicFallback).length;
    const transient = objects.filter((o) => o.horizonsFailureKind === 'horizons_transient').length;
    const noEphemeris = objects.filter((o) => o.horizonsFailureKind === 'no_ephemeris').length;
    const noOrbitalData = objects.filter((o) => o.horizonsFailureKind === 'no_orbital_data').length;

    return (
        <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-3" aria-label={t('observatory.radar.quality.aria')}>
            <Block
                icon={<Target className="size-4" aria-hidden="true" />}
                title={t('observatory.radar.quality.closestTitle')}
            >
                {closest ? (
                    <ClosestObject closest={closest} locale={locale} en={en} t={t} />
                ) : (
                    <p className="text-xs text-white/55">{t('observatory.radar.quality.closestEmpty')}</p>
                )}
            </Block>

            <Block
                icon={<Moon className="size-4" aria-hidden="true" />}
                title={t('observatory.radar.quality.withinLunarTitle')}
            >
                <p className="text-2xl font-semibold text-white">{withinLunar.length}</p>
                {withinLunar.length > 0 ? (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-white/60">
                        {withinLunar.slice(0, 3).map((object) => {
                            const identity = resolveApproachIdentity(object.approach);
                            return (
                                <li key={object.approach.id} className="truncate">{identity.displayName}</li>
                            );
                        })}
                        {withinLunar.length > 3 ? (
                            <li className="text-white/40">
                                {en ? `and ${withinLunar.length - 3} more` : `e mais ${withinLunar.length - 3}`}
                            </li>
                        ) : null}
                    </ul>
                ) : (
                    <p className="mt-1 text-xs text-white/50">{t('observatory.radar.quality.withinLunarEmpty')}</p>
                )}
            </Block>

            <Block
                icon={<Database className="size-4" aria-hidden="true" />}
                title={t('observatory.radar.quality.sourceTitle')}
            >
                <dl className="space-y-1 text-xs text-white/65">
                    <Row icon={<SatelliteDish className="size-3" aria-hidden="true" />} label={t('observatory.radar.quality.withHorizons')} value={withHorizons} />
                    <Row icon={<Eye className="size-3" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic')} value={symbolic} />
                    {transient > 0 ? (
                        <Row icon={<AlertTriangle className="size-3 text-amber-400/80" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.horizons_transient')} value={transient} />
                    ) : null}
                    {noEphemeris > 0 ? (
                        <Row icon={<Clock className="size-3 text-sky-400/80" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.no_ephemeris')} value={noEphemeris} />
                    ) : null}
                    {noOrbitalData > 0 ? (
                        <Row icon={<Eye className="size-3 text-white/40" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.no_orbital_data')} value={noOrbitalData} />
                    ) : null}
                </dl>
                <p className="mt-2 text-[11px] leading-4 text-white/45">{t('observatory.radar.quality.sourceFooter')}</p>
            </Block>
        </section>
    );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded border border-white/8 bg-space-950/45 p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45">
                {icon}
                {title}
            </div>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-white/55">
                {icon}
                {label}
            </dt>
            <dd className="font-medium text-white">{value}</dd>
        </div>
    );
}

function ClosestObject({ closest, locale, en, t }: { closest: RadarObject; locale: 'pt-BR' | 'en'; en: boolean; t: Translator }) {
    const identity = resolveApproachIdentity(closest.approach);
    const approachTime = formatApproachTime(closest.closestApproachTime, locale);
    const lunar = closest.distanceLD;
    const velocity = closest.relativeVelocityKph;

    return (
        <div className="space-y-1.5">
            <p className="truncate text-base font-semibold text-white">{identity.displayName}</p>
            <p className="text-sm text-white/75">
                {compactKm(closest.distanceKm)}
                {lunar !== null ? <span className="text-white/55"> · {lunarDistanceLabel(lunar)}</span> : null}
            </p>
            <p className="text-xs text-white/55">{t('observatory.radar.quality.closestTimeLabel')}: {approachTime}</p>
            {velocity !== null ? (
                <p className="text-xs text-white/55">
                    {en ? 'Velocity' : 'Velocidade'}: {formatNumber(velocity, 0)} km/h
                </p>
            ) : null}
        </div>
    );
}

function pickClosest(objects: RadarObject[]): RadarObject | null {
    let best: RadarObject | null = null;
    for (const object of objects) {
        if (object.distanceKm === null) continue;
        if (!best || (best.distanceKm ?? Infinity) > object.distanceKm) best = object;
    }
    return best;
}

function formatApproachTime(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(parsed);
}
