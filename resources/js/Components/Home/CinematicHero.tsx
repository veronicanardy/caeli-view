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
import { ArrowLeft, ArrowRight, Earth, ExternalLink, Eye, Image, MapPin, Moon, Orbit, Satellite, Star } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useHomeApproachTransits, type HomeApproachTransit } from '@/hooks/useHomeApproachTransits';
import { useHomeAstronomyFeed } from '@/hooks/useHomeAstronomyFeed';
import { useSkyObservation } from '@/hooks/useSkyObservation';
import { locationStatusLabel, useUserLocation } from '@/hooks/useUserLocation';
import { useVisibleObjects } from '@/hooks/useVisibleObjects';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import {
    buildObservationNote,
    cleanFeedTitle,
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
const ApproachTransit = lazy(() =>
    import('./ApproachTransit').then((module) => ({ default: module.ApproachTransit })),
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
    // auto:false — não dispara o prompt de localização no load. A leitura do céu
    // local vem de um gesto explícito (botão no console), com fallback honesto.
    const { location, requestLocation } = useUserLocation(locale, { auto: false });
    const sky = useSkyObservation(location);
    const visible = useVisibleObjects(location);
    const feed = useHomeAstronomyFeed({ apod, apodError: apodError ?? null, nextApproach: nextApproach ?? null, spaceNewsHighlight });
    const approach = feed.data.nextApproach;
    const { transits: approachTransits, nearbyCount } = useHomeApproachTransits();
    const skySummary = sky.data ? (en ? sky.data.summaryEn : sky.data.summaryPt) : t('home.hero.readingLocalSky');
    const locationLabel = locationStatusLabel(location, en);
    // Sem localização ainda (nem cache nem permissão): oferecer o gesto em vez
    // de mostrar dados de céu vazios/genéricos.
    const needsLocationGesture = location.source === 'unavailable' && location.status === 'idle';

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
        <section ref={sceneRef} className={`home-hero-scene home-hero-intro relative flex min-h-[660px] flex-col overflow-hidden border-b border-white/10 lg:min-h-[calc(100vh-5rem)] ${optionsOpen ? 'home-hero-scene-expanded' : ''}`}>
                {/* Véu do amanhecer: a cena começa escura e o véu se dissolve de
                    baixo pra cima, como a luz do sol nascendo e clareando a Terra.
                    aria-hidden, decorativo, roda a cada carregamento. */}
                <div className="home-hero-intro-veil pointer-events-none absolute inset-0 z-[30]" aria-hidden="true" />
                <Suspense fallback={null}>
                    <CinematicSpaceBackdrop />
                </Suspense>
                <Suspense fallback={<HeroEarthFallback />}>
                    <CinematicEarthScene />
                </Suspense>
                <div className="home-earth-cinematic-grade pointer-events-none absolute inset-0 z-[11]" aria-hidden="true" />

                {/* Trânsito de dados: asteroides reais da vizinhança cruzam a
                    faixa central como pontos de luz, com rótulo fantasma (nome +
                    distância). Preenche o vazio do meio com o que o produto faz. */}
                <Suspense fallback={null}>
                    <ApproachTransit transits={approachTransits} />
                </Suspense>


                {/* Vignette: separa a navbar do céu e cria um poço suave atrás do
                    bloco editorial central, sem escurecer o horizonte embaixo. */}
                <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,5,12,0.6)_0%,rgba(3,8,18,0.18)_16%,transparent_30%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_56%_40%_at_50%_38%,rgba(2,6,14,0.5)_0%,rgba(2,6,14,0.22)_55%,transparent_78%)]" />
                </div>

                {/* Poeira estelar na faixa entre o bloco editorial e o horizonte:
                    preenche o vazio escuro central para que ele leia como céu
                    profundo, não como espaço morto. Acima da vignette/grade
                    (z-10/11) para não ser apagada pelo escurecimento, abaixo do
                    bloco editorial (z-20). */}
                <div className="home-hero-stardust pointer-events-none absolute inset-0 z-[12]" aria-hidden="true">
                    <span className="home-hero-stardust-field" />
                </div>

                {/* Glint quente acima do lado iluminado do horizonte */}
                <div className="home-warm-glint pointer-events-none absolute inset-0 z-[8]" aria-hidden="true" />
                {/* Glow difuso do nascer do sol fica ATRÁS da Terra (z-8): a luz
                    parece vir de trás do planeta e o limbo recorta o brilho. */}
                <div className="home-cinematic-sunrise pointer-events-none absolute inset-0 z-[8]" aria-hidden="true">
                    <span className="home-cinematic-sunrise-bloom" />
                    <span className="home-cinematic-sunrise-atmosphere" />
                </div>
                {/* A BOLINHA fica ATRÁS da Terra (z-9 < Terra z-10): o planeta opaco
                    recorta a base do disco e só a fatia de cima aparece sobre o limbo,
                    como um sol nascendo atrás da Terra. */}
                <div className="home-cinematic-sunrise-disc pointer-events-none absolute inset-0 z-[9]" aria-hidden="true">
                    <span className="home-cinematic-sunrise-corona" />
                    <span className="home-cinematic-sunrise-core" />
                </div>

                <div className="home-hero-copy relative z-20 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-[clamp(4.75rem,10.5vh,7.75rem)] text-center sm:px-6">
                    <div className="home-hero-badge hero-rise inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-signal-cyan/10 px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-signal-cyan backdrop-blur">
                        <Satellite className="size-3.5" aria-hidden="true" />
                        {t('home.hero.badge')}
                    </div>
                    <h1 className="hero-headline hero-rise hero-rise-2 mt-5 text-5xl font-semibold leading-[0.94] sm:text-6xl lg:text-7xl">
                        {t('home.hero.heading')}
                    </h1>
                    <p className="home-hero-tagline hero-rise hero-rise-3 mt-5 max-w-2xl text-balance text-xl font-medium leading-9 text-white/92 sm:text-2xl">
                        {t('home.hero.tagline')}
                    </p>
                    <p className="home-hero-source hero-rise hero-rise-4 mt-4 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase leading-5 tracking-[0.18em] text-white/60">
                        <span className="home-hero-source-dot" aria-hidden="true" />
                        {t('home.hero.sources')}
                    </p>

                    <div className="hero-rise hero-rise-4 relative mt-[clamp(2.5rem,5vh,4rem)] flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
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
                            {en ? 'Open the radar' : 'Abrir o radar'}
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
                        nearbyCount={nearbyCount}
                        nearestObject={approachTransits[0] ?? null}
                        locationLabel={locationLabel}
                        needsLocationGesture={needsLocationGesture}
                        onRequestLocation={requestLocation}
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
/**
 * Conta de 0 (ou de um piso) até o valor alvo numa animação curta de ease-out,
 * para o número "ao vivo" subir em vez de aparecer estático. Reanima quando o
 * alvo muda (ex.: o fetch resolve com a contagem real). Respeita reduced-motion:
 * nesse caso vai direto ao valor final.
 */
function useCountUp(target: number, durationMs = 1100): number {
    const [value, setValue] = useState(0);
    const fromRef = useRef(0);

    useEffect(() => {
        if (target <= 0) {
            setValue(0);
            return undefined;
        }
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            setValue(target);
            return undefined;
        }
        const from = fromRef.current;
        const start = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min((now - start) / durationMs, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = Math.round(from + (target - from) * eased);
            setValue(current);
            if (t < 1) {
                raf = window.requestAnimationFrame(tick);
            } else {
                fromRef.current = target;
            }
        };
        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [target, durationMs]);

    return value;
}

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
    nearbyCount,
    nearestObject,
    locationLabel,
    needsLocationGesture,
    onRequestLocation,
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
    nearbyCount: number;
    nearestObject: HomeApproachTransit | null;
    locationLabel: string;
    needsLocationGesture: boolean;
    onRequestLocation: () => void;
    en: boolean;
}) {
    const { t } = useTranslation();
    const gridRef = useCardSpotlight();
    const animatedCount = useCountUp(nearbyCount);

    // ── Célula 1: Destaque espacial ───────────────────────────────────
    const highlightTitle = spaceNews?.title ?? (apod?.title ?? null);
    const highlightSource = spaceNews?.source ?? 'NASA APOD';
    const highlightUrl = spaceNews?.url ?? '/apod';
    const highlightFallback = en ? STATIC_CURIOSITY.en : STATIC_CURIOSITY.pt;
    const displayTitle = cleanFeedTitle(highlightTitle ?? highlightFallback);
    const highlightDate = spaceNews?.publishedAt
        ? new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(spaceNews.publishedAt))
        : null;

    // ── Célula 2: Céu esta noite ──────────────────────────────────────
    const observationLine = buildObservationNote(skySummary, cloudCover, seeing, visibleNowPlanets, moonIllumination, en);
    const moonPhaseLine = moonPhaseLabel(moonIllumination, en);
    const cloudLine = cloudCover !== null
        ? (en ? `${formatNumber(cloudCover, 0)}% cloud cover` : `${formatNumber(cloudCover, 0)}% de nuvens`)
        : null;
    const visibilityLabel = formatObservingVisibility(cloudCover, seeing, en);
    const observingConditionLine = en ? `${visibilityLabel} visibility` : `Visibilidade ${visibilityLabel.toLowerCase()}`;
    const planetsLine = formatVisiblePlanetsLine(visibleNowPlanets.map((p) => en ? p.nameEn : p.namePt), en);
    // ── Célula 1: Vizinhança da Terra ─────────────────────────────────
    // Fonte ÚNICA: closest-now (mesma do contador e dos trânsitos). O dado
    // principal é a CONTAGEM de objetos próximos agora; o secundário é o mais
    // próximo (nome + distância). Antes o card usava nextApproach das props,
    // que vinha vazio ("tudo tranquilo") e contradizia o contador de 32.
    const hasNearby = nearbyCount > 0;
    const nearestName = nearestObject?.name
        ?? (approach ? resolveApproachIdentity(approach).displayName : null);
    const nearestKm = nearestObject?.distanceKm != null
        ? `${formatNumber(nearestObject.distanceKm, 0)} km`
        : (approach?.nominalDistanceKm != null ? `${formatNumber(approach.nominalDistanceKm, 0)} km` : null);

    return (
        <div className="hero-rise hero-rise-5">
            <section className="observatory-console" aria-label={t('home.hero.statusRibbonLabel')}>
                <header className="console-header">
                    <span className="console-header-lead">
                        <span className="console-header-title">{en ? 'The sky right now' : 'O céu agora'}</span>
                        <span className="console-live-tag">
                            <span className="sky-status-pulse" aria-hidden="true" />
                            {t('home.hero.liveLabel')}
                        </span>
                    </span>
                    {needsLocationGesture ? (
                        <button
                            type="button"
                            className="console-location-cta"
                            onClick={onRequestLocation}
                        >
                            <MapPin className="size-3.5" aria-hidden="true" />
                            {en ? 'Read my night sky' : 'Ler o céu da minha noite'}
                        </button>
                    ) : (
                        <span className="console-header-location">
                            <span className="console-header-prefix">{en ? 'Observing from' : 'Observando de'}</span>
                            <strong>{locationLabel}</strong>
                        </span>
                    )}
                </header>

                <div ref={gridRef} className="console-grid">
                    {/* 1. Próxima aproximação — primeiro card e CLICÁVEL: leva ao
                        radar, que é a feature central do produto. */}
                    <Link
                        href="/radar"
                        prefetch
                        className="console-cell console-cell-approach console-cell-link group focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        aria-label={en ? 'Open the radar to see close approaches' : 'Abrir o radar para ver as aproximações'}
                    >
                        <span className="editorial-card-glow" aria-hidden="true" />
                        <span className="editorial-card-icon editorial-card-icon-orange" aria-hidden="true">
                            <Orbit className="size-4" />
                        </span>
                        <div className="editorial-card-body">
                            <span className="editorial-card-label">
                                {en ? 'Near Earth now' : 'Perto da Terra agora'}
                                <span className="editorial-live-dot" aria-hidden="true" />
                                <ArrowRight className="console-cell-link-arrow size-3.5" aria-hidden="true" />
                            </span>
                            {hasNearby ? (
                                <>
                                    <h3 className="editorial-card-title editorial-card-approach-count">
                                        <span className="editorial-approach-count-value">{formatNumber(animatedCount, 0)}</span>
                                        <span className="editorial-approach-count-unit">{en ? 'objects' : 'objetos'}</span>
                                    </h3>
                                    <div className="editorial-approach-details">
                                        {nearestName ? (
                                            <span className="editorial-approach-nearest">
                                                {en ? 'Closest: ' : 'Mais próximo: '}
                                                <strong>{nearestName}</strong>
                                            </span>
                                        ) : null}
                                        {nearestKm ? <span className="editorial-approach-item editorial-approach-item-dim">{nearestKm}</span> : null}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="editorial-card-title editorial-card-main-value editorial-card-main-muted">
                                        {en ? 'All quiet up there' : 'Tudo tranquilo lá em cima'}
                                    </h3>
                                    <span className="editorial-card-secondary editorial-card-secondary-dim">
                                        {en ? 'Nothing we track is coming close right now.' : 'Nada que monitoramos chega perto agora.'}
                                    </span>
                                </>
                            )}
                        </div>
                    </Link>

                    {/* 2. Céu esta noite */}
                    <article className="console-cell console-cell-observe">
                        <span className="editorial-card-glow" aria-hidden="true" />
                        <span className="editorial-card-icon editorial-card-icon-mint" aria-hidden="true">
                            <Eye className="size-4" />
                        </span>
                        <div className="editorial-card-body">
                            <span className="editorial-card-label">
                                {en ? 'Tonight\'s sky' : 'Céu esta noite'}
                                {!needsLocationGesture ? <span className="editorial-live-dot" aria-hidden="true" /> : null}
                            </span>
                            {needsLocationGesture ? (
                                <LocationInvite onRequest={onRequestLocation} en={en} />
                            ) : (
                                <h3 className="editorial-card-title editorial-card-title-note">{observationLine}</h3>
                            )}
                        </div>
                    </article>

                    {/* 3. Dados do céu */}
                    <article className="console-cell console-cell-sky">
                        <span className="editorial-card-glow" aria-hidden="true" />
                        <span className="editorial-card-icon editorial-card-icon-purple" aria-hidden="true">
                            <Moon className="size-4" />
                        </span>
                        <div className="editorial-card-body">
                            <span className="editorial-card-label">
                                {en ? 'Sky data' : 'Dados do céu'}
                                {!needsLocationGesture ? <span className="editorial-live-dot" aria-hidden="true" /> : null}
                            </span>
                            {needsLocationGesture ? (
                                <LocationInvite onRequest={onRequestLocation} en={en} />
                            ) : (
                                <>
                                    <h3 className="editorial-card-title editorial-card-main-value">{moonPhaseLine}</h3>
                                    <div className="editorial-sky-list">
                                        {cloudLine ? <span>{cloudLine}</span> : null}
                                        <span>{observingConditionLine}</span>
                                        <span className="editorial-sky-planets">{planetsLine}</span>
                                    </div>
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
                                {!en && spaceNews?.url ? (
                                    <>
                                        <span className="editorial-card-dot" aria-hidden="true">·</span>
                                        <span className="editorial-card-feed-tag">{t('home.hero.externalFeed')}</span>
                                    </>
                                ) : null}
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

/**
 * Convite de localização exibido nos cards que dependem dela, enquanto o usuário
 * não autorizou. Em vez de dados falsos (Lua 0%, "Lendo o céu local"), oferece o
 * gesto explícito que dispara o prompt do navegador.
 */
function LocationInvite({ onRequest, en }: { onRequest: () => void; en: boolean }) {
    return (
        <button type="button" className="editorial-card-invite" onClick={onRequest}>
            <MapPin className="size-3.5" aria-hidden="true" />
            <span>{en ? 'Allow location to read your sky' : 'Permita a localização para ler seu céu'}</span>
        </button>
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
