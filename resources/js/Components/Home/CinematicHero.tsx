import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Earth, ExternalLink, Eye, Image, LocateFixed, Moon, Orbit, Satellite, Star } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useHomeAstronomyFeed } from '@/hooks/useHomeAstronomyFeed';
import { useSkyObservation } from '@/hooks/useSkyObservation';
import { locationStatusLabel, useUserLocation } from '@/hooks/useUserLocation';
import { useVisibleObjects } from '@/hooks/useVisibleObjects';
import { useTranslation } from '@/i18n';
import { formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import type { Apod, SpaceNewsHighlight, UnifiedApproach } from '@/types';
import type { VisibleObject } from '@/services/visibleObjectsService';

const CinematicEarthScene = lazy(() =>
    import('./CinematicEarthScene').then((module) => ({ default: module.CinematicEarthScene })),
);
const CinematicSpaceBackdrop = lazy(() =>
    import('./CinematicSpaceBackdrop').then((module) => ({ default: module.CinematicSpaceBackdrop })),
);

const optionCards = [
    {
        href: '/radar',
        icon: Orbit,
        titleKey: 'home.hero.option.observatory.title',
        textKey: 'home.hero.option.observatory.text',
    },
    {
        href: '/epic',
        icon: Earth,
        titleKey: 'home.hero.option.earth.title',
        textKey: 'home.hero.option.earth.text',
    },
    {
        href: '/apod',
        icon: Image,
        titleKey: 'home.hero.option.discovery.title',
        textKey: 'home.hero.option.discovery.text',
    },
] as const;

const STATIC_CURIOSITY = {
    pt: 'A Via Láctea tem aproximadamente 200 bilhões de estrelas e 100 mil anos-luz de diâmetro.',
    en: 'The Milky Way contains approximately 200 billion stars and spans 100,000 light-years.',
};

type Props = {
    apod: Apod | null;
    apodError?: string | null;
    nextApproach?: UnifiedApproach | null;
    spaceNewsHighlight: SpaceNewsHighlight | null;
};

export function CinematicHero({ apod, apodError, nextApproach, spaceNewsHighlight }: Props) {
    const { locale, t } = useTranslation();
    const en = locale === 'en';
    const [optionsOpen, setOptionsOpen] = useState(false);
    const sceneRef = useRef<HTMLElement | null>(null);
    const { location } = useUserLocation(locale);
    const sky = useSkyObservation(location);
    const visible = useVisibleObjects(location);
    const feed = useHomeAstronomyFeed({ apod, apodError: apodError ?? null, nextApproach: nextApproach ?? null, spaceNewsHighlight });
    const approach = feed.data.nextApproach;
    const skySummary = sky.data ? (en ? sky.data.summaryEn : sky.data.summaryPt) : t('home.hero.readingLocalSky');
    const locationLabel = locationStatusLabel(location, en);

    const visibleNowPlanets = useMemo(
        () => visible.objects.filter((o) => o.id !== 'moon' && o.altitude >= 10),
        [visible.objects],
    );
    useEffect(() => {
        if (!optionsOpen) {
            return undefined;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOptionsOpen(false);
            }
        };
        const onPointerDown = (event: PointerEvent) => {
            if (sceneRef.current && !sceneRef.current.contains(event.target as Node)) {
                setOptionsOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('pointerdown', onPointerDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('pointerdown', onPointerDown);
        };
    }, [optionsOpen]);

    return (
        <section ref={sceneRef} className={`home-hero-scene relative min-h-[640px] overflow-hidden border-b border-white/10 lg:min-h-[calc(100vh-5rem)] ${optionsOpen ? 'home-hero-scene-expanded' : ''}`}>
                <div className="home-scene-camera" aria-hidden="true">
                    <div className="home-scene-world">
                        <Suspense fallback={null}>
                            <CinematicSpaceBackdrop />
                        </Suspense>
                        <Suspense fallback={<HeroEarthFallback expanded={optionsOpen} />}>
                            <CinematicEarthScene />
                        </Suspense>
                    </div>
                </div>

                {/* Left-side gradient — anchors the copy and creates depth separation.
                    Two layers stack: a strong linear darkening on the left third (mystery)
                    plus a radial well on the far-left edge so the corner reads as deep space. */}
                <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(2,5,12,0.92)_0%,rgba(3,8,18,0.62)_18%,rgba(3,8,18,0.28)_38%,rgba(3,8,18,0.08)_58%,transparent_78%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_60%_at_0%_55%,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.18)_38%,transparent_70%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,8,18,0.45)_0%,transparent_24%,transparent_74%,rgba(3,8,18,0.55)_100%)]" />
                </div>

                <div className="home-hero-grid relative z-20 mx-auto grid w-full min-h-[640px] max-w-[88rem] gap-10 px-4 pb-12 pt-14 sm:px-6 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[0.85fr_1.25fr] lg:items-center lg:gap-6 lg:px-6 lg:pb-28 xl:px-4">
                    <div className="home-hero-copy max-w-2xl lg:-ml-2 xl:-ml-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-signal-cyan/10 px-3 py-1 text-sm text-signal-cyan backdrop-blur">
                            <Satellite className="size-4" aria-hidden="true" />
                            {t('home.hero.badge')}
                        </div>
                        <h1 className="hero-headline mt-7 text-5xl font-semibold leading-[0.95] text-white sm:text-7xl lg:text-8xl">
                            {t('home.hero.heading')}
                        </h1>
                        <p className="mt-7 max-w-xl text-lg leading-8 text-white/74">
                            {t('home.hero.description')}
                        </p>

                        <div className="relative mt-10 flex flex-wrap items-center gap-3 lg:justify-start">
                            <button
                                type="button"
                                className="home-cta group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-space-950"
                                aria-expanded={optionsOpen}
                                aria-controls="home-options-panel"
                                onClick={() => setOptionsOpen(true)}
                            >
                                <span className="home-cta-ring" aria-hidden="true" />
                                <span className="home-cta-ring home-cta-ring-2" aria-hidden="true" />
                                <span className="home-cta-glow" aria-hidden="true" />
                                <span className="home-cta-body">
                                    <span className="home-cta-label">{t('home.hero.options')}</span>
                                    <span className="home-cta-arrow">
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                    </span>
                                </span>
                            </button>
                        </div>

                        <EditorialQuadCards
                            spaceNews={feed.data.spaceNewsHighlight}
                            apod={feed.data.apod}
                            skySummary={skySummary}
                            seeing={sky.data?.seeing ?? null}
                            cloudCover={sky.data?.cloudCover ?? null}
                            visibleNowPlanets={visibleNowPlanets}
                            moonIllumination={visible.moonIllumination}
                            approach={approach}
                            en={en}
                        />
                    </div>
                </div>

                <OptionsScene open={optionsOpen} onBack={() => setOptionsOpen(false)} />

                <div className="relative z-30 mx-auto max-w-7xl px-4 pb-5 sm:px-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:px-8">
                    <SkyStatusRibbon locationLabel={locationLabel} />
                </div>
            </section>
    );
}

// ─── Editorial Cards (4-card grid) ──────────────────────────────────────────

function EditorialQuadCards({
    spaceNews,
    apod,
    skySummary,
    seeing,
    cloudCover,
    visibleNowPlanets,
    moonIllumination,
    approach,
    en,
}: {
    spaceNews: SpaceNewsHighlight | null;
    apod: Apod | null;
    skySummary: string;
    seeing: string | null;
    cloudCover: number | null;
    visibleNowPlanets: VisibleObject[];
    moonIllumination: number;
    approach: UnifiedApproach | null | undefined;
    en: boolean;
}) {
    const { t } = useTranslation();

    // ── Card 1: Destaque espacial ─────────────────────────────────────
    const highlightTitle = spaceNews?.title ?? (apod?.title ?? null);
    const highlightSource = spaceNews?.source ?? 'NASA APOD';
    const highlightUrl = spaceNews?.url ?? '/apod';
    const highlightFallback = en ? STATIC_CURIOSITY.en : STATIC_CURIOSITY.pt;
    const displayTitle = highlightTitle ?? highlightFallback;
    const highlightDate = spaceNews?.publishedAt
        ? new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(spaceNews.publishedAt))
        : null;

    // ── Card 2: Nota de observação ────────────────────────────────────
    const observationLine = buildObservationNote(skySummary, cloudCover, seeing, visibleNowPlanets, moonIllumination, en);
    const moonLine = en
        ? `Moon ${formatNumber(moonIllumination, 0)}% illuminated`
        : `Lua ${formatNumber(moonIllumination, 0)}% iluminada`;
    const cloudLine = cloudCover !== null
        ? (en ? `Clouds: ${formatNumber(cloudCover, 0)}%` : `Nuvens: ${formatNumber(cloudCover, 0)}%`)
        : null;
    // ── Card 3: Resumo do céu ─────────────────────────────────────────
    const visibilityLabel = formatObservingVisibility(cloudCover, seeing, en);
    const observingConditionLine = en ? `Visibility: ${visibilityLabel}` : `Visibilidade: ${visibilityLabel}`;
    const planetsLine = formatVisiblePlanetsLine(visibleNowPlanets.map((p) => en ? p.nameEn : p.namePt), en);
    // ── Card 4: Próxima aproximação ───────────────────────────────────
    const approachName = approach ? resolveApproachIdentity(approach).displayName : null;
    const approachDate = approach?.approachDate ? formatApproachDate(approach.approachDate, en) : null;
    const approachLunar = approach
        ? lunarDistanceLabel(lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance)
        : null;
    const approachKm = approach?.nominalDistanceKm != null
        ? `${formatNumber(approach.nominalDistanceKm, 0)} km`
        : null;

    return (
        <div className="editorial-quad mt-10 grid gap-2.5" style={{ animationDelay: '280ms' }}>
            {/* Row 1: 2 feature cards */}
            <div className="editorial-quad-row editorial-quad-row-top">
                {/* 1. Destaque espacial */}
                <article className="editorial-card editorial-card-space editorial-card-feature editorial-card-fixed-height">
                    <span className="editorial-card-icon" aria-hidden="true">
                        <Star className="size-4" />
                    </span>
                    <div className="editorial-card-body">
                        <span className="editorial-card-label">{t('home.hero.spaceHighlight')}</span>
                        <h3 className="editorial-card-title editorial-card-title-note">{displayTitle}</h3>
                        <div className="editorial-card-meta">
                            {spaceNews?.url ? (
                                <a
                                    href={highlightUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="editorial-card-source"
                                    aria-label={t('home.hero.openHighlightAria')}
                                >
                                    <span>{highlightSource}</span>
                                    <ExternalLink className="size-3 opacity-80" aria-hidden="true" />
                                </a>
                            ) : (
                                <Link href={highlightUrl} className="editorial-card-source">
                                    <span>{highlightSource}</span>
                                    <ExternalLink className="size-3 opacity-80" aria-hidden="true" />
                                </Link>
                            )}
                            {highlightDate ? <span className="editorial-card-dot" aria-hidden="true">·</span> : null}
                            {highlightDate ? <span className="editorial-card-date">{highlightDate}</span> : null}
                        </div>
                    </div>
                </article>

                {/* 2. Nota de observação — enriquecida com chips */}
                <article className="editorial-card editorial-card-observe editorial-card-feature editorial-card-fixed-height">
                    <span className="editorial-card-icon editorial-card-icon-mint" aria-hidden="true">
                        <Eye className="size-4" />
                    </span>
                    <div className="editorial-card-body">
                        <span className="editorial-card-label">{t('home.hero.observationNote')}</span>
                        <h3 className="editorial-card-title editorial-card-title-note">{observationLine}</h3>
                    </div>
                </article>
            </div>

            {/* Row 2: sky and approach cards */}
            <div className="editorial-quad-row editorial-quad-row-bottom">
                {/* 3. Resumo do céu */}
                <article className="editorial-card editorial-card-data editorial-card-sky">
                    <span className="editorial-card-icon editorial-card-icon-purple" aria-hidden="true">
                        <Moon className="size-4" />
                    </span>
                    <div className="editorial-card-body">
                        <span className="editorial-card-label">{en ? 'Sky summary' : 'Resumo do céu'}</span>
                        <h3 className="editorial-card-title editorial-card-main-value">{moonLine}</h3>
                        <div className="editorial-sky-list">
                            {cloudLine ? <span>{cloudLine}</span> : null}
                            <span>{observingConditionLine}</span>
                            <span>{planetsLine}</span>
                        </div>
                    </div>
                </article>

                {/* 4. Próxima aproximação */}
                <article className="editorial-card editorial-card-data editorial-card-approach">
                    <span className="editorial-card-icon editorial-card-icon-orange" aria-hidden="true">
                        <Orbit className="size-4" />
                    </span>
                    <div className="editorial-card-body">
                        <span className="editorial-card-label">{en ? 'Next approach' : 'Próxima aproximação'}</span>
                        {approachName ? (
                            <>
                                <h3 className="editorial-card-title editorial-card-main-value">{approachName}</h3>
                                <div className="editorial-approach-details">
                                    {approachDate ? <span className="editorial-approach-date">{approachDate}</span> : null}
                                    {approachLunar ? <span className="editorial-approach-item editorial-approach-item-accent">{approachLunar}</span> : null}
                                    {approachKm ? <span className="editorial-approach-item editorial-approach-item-dim">{approachKm}</span> : null}
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="editorial-card-title editorial-card-main-value editorial-card-secondary-dim">
                                    {en ? 'No relevant approach' : 'Sem aproximação relevante'}
                                </h3>
                                <span className="editorial-card-secondary editorial-card-secondary-dim">
                                    {en ? 'No known object poses a risk in the coming hours.' : 'Nenhum objeto monitorado representa risco conhecido nas próximas horas.'}
                                </span>
                            </>
                        )}
                    </div>
                </article>
            </div>
        </div>
    );
}

const GENERIC_SUMMARY_MARKERS = [
    'condições estimadas',
    'estimated observing',
    'aguardando',
    'reading local',
    'lendo condições',
];

function isGenericSummary(text: string): boolean {
    const lower = text.toLowerCase();
    return GENERIC_SUMMARY_MARKERS.some((m) => lower.includes(m));
}

function buildObservationNote(
    skySummary: string,
    cloudCover: number | null,
    seeing: string | null,
    visiblePlanets: VisibleObject[],
    moonIllumination: number,
    en: boolean,
): string {
    if (cloudCover === null && isGenericSummary(skySummary)) {
        return en ? 'Reading local sky conditions…' : 'Lendo condições do céu local…';
    }
    if (cloudCover !== null && cloudCover >= 85) {
        const moonPct = Math.round(moonIllumination);
        const moonVisible = moonPct >= 20;
        if (en) {
            return moonVisible
                ? `Heavy cloud cover. The Moon (${moonPct}% lit) may still appear through gaps, but planets and faint objects will be hard to see.`
                : 'Heavy cloud cover expected. Conditions are unfavorable for observation tonight.';
        }
        return moonVisible
            ? `Céu com muitas nuvens. A Lua (${moonPct}% iluminada) pode aparecer em brechas, mas planetas e objetos fracos tendem a ficar ocultos.`
            : 'Cobertura de nuvens densa. Condições pouco favoráveis para observação esta noite.';
    }
    if (cloudCover !== null && cloudCover >= 50) {
        const planetNames = visiblePlanets.map((p) => en ? p.nameEn : p.namePt);
        if (en) {
            return planetNames.length > 0
                ? `Partly cloudy. The Moon and ${joinReadableList(planetNames, true)} may still be visible through breaks in the clouds.`
                : 'Partly cloudy sky. The Moon may still be visible, but most objects will be harder to observe.';
        }
        return planetNames.length > 0
            ? `Céu parcialmente nublado. A Lua e ${joinReadableList(planetNames, false)} ainda podem aparecer em brechas.`
            : 'Céu parcialmente nublado. A Lua pode aparecer em brechas, mas a maioria dos objetos ficará encoberta.';
    }
    if (cloudCover !== null && cloudCover < 50) {
        if (seeing) {
            const normalized = seeing.toLowerCase();
            const isGood = normalized.includes('ótimo') || normalized.includes('otimo');
            if (isGood) {
                return en
                    ? 'Clear skies with excellent seeing. Great conditions for deep-sky observation.'
                    : 'Céu limpo com excelente estabilidade atmosférica. Ótimas condições para observação.';
            }
        }
        return en
            ? 'Few clouds. Most objects should be visible tonight.'
            : 'Poucas nuvens. A maioria dos objetos deve estar visível esta noite.';
    }
    if (skySummary && !isGenericSummary(skySummary)) {
        return skySummary.charAt(0).toUpperCase() + skySummary.slice(1);
    }
    return en ? 'Reading local sky conditions…' : 'Lendo condições do céu local…';
}

function formatObservingVisibility(cloudCover: number | null, seeing: string | null, en: boolean): string {
    if (cloudCover === null) return en ? 'loading' : 'carregando';
    if (cloudCover >= 85) return en ? 'low' : 'baixa';
    if (cloudCover >= 50) return en ? 'moderate' : 'moderada';
    if (seeing) {
        const normalized = seeing.toLowerCase();
        if (normalized.includes('instável') || normalized.includes('instavel')) return en ? 'unstable' : 'instável';
    }
    return en ? 'good' : 'boa';
}

function formatVisiblePlanetsLine(names: string[], en: boolean): string {
    if (names.length === 0) {
        return en ? 'No planets visible right now' : 'Nenhum planeta visível no momento';
    }

    const list = joinReadableList(names, en);

    if (names.length === 1) {
        return en ? `Planet visible right now: ${list}` : `Planeta visível no momento: ${list}`;
    }

    return en ? `${names.length} planets visible right now: ${list}` : `${names.length} planetas visíveis no momento: ${list}`;
}

function joinReadableList(items: string[], en: boolean): string {
    if (items.length <= 1) {
        return items.join('');
    }

    const conjunction = en ? ' and ' : ' e ';
    return `${items.slice(0, -1).join(', ')}${conjunction}${items[items.length - 1]}`;
}

function OptionsScene({ open, onBack }: { open: boolean; onBack: () => void }) {
    const { t } = useTranslation();
    const backRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (open) {
            backRef.current?.focus({ preventScroll: true });
        }
    }, [open]);

    return (
        <div
            id="home-options-panel"
            className={`home-options-scene ${open ? 'home-options-scene-open' : ''}`}
            aria-hidden={!open}
        >
            <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-signal-cyan">{t('home.hero.optionHint')}</p>
                        <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t('home.hero.optionsTitle')}</h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-white/58">{t('home.hero.optionsDescription')}</p>
                    </div>
                    <button
                        ref={backRef}
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 py-2.5 text-sm font-semibold text-white/82 backdrop-blur transition hover:border-signal-cyan/35 hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        onClick={onBack}
                        tabIndex={open ? 0 : -1}
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        {t('home.hero.back')}
                    </button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {optionCards.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch
                                className="home-option-card group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                style={{ transitionDelay: open ? `${180 + index * 130}ms` : '0ms' }}
                                tabIndex={open ? 0 : -1}
                            >
                                <span className="home-option-card-icon inline-flex size-12 items-center justify-center rounded-full border border-signal-cyan/25 bg-signal-cyan/12 text-signal-cyan">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <span className="mt-6 flex items-center gap-2 text-lg font-semibold text-white">
                                    {t(item.titleKey)}
                                    <ArrowRight className="home-option-card-arrow ml-auto size-4 text-white/36" aria-hidden="true" />
                                </span>
                                <span className="mt-3 block text-sm leading-6 text-white/62">{t(item.textKey)}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}


function SkyStatusRibbon({ locationLabel }: { locationLabel: string }) {
    const { t, locale } = useTranslation();
    const en = locale === 'en';
    const prefix = en ? 'Local observation based on' : 'Observação local baseada em';

    return (
        <div className="sky-status-ribbon" aria-label={t('home.hero.statusRibbonLabel')}>
            <div className="sky-status-chip sky-status-chip-highlight sky-status-location-only">
                <LocateFixed className="size-3.5" aria-hidden="true" />
                <span className="sky-status-ribbon-prefix">{prefix}</span>
                <strong>{locationLabel}</strong>
            </div>
        </div>
    );
}

function HeroEarthFallback({ expanded: _expanded = false }: { expanded?: boolean }) {
    return (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
            <div className="cinematic-earth-shell absolute right-0 top-1/2 aspect-square -translate-y-1/2 translate-x-[18%] opacity-100 md:translate-x-[2%] lg:translate-x-[-14%] xl:translate-x-[-18%] 2xl:translate-x-[-20%]">
                <div className="earth-loading-spinner absolute inset-0 rounded-full" />
            </div>
        </div>
    );
}



function formatApproachDate(value: string, en: boolean): string {
    try {
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    } catch {
        return value;
    }
}
