/**
 * Card de fidelidade visual do pequeno corpo.
 *
 * Exibe metadados já resolvidos e coordena a prévia 3D procedural sem chamar
 * APIs externas, calcular órbitas ou decidir seleção global.
 */
import { Database, Loader2, ShieldCheck } from 'lucide-react';
import { compactMeters, formatNumber } from '@/lib/format';
import type { AsteroidModelMetadata, UnifiedApproach } from '@/types';
import {
    averageDiameter,
    labelForLevel,
    localizedModelNote,
    modelKind,
    seedFrom,
} from './asteroidFidelityPresentation';
import { ProceduralAsteroidPreview } from './ProceduralAsteroidPreview';

type Props = {
    approach: UnifiedApproach;
    model: AsteroidModelMetadata | null;
    loading: boolean;
    locale: 'pt-BR' | 'en';
    compact?: boolean;
    embedded?: boolean;
};

const LEVEL_TONE: Record<AsteroidModelMetadata['fidelityLevel'], string> = {
    N1: 'border-signal-mint/50 bg-signal-mint/10 text-signal-mint',
    N2: 'border-signal-cyan/50 bg-signal-cyan/10 text-signal-cyan',
    N3: 'border-signal-violet/45 bg-signal-violet/10 text-signal-violet',
    N4: 'border-signal-amber/45 bg-signal-amber/10 text-signal-amber',
    N5: 'border-white/15 bg-white/[0.04] text-white/60',
};

export function AsteroidFidelityModel({ approach, model, loading, locale, compact = false, embedded = false }: Props) {
    const en = locale === 'en';
    const diameter = model?.diameterMeters ?? averageDiameter(approach);
    const level = model?.fidelityLevel ?? (diameter !== null ? 'N4' : 'N5');
    const seed = model?.shapeSeed ?? seedFrom(approach.id);
    const source = model?.sourceName ?? (en ? 'Local procedural resolver' : 'Resolvedor procedural local');

    if (compact) {
        return (
            <section className={embedded ? 'overflow-hidden bg-space-950/20' : 'overflow-hidden rounded-lg border border-white/10 bg-space-950/40'}>
                <FidelityHeader level={level} loading={loading} locale={locale} />

                <div className="space-y-3 p-3">
                    <FidelitySource source={source} sourceUrl={model?.sourceUrl} fallbackTone="text-white/55" />

                    <div className="min-h-44">
                        <ProceduralAsteroidPreview seed={seed} level={level} diameter={diameter} compact={false} />
                    </div>

                    <p className="text-[11px] leading-5 text-white/60">
                        {localizedModelNote(model, level, locale)}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                        <FidelityDatum label={en ? 'Diameter' : 'Diâmetro'} value={compactMeters(diameter)} />
                        <FidelityDatum label={en ? 'Kind' : 'Tipo'} value={modelKind(model?.modelKind, locale)} />
                        <FidelityDatum label={en ? 'Confidence' : 'Confiança'} value={model ? `${formatNumber(model.confidence * 100, 0)}%` : '-'} />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={embedded ? 'overflow-hidden bg-space-950/20' : 'overflow-hidden rounded-lg border border-white/10 bg-space-950/40'}>
            <FidelityHeader level={level} loading={loading} locale={locale} />

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-3">
                    <p className="text-sm leading-6 text-white/60">
                        {localizedModelNote(model, level, locale)}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <FidelityDatum label={en ? 'Diameter' : 'Diâmetro'} value={compactMeters(diameter)} />
                        <FidelityDatum label={en ? 'Kind' : 'Tipo'} value={modelKind(model?.modelKind, locale)} />
                        <FidelityDatum label={en ? 'Confidence' : 'Confiança'} value={model ? `${formatNumber(model.confidence * 100, 0)}%` : '-'} />
                    </div>
                    <FidelitySource source={source} sourceUrl={model?.sourceUrl} fallbackTone="text-white/45" />
                </div>

                <div className={compact ? 'min-h-28' : 'min-h-64'}>
                    <ProceduralAsteroidPreview seed={seed} level={level} diameter={diameter} compact={compact} />
                </div>
            </div>
        </section>
    );
}

function FidelityHeader({
    level,
    loading,
    locale,
}: {
    level: AsteroidModelMetadata['fidelityLevel'];
    loading: boolean;
    locale: 'pt-BR' | 'en';
}) {
    const en = locale === 'en';

    return (
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-white/45">
                    {en ? '3D fidelity' : 'Fidelidade 3D'}
                </p>
                <p className="truncate text-xs font-medium text-white/75">
                    {labelForLevel(level, locale)}
                </p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_TONE[level]}`}>
                {loading ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-3" aria-hidden="true" />}
                {level}
            </span>
        </div>
    );
}

function FidelitySource({ source, sourceUrl, fallbackTone }: { source: string; sourceUrl?: string | null; fallbackTone: string }) {
    if (sourceUrl) {
        return (
            <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-cyan outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
            >
                <Database className="size-3" aria-hidden="true" />
                {source}
            </a>
        );
    }

    return (
        <p className={`inline-flex items-center gap-1 text-[11px] ${fallbackTone}`}>
            <Database className="size-3" aria-hidden="true" />
            {source}
        </p>
    );
}

function FidelityDatum({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded border border-white/10 bg-white/[0.025] px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/80">{value}</p>
        </div>
    );
}
