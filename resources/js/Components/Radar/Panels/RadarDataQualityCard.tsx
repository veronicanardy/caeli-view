/**
 * Faixa de insights do radar.
 *
 * Transforma dados de qualidade em leitura interpretativa: objeto do momento,
 * escala de vizinhança da Terra e cobertura do radar. Não altera cálculos ou
 * fontes de dados — apenas reapresenta o que já existe de forma mais narrativa.
 */

import { Radio, SatelliteDish, Telescope } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Translator } from '@/i18n';
import { compactKm, formatNumber, lunarDistanceLabel } from '@/lib/format';
import type { RadarObject } from '@/lib/radarData';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { formatApproachDateTime } from './panelFormatters';

type Props = {
    objects: RadarObject[];
    locale: 'pt-BR' | 'en';
    t: Translator;
};

export function RadarDataQualityCard({ objects, locale, t }: Props) {
    const en = locale === 'en';
    const closest = pickClosest(objects);
    const withinLunar = objects.filter((o) => o.classification === 'within-lunar');
    const withHorizons = objects.filter((o) => o.hasHorizonsPosition).length;
    const symbolic = objects.filter((o) => o.isSymbolicFallback).length;

    return (
        <section
            className="grid gap-px rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden sm:grid-cols-[1fr_1px_1fr_1px_1fr]"
            aria-label={t('observatory.radar.quality.aria')}
        >
            {/* Bloco 1 — Objeto do momento: protagonista da faixa, destaque máximo. */}
            <div className="relative px-5 py-5 sm:px-6 sm:py-6">
                {/* Acento ciano sutil no topo do bloco principal. */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/30 to-transparent" aria-hidden />
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-signal-cyan/70">
                    <Radio className="size-3" aria-hidden="true" />
                    {t('observatory.radar.quality.closestTitle')}
                </div>
                {closest ? (
                    <ClosestObject closest={closest} locale={locale} en={en} t={t} />
                ) : (
                    <p className="text-xs text-white/35">{t('observatory.radar.quality.closestEmpty')}</p>
                )}
            </div>

            <div className="hidden sm:block bg-white/6" aria-hidden />

            {/* Bloco 2 — Quão perto isso está? Interpretação contextualizada. */}
            <div className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/35">
                    <Telescope className="size-3" aria-hidden="true" />
                    {t('observatory.radar.quality.withinLunarTitle')}
                </div>
                <LunarNeighborhoodBlock withinLunar={withinLunar} closest={closest} en={en} t={t} />
            </div>

            <div className="hidden sm:block bg-white/6" aria-hidden />

            {/* Bloco 3 — Cobertura do radar: posição Horizons vs. simbólica. */}
            <div className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/35">
                    <SatelliteDish className="size-3" aria-hidden="true" />
                    {t('observatory.radar.quality.sourceTitle')}
                </div>
                <RadarCoverageBlock withHorizons={withHorizons} symbolic={symbolic} total={objects.length} en={en} t={t} />
            </div>
        </section>
    );
}

function ClosestObject({ closest, locale, en, t }: { closest: RadarObject; locale: 'pt-BR' | 'en'; en: boolean; t: Translator }) {
    const identity = resolveApproachIdentity(closest.approach);
    const approachTime = formatApproachDateTime(closest.closestApproachTime, locale);
    const lunar = closest.distanceLD;
    const velocity = closest.relativeVelocityKph;

    return (
        <div className="space-y-3">
            <p className="truncate text-[14px] font-bold leading-tight tracking-tight text-white">{identity.displayName}</p>
            <div className="flex items-baseline gap-3">
                <span className="text-[26px] font-extralight tabular-nums leading-none tracking-tight text-white">
                    {compactKm(closest.distanceKm)}
                </span>
                {lunar !== null ? (
                    <span className="text-[13px] font-semibold text-signal-cyan/80">{lunarDistanceLabel(lunar)}</span>
                ) : null}
            </div>
            <div className="space-y-1 text-[11px]">
                <p className="text-white/45">{t('observatory.radar.quality.closestTimeLabel')}: <span className="text-white/65">{approachTime}</span></p>
                {velocity !== null ? (
                    <p className="text-white/45">{en ? 'Velocity' : 'Velocidade'}: <span className="text-white/65">{formatNumber(velocity, 0)} km/h</span></p>
                ) : null}
            </div>
        </div>
    );
}

function LunarNeighborhoodBlock({
    withinLunar,
    closest,
    en,
    t,
}: {
    withinLunar: RadarObject[];
    closest: RadarObject | null;
    en: boolean;
    t: Translator;
}) {
    if (withinLunar.length === 0) {
        const closestLd = closest?.distanceLD ?? null;
        const multipleText = closestLd != null && isFinite(closestLd)
            ? en
                ? `The nearest is ${closestLd.toFixed(1)}× the Moon's distance from Earth.`
                : `O mais próximo está a ${closestLd.toFixed(1)}× a distância média Terra–Lua.`
            : null;

        return (
            <div className="space-y-2">
                <p className="text-[12.5px] font-medium leading-snug text-white/60">{t('observatory.radar.quality.withinLunarEmpty')}</p>
                {multipleText ? (
                    <p className="text-[11px] leading-relaxed text-white/35">{multipleText}</p>
                ) : null}
            </div>
        );
    }

    // Com objetos dentro da órbita lunar: lista com leitura interessante.
    return (
        <div className="space-y-2">
            <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-extralight tabular-nums leading-none tracking-tight text-white">{withinLunar.length}</span>
                <span className="text-[12px] font-medium text-signal-cyan/60">
                    {en
                        ? withinLunar.length === 1 ? 'inside lunar orbit' : 'inside lunar orbit'
                        : withinLunar.length === 1 ? 'dentro da órbita lunar' : 'dentro da órbita lunar'}
                </span>
            </div>
            <ul className="space-y-1 text-[11px] text-white/40">
                {withinLunar.slice(0, 3).map((o) => {
                    const identity = resolveApproachIdentity(o.approach);
                    const ld = o.distanceLD;
                    return (
                        <li key={o.approach.id} className="flex items-baseline justify-between gap-2 truncate">
                            <span className="truncate">{identity.displayName}</span>
                            {ld !== null ? (
                                <span className="shrink-0 tabular-nums text-signal-cyan/50">{ld.toFixed(2)} DL</span>
                            ) : null}
                        </li>
                    );
                })}
                {withinLunar.length > 3 ? (
                    <li className="text-white/25">
                        {en ? `and ${withinLunar.length - 3} more` : `e mais ${withinLunar.length - 3}`}
                    </li>
                ) : null}
            </ul>
        </div>
    );
}

function RadarCoverageBlock({
    withHorizons,
    symbolic,
    total,
    en,
    t,
}: {
    withHorizons: number;
    symbolic: number;
    total: number;
    en: boolean;
    t: Translator;
}) {
    const horizonsPercent = total > 0 ? Math.round((withHorizons / total) * 100) : 0;

    return (
        <div className="space-y-3">
            {/* Barra de progresso visual da cobertura Horizons. */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-white/40">{en ? 'Horizons coverage' : 'Cobertura Horizons'}</span>
                    <span className="tabular-nums font-semibold text-white/70">{horizonsPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                        className="h-full rounded-full bg-signal-cyan/55 transition-all duration-500"
                        style={{ width: `${horizonsPercent}%` }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Contadores individuais. */}
            <dl className="space-y-1.5 text-[11.5px]">
                <CoverageRow
                    label={t('observatory.radar.quality.withHorizons')}
                    value={withHorizons}
                    highlight
                />
                <CoverageRow
                    label={t('observatory.radar.quality.symbolic')}
                    value={symbolic}
                />
            </dl>

            {/* Nota interpretativa sobre simbólicos. */}
            {symbolic > 0 ? (
                <p className="text-[10.5px] leading-relaxed text-white/22">{t('observatory.radar.quality.sourceFooter')}</p>
            ) : null}
        </div>
    );
}

function CoverageRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className={`text-white/${highlight ? '45' : '30'}`}>{label}</dt>
            <dd className={`tabular-nums font-semibold ${highlight ? 'text-white/75' : 'text-white/45'}`}>{value}</dd>
        </div>
    );
}

function pickClosest(objects: RadarObject[]): RadarObject | null {
    let best: RadarObject | null = null;
    for (const o of objects) {
        if (o.distanceKm === null) continue;
        if (!best || (best.distanceKm ?? Infinity) > o.distanceKm) best = o;
    }
    return best;
}
