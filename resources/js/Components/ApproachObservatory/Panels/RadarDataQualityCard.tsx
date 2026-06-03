/**
 * Card de qualidade dos dados do radar.
 *
 * Responsabilidade: resumir cobertura Horizons, objetos simbólicos e aproximações
 * próximas a partir de objetos já calculados por camadas superiores.
 */

import { AlertTriangle, Clock, Database, Eye, Moon, SatelliteDish, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Translator } from '@/i18n';
import { compactKm, formatNumber, lunarDistanceLabel } from '@/lib/format';
import type { RadarObject } from '@/lib/radarData';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { formatApproachTime } from './panelFormatters';

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
        /* Container: grade assimétrica — bloco principal maior, secundários discretos. */
        <section
            className="grid gap-px rounded-2xl border border-white/6 bg-white/[0.018] overflow-hidden sm:grid-cols-[1fr_1px_1fr_1px_1fr]"
            aria-label={t('observatory.radar.quality.aria')}
        >
            {/* Bloco 1 — principal: Mais próximo do dia. Ocupa destaque visual. */}
            <div className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="mb-3 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-signal-cyan/50">
                    <Target className="size-3" aria-hidden="true" />
                    {t('observatory.radar.quality.closestTitle')}
                </div>
                {closest ? (
                    <ClosestObject closest={closest} locale={locale} en={en} t={t} />
                ) : (
                    <p className="text-xs text-white/35">{t('observatory.radar.quality.closestEmpty')}</p>
                )}
            </div>

            {/* Divisor vertical — apenas em sm+. */}
            <div className="hidden sm:block bg-white/6" aria-hidden />

            {/* Bloco 2 — secundário: Dentro da órbita lunar. */}
            <div className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="mb-3 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-white/25">
                    <Moon className="size-3" aria-hidden="true" />
                    {t('observatory.radar.quality.withinLunarTitle')}
                </div>
                <p className="text-[32px] font-extralight tabular-nums leading-none tracking-tight text-white/90">{withinLunar.length}</p>
                {withinLunar.length > 0 ? (
                    <ul className="mt-2.5 space-y-1 text-[11.5px] text-white/45">
                        {withinLunar.slice(0, 3).map((object) => {
                            const identity = resolveApproachIdentity(object.approach);
                            return (
                                <li key={object.approach.id} className="truncate">{identity.displayName}</li>
                            );
                        })}
                        {withinLunar.length > 3 ? (
                            <li className="text-white/25">
                                {en ? `and ${withinLunar.length - 3} more` : `e mais ${withinLunar.length - 3}`}
                            </li>
                        ) : null}
                    </ul>
                ) : (
                    <p className="mt-2 text-[12px] text-white/30">{t('observatory.radar.quality.withinLunarEmpty')}</p>
                )}
            </div>

            {/* Divisor vertical — apenas em sm+. */}
            <div className="hidden sm:block bg-white/6" aria-hidden />

            {/* Bloco 3 — terciário: Qualidade dos dados. Menos visual weight. */}
            <div className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="mb-3 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-white/25">
                    <Database className="size-3" aria-hidden="true" />
                    {t('observatory.radar.quality.sourceTitle')}
                </div>
                <dl className="space-y-2 text-[11.5px] text-white/40">
                    <Row icon={<SatelliteDish className="size-3" aria-hidden="true" />} label={t('observatory.radar.quality.withHorizons')} value={withHorizons} />
                    <Row icon={<Eye className="size-3" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic')} value={symbolic} />
                    {transient > 0 ? (
                        <Row icon={<AlertTriangle className="size-3 text-amber-400/60" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.horizons_transient')} value={transient} />
                    ) : null}
                    {noEphemeris > 0 ? (
                        <Row icon={<Clock className="size-3 text-sky-400/60" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.no_ephemeris')} value={noEphemeris} />
                    ) : null}
                    {noOrbitalData > 0 ? (
                        <Row icon={<Eye className="size-3 text-white/25" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.no_orbital_data')} value={noOrbitalData} />
                    ) : null}
                </dl>
                <p className="mt-3 text-[10.5px] leading-relaxed text-white/25">{t('observatory.radar.quality.sourceFooter')}</p>
            </div>
        </section>
    );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-white/50">
                {icon}
                {label}
            </dt>
            <dd className="font-semibold tabular-nums text-white/85">{value}</dd>
        </div>
    );
}

function ClosestObject({ closest, locale, en, t }: { closest: RadarObject; locale: 'pt-BR' | 'en'; en: boolean; t: Translator }) {
    const identity = resolveApproachIdentity(closest.approach);
    const approachTime = formatApproachTime(closest.closestApproachTime, locale);
    const lunar = closest.distanceLD;
    const velocity = closest.relativeVelocityKph;

    return (
        <div className="space-y-2.5">
            {/* Nome: insight principal — maior peso, destaque total. */}
            <p className="truncate text-[16px] font-semibold leading-tight tracking-tight text-white">{identity.displayName}</p>
            {/* Distância: dado mais importante depois do nome. */}
            <div className="flex items-baseline gap-2.5">
                <span className="text-[22px] font-light tabular-nums leading-none tracking-tight text-white/95">
                    {compactKm(closest.distanceKm)}
                </span>
                {lunar !== null ? (
                    <span className="text-[13px] font-medium text-signal-cyan/65">{lunarDistanceLabel(lunar)}</span>
                ) : null}
            </div>
            <div className="space-y-0.5 text-[11px] text-white/30">
                <p>{t('observatory.radar.quality.closestTimeLabel')}: {approachTime}</p>
                {velocity !== null ? (
                    <p>{en ? 'Velocity' : 'Velocidade'}: {formatNumber(velocity, 0)} km/h</p>
                ) : null}
            </div>
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
