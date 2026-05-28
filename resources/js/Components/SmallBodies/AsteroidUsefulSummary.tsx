import { BadgeInfo, CalendarClock, Gauge, Moon, Ruler, ShieldAlert, Sparkles, Telescope } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { compactKm, compactMeters, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { SmallBody, SmallBodyCloseApproach } from '@/types';

type Props = {
    smallBody: SmallBody;
    approach: SmallBodyCloseApproach | null;
    source?: string | null;
    diameterMinMeters: number | null;
    diameterMaxMeters: number | null;
    diameterAverageMeters: number | null;
};

export function AsteroidUsefulSummary({
    smallBody,
    approach,
    source,
    diameterMinMeters,
    diameterMaxMeters,
    diameterAverageMeters,
}: Props) {
    const { locale } = useTranslation();
    const lunarDistance = lunarDistanceFromKm(approach?.distanceKm) ?? approach?.distanceLunar ?? null;
    const isNeo = isNearEarthObject(smallBody);

    const rows = [
        {
            icon: BadgeInfo,
            label: locale === 'en' ? 'Name/designation' : 'Nome/designação',
            value: smallBody.primaryName,
            detail: smallBody.designation ?? smallBody.spkId ?? (locale === 'en' ? 'Secondary identifier not returned' : 'Identificador secundário não retornado'),
        },
        {
            icon: ShieldAlert,
            label: locale === 'en' ? 'Type' : 'Tipo',
            value: objectTypeLabel(smallBody, locale),
            detail: isNeo
                ? (locale === 'en' ? 'Tracked as a near-Earth object by orbital context.' : 'Monitorado como objeto próximo da Terra pelo contexto orbital.')
                : (locale === 'en' ? 'The lookup did not clearly mark it as NEO.' : 'A consulta não marcou claramente como NEO.'),
        },
        {
            icon: Ruler,
            label: locale === 'en' ? 'Estimated diameter' : 'Diâmetro estimado',
            value: `${compactMeters(diameterMinMeters)} - ${compactMeters(diameterMaxMeters)}`,
            detail: `${locale === 'en' ? 'Approximate average' : 'Média aproximada'}: ${compactMeters(diameterAverageMeters)}`,
        },
        {
            icon: Gauge,
            label: locale === 'en' ? 'Relative velocity' : 'Velocidade relativa',
            value: `${formatNumber(approach?.relativeVelocityKmS, 2)} km/s`,
            detail: locale === 'en'
                ? `${formatNumber(approach?.relativeVelocityKmH, 0)} km/h on the selected approach`
                : `${formatNumber(approach?.relativeVelocityKmH, 0)} km/h na aproximação selecionada`,
        },
        {
            icon: Moon,
            label: locale === 'en' ? 'Minimum Earth distance' : 'Distância mínima da Terra',
            value: compactKm(approach?.distanceKm),
            detail: lunarDistanceLabel(lunarDistance),
        },
        {
            icon: CalendarClock,
            label: locale === 'en' ? 'Approach date/time' : 'Data/hora da aproximação',
            value: approach?.date ?? (locale === 'en' ? 'No date' : 'Sem data'),
            detail: approachMoment(approach, locale),
        },
        {
            icon: Sparkles,
            label: locale === 'en' ? 'Absolute magnitude' : 'Magnitude absoluta',
            value: formatNumber(smallBody.absoluteMagnitude, 2),
            detail: locale === 'en'
                ? 'The lower the number, the brighter the object would be under standardized conditions.'
                : 'Quanto menor o número, mais brilhante o objeto seria em condições padronizadas.',
        },
        {
            icon: Telescope,
            label: locale === 'en' ? 'Data source' : 'Fonte dos dados',
            value: source ?? 'NASA/JPL Small-Body Database API',
            detail: locale === 'en' ? 'Physical and orbital data queried from JPL/SBDB.' : 'Dados físicos e orbitais consultados no JPL/SBDB.',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => {
                const Icon = row.icon;

                return (
                    <article key={row.label} className="card-enter rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-white/58">{row.label}</p>
                            <Icon className="size-4 text-signal-cyan" aria-hidden="true" />
                        </div>
                        <p className="mt-3 break-words text-lg font-semibold text-white">{row.value}</p>
                        <p className="mt-2 text-xs leading-5 text-white/45">{row.detail}</p>
                    </article>
                );
            })}
        </div>
    );
}

function objectTypeLabel(smallBody: SmallBody, locale: string): string {
    const type = smallBody.objectType === 'comet'
        ? (locale === 'en' ? 'Comet' : 'Cometa')
        : smallBody.objectType === 'asteroid'
            ? (locale === 'en' ? 'Asteroid' : 'Asteroide')
            : (locale === 'en' ? 'Small body' : 'Pequeno corpo');
    const neo = isNearEarthObject(smallBody) ? ' / NEO' : '';

    return `${type}${neo}`;
}

function isNearEarthObject(smallBody: SmallBody): boolean {
    const code = (smallBody.orbitClass ?? '').toUpperCase();
    const description = (smallBody.orbitClassDescription ?? '').toLowerCase();

    return ['ATE', 'APO', 'AMO', 'IEO'].includes(code) || description.includes('near-earth');
}

function approachMoment(approach: SmallBodyCloseApproach | null, locale: string): string {
    if (!approach?.date) {
        return locale === 'en' ? 'Not enough date data to classify.' : 'Sem data suficiente para classificar.';
    }

    const past = new Date(approach.date.replace(/-/g, ' ')).getTime() < Date.now();

    if (locale === 'en') {
        return past ? 'Past approach' : 'Future approach';
    }

    return past ? 'Aproximação passada' : 'Aproximação futura';
}
