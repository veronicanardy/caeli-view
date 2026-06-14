/**
 * Responsabilidade: hero "horizonte orbital" da Home.
 *
 * Orquestra a cena de entrada do CaeliView: backdrop espacial e horizonte
 * da Terra (lazy), bloco editorial centralizado (badge, título, descrição,
 * CTA), o console de observação com quatro módulos vivos (céu esta noite,
 * dados do céu, próxima aproximação, destaque espacial; dados locais primeiro,
 * link externo por último) e localização integrada, e a cena de opções
 * pós-CTA. Frases derivadas das condições do céu vêm de heroSkyCopy.ts.
 */

import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Earth, ExternalLink, Eye, Image, Moon, Orbit, Satellite, Star } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useHomeAstronomyFeed } from '@/hooks/useHomeAstronomyFeed';
import { useSkyObservation } from '@/hooks/useSkyObservation';
import { locationStatusLabel, useUserLocation } from '@/hooks/useUserLocation';
import { useVisibleObjects } from '@/hooks/useVisibleObjects';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import {
    buildObservationNote,
    formatApproachDate,
    formatObservingVisibility,
    formatVisiblePlanetsLine,
    moonPhaseLabel,
} from './heroSkyCopy';
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
        <section ref={sceneRef} className={`home-hero-scene relative flex min-h-[660px] flex-col overflow-hidden border-b border-white/10 lg:min-h-[calc(100vh-5rem)] ${optionsOpen ? 'home-hero-scene-expanded' : ''}`}>
                <Suspense fallback={null}>
                    <CinematicSpaceBackdrop />
                </Suspense>
                <Suspense fallback={<HeroEarthFallback />}>
                    <CinematicEarthScene />
                </Suspense>
                <div className="home-earth-cinematic-grade pointer-events-none absolute inset-0 z-[11]" aria-hidden="true" />

                {/* Vignette: separa a navbar do céu e cria um poço suave atrás do
                    bloco editorial central, sem escurecer o horizonte embaixo. */}
                <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,5,12,0.6)_0%,rgba(3,8,18,0.18)_16%,transparent_30%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_56%_40%_at_50%_38%,rgba(2,6,14,0.5)_0%,rgba(2,6,14,0.22)_55%,transparent_78%)]" />
                </div>

                {/* Glint quente acima do lado iluminado do horizonte */}
                <div className="home-warm-glint pointer-events-none absolute inset-0 z-[8]" aria-hidden="true" />
                <div className="home-cinematic-sunrise pointer-events-none absolute inset-0 z-[8]" aria-hidden="true">
                    <span className="home-cinematic-sunrise-bloom" />
                    <span className="home-cinematic-sunrise-atmosphere" />
                    <span className="home-cinematic-sunrise-corona" />
                    <span className="home-cinematic-sunrise-core" />
                </div>

                <div className="home-hero-copy relative z-20 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-[clamp(3.25rem,7.2vh,5.35rem)] text-center sm:px-6">
                    <div className="home-hero-badge hero-rise inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-signal-cyan/10 px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-signal-cyan backdrop-blur">
                        <Satellite className="size-3.5" aria-hidden="true" />
                        {t('home.hero.badge')}
                    </div>
                    <h1 className="hero-headline hero-rise hero-rise-2 mt-5 text-6xl font-semibold leading-[0.94] sm:text-7xl lg:text-8xl">
                        {t('home.hero.heading')}
                    </h1>
                    <p className="home-hero-description hero-rise hero-rise-3 mt-5 max-w-2xl text-balance text-lg leading-8 text-white/76">{t('home.hero.description')}</p>
                    <p className="home-hero-source hero-rise hero-rise-3 mt-3 max-w-2xl text-balance text-[0.68rem] font-semibold uppercase leading-5 tracking-[0.18em] text-white/42">
                        {t('home.hero.sources')}
                    </p>

                    <div className="hero-rise hero-rise-4 relative mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
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
                        <Link href="/radar" prefetch className="home-cta-secondary">
                            {en ? 'Go straight to Radar' : 'Ir direto ao Radar'}
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>

                <OptionsScene open={optionsOpen} onBack={() => setOptionsOpen(false)} />

                <div className="home-console-wrap relative z-20 mx-auto mt-auto w-full max-w-5xl px-4 pb-[clamp(0.9rem,2.6vh,1.9rem)] pt-6 sm:px-6">
                    <ObservatoryConsole
                        spaceNews={feed.data.spaceNewsHighlight}
                        apod={feed.data.apod}
                        skySummary={skySummary}
                        seeing={sky.data?.seeing ?? null}
                        cloudCover={sky.data?.cloudCover ?? null}
                        visibleNowPlanets={visibleNowPlanets}
                        moonIllumination={visible.moonIllumination}
                        approach={approach}
                        locationLabel={locationLabel}
                        en={en}
                    />
                </div>
            </section>
    );
}

// ─── Console de observação (painel sob o horizonte) ─────────────────────────

/**
 * Spotlight que segue o ponteiro dentro das células do console.
 *
 * Um único listener no container atualiza, com throttle por rAF, as CSS vars
 * --spot-x/--spot-y da célula sob o cursor; o brilho em si é um span com
 * radial-gradient revelado no hover. Sem re-render React e desligado em
 * dispositivos sem hover (touch).
 */
function useCardSpotlight() {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;
        if (window.matchMedia('(hover: none)').matches) return undefined;

        let raf = 0;
        const onPointerMove = (event: PointerEvent) => {
            const cell = (event.target as HTMLElement | null)?.closest?.('.console-cell') as HTMLElement | null;
            if (!cell || raf) return;
            raf = window.requestAnimationFrame(() => {
                raf = 0;
                const rect = cell.getBoundingClientRect();
                cell.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
                cell.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
            });
        };

        container.addEventListener('pointermove', onPointerMove, { passive: true });
        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            if (raf) window.cancelAnimationFrame(raf);
        };
    }, []);

    return containerRef;
}

function ObservatoryConsole({
    spaceNews,
    apod,
    skySummary,
    seeing,
    cloudCover,
    visibleNowPlanets,
    moonIllumination,
    approach,
    locationLabel,
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
    locationLabel: string;
    en: boolean;
}) {
    const { t } = useTranslation();
    const gridRef = useCardSpotlight();

    // ── Célula 1: Destaque espacial ───────────────────────────────────
    const highlightTitle = spaceNews?.title ?? (apod?.title ?? null);
    const highlightSource = spaceNews?.source ?? 'NASA APOD';
    const highlightUrl = spaceNews?.url ?? '/apod';
    const highlightFallback = en ? STATIC_CURIOSITY.en : STATIC_CURIOSITY.pt;
    const displayTitle = highlightTitle ?? highlightFallback;
    const highlightDate = spaceNews?.publishedAt
        ? new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(spaceNews.publishedAt))
        : null;

    // ── Célula 2: Céu esta noite ──────────────────────────────────────
    const observationLine = buildObservationNote(skySummary, cloudCover, seeing, visibleNowPlanets, moonIllumination, en);
    const moonPhaseLine = moonPhaseLabel(moonIllumination, en);
    const cloudLine = cloudCover !== null
        ? (en ? `Clouds: ${formatNumber(cloudCover, 0)}%` : `Nuvens: ${formatNumber(cloudCover, 0)}%`)
        : null;
    const visibilityLabel = formatObservingVisibility(cloudCover, seeing, en);
    const observingConditionLine = en ? `Visibility: ${visibilityLabel}` : `Visibilidade: ${visibilityLabel}`;
    const planetsLine = formatVisiblePlanetsLine(visibleNowPlanets.map((p) => en ? p.nameEn : p.namePt), en);
    // ── Célula 4: Próxima aproximação ─────────────────────────────────
    const approachName = approach ? resolveApproachIdentity(approach).displayName : null;
    const approachDate = approach?.approachDate ? formatApproachDate(approach.approachDate, en) : null;
    const approachKm = approach?.nominalDistanceKm != null
        ? `${formatNumber(approach.nominalDistanceKm, 0)} km`
        : null;

    return (
        <div className="hero-rise hero-rise-5">
            <section className="observatory-console" aria-label={t('home.hero.statusRibbonLabel')}>
                <header className="console-header">
                    <span className="console-header-title">{en ? 'Radar live feed' : 'Feed do Radar ao vivo'}</span>
                    <span className="console-header-location">
                        <span className="sky-status-pulse" aria-hidden="true" />
                        <span className="console-header-prefix">{en ? 'Local observation based on' : 'Observação local baseada em'}</span>
                        <strong>{locationLabel}</strong>
                    </span>
                </header>

                <div ref={gridRef} className="console-grid">
                    {/* 1. Céu esta noite */}
                    <article className="console-cell console-cell-observe">
                        <span className="editorial-card-glow" aria-hidden="true" />
                        <span className="editorial-card-icon editorial-card-icon-mint" aria-hidden="true">
                            <Eye className="size-4" />
                        </span>
                        <div className="editorial-card-body">
                            <span className="editorial-card-label">
                                {en ? 'Tonight\'s sky' : 'Céu esta noite'}
                                <span className="editorial-live-dot" aria-hidden="true" />
                            </span>
                            <h3 className="editorial-card-title editorial-card-title-note">{observationLine}</h3>
                        </div>
                    </article>

                    {/* 2. Dados do céu */}
                    <article className="console-cell console-cell-sky">
                        <span className="editorial-card-glow" aria-hidden="true" />
                        <span className="editorial-card-icon editorial-card-icon-purple" aria-hidden="true">
                            <Moon className="size-4" />
                        </span>
                        <div className="editorial-card-body">
                            <span className="editorial-card-label">
                                {en ? 'Sky data' : 'Dados do céu'}
                                <span className="editorial-live-dot" aria-hidden="true" />
                            </span>
                            <h3 className="editorial-card-title editorial-card-main-value">{moonPhaseLine}</h3>
                            <div className="editorial-sky-list">
                                {cloudLine ? <span>{cloudLine}</span> : null}
                                <span>{observingConditionLine}</span>
                                <span className="editorial-sky-planets">{planetsLine}</span>
                            </div>
                        </div>
                    </article>

                    {/* 3. Próxima aproximação */}
                    <article className="console-cell console-cell-approach">
                        <span className="editorial-card-glow" aria-hidden="true" />
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
                                        {approachKm ? <span className="editorial-approach-item editorial-approach-item-dim">{approachKm}</span> : null}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="editorial-card-title editorial-card-main-value editorial-card-main-muted">
                                        {en ? 'Quiet neighborhood' : 'Vizinhança tranquila'}
                                    </h3>
                                    <span className="editorial-card-secondary editorial-card-secondary-dim">
                                        {en ? 'No tracked object poses a known risk in the coming hours.' : 'Nenhum objeto monitorado representa risco conhecido nas próximas horas.'}
                                    </span>
                                </>
                            )}
                        </div>
                    </article>

                    {/* 4. Destaque espacial (link externo fica por último) */}
                    <article className="console-cell">
                        <span className="editorial-card-glow" aria-hidden="true" />
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
                </div>
            </section>
        </div>
    );
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

function HeroEarthFallback() {
    return (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
            <div className="cinematic-earth-shell">
                <div className="earth-loading-spinner absolute inset-0" />
            </div>
        </div>
    );
}
