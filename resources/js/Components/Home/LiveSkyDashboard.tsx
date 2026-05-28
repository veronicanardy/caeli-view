import { Link } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { AlertCircle, Cloud, CloudRain, Compass, ExternalLink, Eye, LocateFixed, Moon, Sparkles, Star, Telescope, Wind } from 'lucide-react';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { useHomeAstronomyFeed } from '@/hooks/useHomeAstronomyFeed';
import { useTranslation } from '@/i18n';
import { useSkyObservation } from '@/hooks/useSkyObservation';
import { locationStatusLabel } from '@/hooks/useUserLocation';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useVisibleObjects } from '@/hooks/useVisibleObjects';
import { compactKm, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import type { Apod, UnifiedApproach } from '@/types';

type CardIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

type Props = {
    apod: Apod | null;
    apodError?: string | null;
    nextApproach?: UnifiedApproach | null;
};

export function LiveSkyDashboard({ apod, apodError, nextApproach }: Props) {
    const { locale } = useTranslation();
    const { location, requestLocation } = useUserLocation(locale);
    const sky = useSkyObservation(location);
    const visible = useVisibleObjects(location);
    const feed = useHomeAstronomyFeed({ apod, apodError: apodError ?? null, nextApproach: nextApproach ?? null, spaceNewsHighlight: null });
    const en = locale === 'en';
    const locationLabel = locationStatusLabel(location, en);
    const tip = observationTip(sky.data?.cloudCover, visible.moonIllumination, visible.favorable, en);

    return (
        <section className="border-b border-white/10 bg-space-950">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.26em] text-signal-cyan">{en ? 'Live observatory' : 'Observatório vivo'}</p>
                        <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{en ? 'Your sky, right now' : 'Seu céu, agora'}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                            {en
                                ? 'Local weather, astronomical visibility, NASA highlights, and near-Earth activity in one calm control room.'
                                : 'Clima local, visibilidade astronômica, destaque da NASA e atividade próxima da Terra em uma central única.'}
                        </p>
                    </div>
                    <button
                        className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/75 transition hover:border-signal-cyan/40 hover:text-white"
                        type="button"
                        onClick={requestLocation}
                    >
                        <LocateFixed className="size-4 text-signal-cyan" aria-hidden="true" />
                        {location.source === 'browser' ? locationLabel : (en ? 'Use my location' : 'Usar minha localização')}
                    </button>
                </div>

                <div className="mt-8 grid gap-5 lg:grid-cols-12">
                    <LocalSkyCard
                        loading={sky.loading}
                        error={sky.error}
                        message={location.error ?? null}
                        status={location.status}
                        locationLabel={locationLabel}
                        cloudCover={sky.data?.cloudCover ?? null}
                        precipitation={sky.data?.precipitationProbability ?? null}
                        temperature={sky.data?.temperature ?? null}
                        wind={sky.data?.windSpeed ?? null}
                        seeing={sky.data?.seeing ?? null}
                        transparency={sky.data?.transparency ?? null}
                        summary={en ? sky.data?.summaryEn : sky.data?.summaryPt}
                        source={sky.data?.source}
                        en={en}
                    />
                    <VisibleObjectsCard objects={visible.objects} moonIllumination={visible.moonIllumination} en={en} />
                    <AstronomyHighlightCard apod={feed.data.apod} apodError={feed.data.apodError} loading={feed.loading} en={en} />
                    <ObservationTipCard tip={tip} en={en} />
                    <NearApproachCard approach={feed.data.nextApproach} loading={feed.loading} en={en} />
                </div>
            </div>
        </section>
    );
}

function LocalSkyCard({
    loading,
    error,
    message,
    status,
    locationLabel,
    cloudCover,
    precipitation,
    temperature,
    wind,
    seeing,
    transparency,
    summary,
    source,
    en,
}: {
    loading: boolean;
    error: string | null;
    message: string | null;
    status: string;
    locationLabel: string;
    cloudCover: number | null;
    precipitation: number | null;
    temperature: number | null;
    wind: number | null;
    seeing: string | null;
    transparency: string | null;
    summary?: string;
    source?: string;
    en: boolean;
}) {
    return (
        <article className="home-glass-card lg:col-span-5">
            <CardHeader icon={Cloud} title={en ? 'Sky in your location' : 'Céu no seu local'} eyebrow={locationLabel} />
            {loading ? <SkeletonRows rows={4} /> : (
                <>
                    <p className="mt-5 text-xl font-semibold text-white">{summary ?? (en ? 'Estimated observing conditions.' : 'Condições estimadas para observação.')}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Metric icon={Cloud} label={en ? 'Clouds' : 'Nuvens'} value={percent(cloudCover)} />
                        <Metric icon={CloudRain} label={en ? 'Rain chance' : 'Chance de chuva'} value={percent(precipitation)} />
                        <Metric icon={Sparkles} label={en ? 'Transparency' : 'Transparência'} value={transparency ?? (en ? 'unknown' : 'não informada')} />
                        <Metric icon={Wind} label={en ? 'Wind' : 'Vento'} value={wind !== null ? `${formatNumber(wind, 0)} km/h` : (en ? 'Unavailable' : 'Indisponível')} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/45">
                        {temperature !== null ? <span>{formatNumber(temperature, 0)} °C</span> : null}
                        {seeing ? <span>{en ? 'Seeing' : 'Seeing'}: {seeing}</span> : null}
                        <span>{source && source !== 'fallback' ? source : 'Open-Meteo'}</span>
                    </div>
                    {(message || error || status === 'denied' || status === 'timeout' || status === 'unsupported' || status === 'error') ? (
                        <p className="mt-4 flex items-start gap-2 rounded border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-white/55">
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-signal-amber" aria-hidden="true" />
                            {error ?? message ?? (en ? 'Location was not obtained.' : 'A localização não foi obtida.')}
                        </p>
                    ) : null}
                </>
            )}
        </article>
    );
}

function VisibleObjectsCard({ objects, moonIllumination, en }: { objects: ReturnType<typeof useVisibleObjects>['objects']; moonIllumination: number; en: boolean }) {
    const listed = objects.slice(0, 5);

    return (
        <article className="home-glass-card lg:col-span-4">
            <CardHeader icon={Telescope} title={en ? 'Visible objects today' : 'Objetos visíveis hoje'} eyebrow={en ? 'Calculated locally' : 'Calculado localmente'} />
            <div className="mt-5 space-y-3">
                {listed.map((object) => (
                    <div key={object.id} className="flex items-center justify-between gap-4 rounded border border-white/10 bg-space-950/35 px-3 py-2">
                        <div className="flex items-center gap-3">
                            <span className="flex size-8 items-center justify-center rounded-full bg-signal-cyan/10 text-base text-signal-cyan">{object.symbol}</span>
                            <div>
                                <p className="text-sm font-semibold text-white">{en ? object.nameEn : object.namePt}</p>
                                <p className="text-xs text-white/45">{en ? object.detailEn : object.detailPt}</p>
                            </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${object.visible ? 'bg-signal-mint/10 text-signal-mint' : 'bg-white/[0.06] text-white/45'}`}>
                            {en ? object.statusEn : object.statusPt}
                        </span>
                    </div>
                ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-white/50">
                <Moon className="size-3.5 text-signal-cyan" aria-hidden="true" />
                {en ? `Moon illumination: ${moonIllumination}%` : `Iluminação da Lua: ${moonIllumination}%`}
            </p>
        </article>
    );
}

function AstronomyHighlightCard({ apod, apodError, loading, en }: { apod: Apod | null; apodError?: string | null; loading: boolean; en: boolean }) {
    const hasImage = apod?.isImage && apod.displayUrl;

    return (
        <article className="home-glass-card overflow-hidden p-0 lg:col-span-3">
            {hasImage ? (
                <img className="h-40 w-full object-cover" src={apod.displayUrl ?? ''} alt={apod.title} loading="lazy" />
            ) : (
                <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(84,214,214,0.18),transparent_15rem)]">
                    <Star className="size-10 text-signal-cyan" aria-hidden="true" />
                </div>
            )}
            <div className="p-5">
                <CardHeader icon={Star} title={en ? 'Astronomy highlight' : 'Destaque astronômico'} eyebrow={apod?.date ?? 'NASA APOD'} compact />
                {loading ? <SkeletonRows rows={3} /> : (
                    <>
                        <h3 className="mt-4 line-clamp-2 text-lg font-semibold text-white">{apod?.title ?? (en ? 'Cosmic curiosity' : 'Curiosidade astronômica')}</h3>
                        <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/60">
                            {apod?.explanation ?? (en
                                ? 'Most known asteroids orbit the Sun in the belt between Mars and Jupiter.'
                                : 'A maioria dos asteroides conhecidos orbita o Sol no cinturão entre Marte e Júpiter.')}
                        </p>
                        {apodError ? <p className="mt-3 text-xs text-signal-amber">{en ? 'NASA highlight unavailable; showing local fallback.' : 'Destaque da NASA indisponível; exibindo fallback local.'}</p> : null}
                        <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-signal-cyan" href="/apod" prefetch>
                            {en ? 'Open highlight' : 'Abrir destaque'}
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                        </Link>
                    </>
                )}
            </div>
        </article>
    );
}

function ObservationTipCard({ tip, en }: { tip: string; en: boolean }) {
    return (
        <article className="home-glass-card lg:col-span-5">
            <CardHeader icon={Eye} title={en ? 'Observation tip' : 'Dica de observação'} eyebrow={en ? 'Simple reading' : 'Leitura simples'} />
            <p className="mt-5 text-lg leading-7 text-white/78">{tip}</p>
        </article>
    );
}

function NearApproachCard({ approach, loading, en }: { approach?: UnifiedApproach | null; loading: boolean; en: boolean }) {
    const identity = approach ? resolveApproachIdentity(approach) : null;

    return (
        <article className="home-glass-card lg:col-span-7">
            <CardHeader icon={Compass} title={en ? 'Next relevant approach' : 'Próxima aproximação relevante'} eyebrow="NeoWs + JPL" />
            {loading ? <SkeletonRows rows={3} /> : null}
            {!loading && approach ? (
                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                        <h3 className="text-2xl font-semibold text-white">{identity?.displayName ?? approach.name}</h3>
                        {identity?.subtitle ? <p className="mt-1 text-xs text-white/50">{identity.subtitle}</p> : null}
                        <p className="mt-2 text-sm text-white/55">{approach.approachDate ?? (en ? 'No date' : 'Sem data')}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-white/60">{compactKm(approach.nominalDistanceKm)}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-white/60">{lunarDistanceLabel(lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance)}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-white/60">{formatNumber(approach.relativeVelocityKms, 1)} km/s</span>
                            <span className={`rounded-full px-3 py-1 ${approach.hazardFlag ? 'bg-signal-coral/10 text-signal-coral' : 'bg-signal-mint/10 text-signal-mint'}`}>
                                {approach.hazardFlag ? (en ? 'Technical attention' : 'Atenção técnica') : (en ? 'Low visual risk' : 'Risco visual baixo')}
                            </span>
                        </div>
                    </div>
                    <Link className="light-button inline-flex items-center justify-center gap-2 rounded bg-signal-cyan px-4 py-2 text-sm font-semibold text-space-950" href={approach.detailRoute} prefetch>
                        {en ? 'View details' : 'Ver detalhes'}
                    </Link>
                </div>
            ) : null}
            {!loading && !approach ? (
                <p className="mt-5 text-sm leading-6 text-white/60">{en ? 'Approach data is not available right now, but the observatory remains ready.' : 'Os dados de aproximação não estão disponíveis agora, mas o observatório continua pronto.'}</p>
            ) : null}
        </article>
    );
}

function CardHeader({ icon: Icon, title, eyebrow, compact = false }: { icon: CardIcon; title: string; eyebrow: string; compact?: boolean }) {
    return (
        <div className="flex items-start gap-3">
            <span className={`${compact ? 'size-8' : 'size-10'} flex shrink-0 items-center justify-center rounded bg-signal-cyan/10 text-signal-cyan`}>
                <Icon className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />
            </span>
            <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">{eyebrow}</p>
                <h3 className={`${compact ? 'text-base' : 'text-lg'} mt-1 font-semibold text-white`}>{title}</h3>
            </div>
        </div>
    );
}

function Metric({ icon: Icon, label, value }: { icon: CardIcon; label: string; value: string }) {
    return (
        <div className="rounded border border-white/10 bg-space-950/35 p-3">
            <p className="flex items-center gap-2 text-xs text-white/45">
                <Icon className="size-3.5 text-signal-cyan" aria-hidden="true" />
                {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{value}</p>
        </div>
    );
}

function SkeletonRows({ rows }: { rows: number }) {
    return (
        <div className="mt-5 space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-white/[0.055]" />
            ))}
        </div>
    );
}

function percent(value: number | null): string {
    return value !== null ? `${formatNumber(value, 0)}%` : '—';
}

function observationTip(cloudCover: number | null | undefined, moonIllumination: number, favorable: ReturnType<typeof useVisibleObjects>['favorable'], en: boolean): string {
    const planet = favorable.find((object) => object.id !== 'moon');

    if (cloudCover !== null && cloudCover !== undefined && cloudCover > 70) {
        return en
            ? 'Clouds may make observing difficult tonight. Try checking again later.'
            : 'Muitas nuvens podem atrapalhar a observação hoje. Tente conferir novamente mais tarde.';
    }

    if ((cloudCover ?? 100) < 35 && moonIllumination < 45) {
        return en
            ? 'The sky looks promising and the Moon is not too bright. A good setup for stars and fainter objects.'
            : 'O céu parece promissor e a Lua não está muito brilhante. Boa configuração para estrelas e objetos mais fracos.';
    }

    if ((cloudCover ?? 100) < 45 && planet) {
        return en
            ? `${planet.nameEn} has favorable visibility. Bright planets are good targets even with some moonlight.`
            : `${planet.namePt} está com visibilidade favorável. Planetas brilhantes são bons alvos mesmo com alguma luz da Lua.`;
    }

    if (moonIllumination > 70) {
        return en
            ? 'The Moon is bright and may wash out faint stars, but planets and lunar details remain good targets.'
            : 'A Lua está brilhante e pode apagar estrelas fracas, mas planetas e detalhes lunares continuam bons alvos.';
    }

    return en
        ? 'Start with the Moon and bright planets. They are the easiest way to read tonight sky.'
        : 'Comece pela Lua e pelos planetas brilhantes. Eles são o jeito mais fácil de ler o céu de hoje.';
}
