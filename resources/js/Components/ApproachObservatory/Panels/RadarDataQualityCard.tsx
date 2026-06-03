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
        /* Container principal: bordas menores, fundo mais leve, sem box pesada. */
        <section
            className="grid gap-2 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-4 sm:grid-cols-3 sm:gap-3"
            aria-label={t('observatory.radar.quality.aria')}
        >
            <Block
                icon={<Target className="size-3.5" aria-hidden="true" />}
                title={t('observatory.radar.quality.closestTitle')}
            >
                {closest ? (
                    <ClosestObject closest={closest} locale={locale} en={en} t={t} />
                ) : (
                    <p className="text-xs text-white/45">{t('observatory.radar.quality.closestEmpty')}</p>
                )}
            </Block>

            <Block
                icon={<Moon className="size-3.5" aria-hidden="true" />}
                title={t('observatory.radar.quality.withinLunarTitle')}
            >
                {/* Número grande em destaque — é o insight principal deste bloco. */}
                <p className="text-[28px] font-light tabular-nums leading-none tracking-tight text-white">{withinLunar.length}</p>
                {withinLunar.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-[12px] text-white/55">
                        {withinLunar.slice(0, 3).map((object) => {
                            const identity = resolveApproachIdentity(object.approach);
                            return (
                                <li key={object.approach.id} className="truncate">{identity.displayName}</li>
                            );
                        })}
                        {withinLunar.length > 3 ? (
                            <li className="text-white/35">
                                {en ? `and ${withinLunar.length - 3} more` : `e mais ${withinLunar.length - 3}`}
                            </li>
                        ) : null}
                    </ul>
                ) : (
                    <p className="mt-1.5 text-[12px] text-white/40">{t('observatory.radar.quality.withinLunarEmpty')}</p>
                )}
            </Block>

            <Block
                icon={<Database className="size-3.5" aria-hidden="true" />}
                title={t('observatory.radar.quality.sourceTitle')}
            >
                <dl className="space-y-1.5 text-[12px] text-white/55">
                    <Row icon={<SatelliteDish className="size-3" aria-hidden="true" />} label={t('observatory.radar.quality.withHorizons')} value={withHorizons} />
                    <Row icon={<Eye className="size-3" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic')} value={symbolic} />
                    {transient > 0 ? (
                        <Row icon={<AlertTriangle className="size-3 text-amber-400/70" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.horizons_transient')} value={transient} />
                    ) : null}
                    {noEphemeris > 0 ? (
                        <Row icon={<Clock className="size-3 text-sky-400/70" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.no_ephemeris')} value={noEphemeris} />
                    ) : null}
                    {noOrbitalData > 0 ? (
                        <Row icon={<Eye className="size-3 text-white/35" aria-hidden="true" />} label={t('observatory.radar.quality.symbolic.no_orbital_data')} value={noOrbitalData} />
                    ) : null}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-white/35">{t('observatory.radar.quality.sourceFooter')}</p>
            </Block>
        </section>
    );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        /* Bloco interno sem borda pesada — usa divisor sutil para separar o label do conteúdo. */
        <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
                {icon}
                {title}
            </div>
            <div>{children}</div>
        </div>
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
        <div className="space-y-2">
            {/* Nome em destaque: fonte semibold, tamanho legível. */}
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-white">{identity.displayName}</p>
            {/* Distância: dado principal — maior e mais presente. */}
            <p className="text-[13px] font-medium text-white/90">
                {compactKm(closest.distanceKm)}
                {lunar !== null ? <span className="ml-1.5 text-[12px] text-signal-cyan/70">{lunarDistanceLabel(lunar)}</span> : null}
            </p>
            <div className="space-y-0.5 text-[11px] text-white/40">
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
