import { Link, router, usePage } from '@inertiajs/react';
import { Earth, Image, Info, LoaderCircle, Menu, Rocket, Telescope, X } from 'lucide-react';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Locale, useTranslation } from '@/i18n';
import { transparencyCopy } from '@/lib/transparencyCopy';
import { PageProps } from '@/types';

const navItems = [
    { href: '/', labelKey: 'nav.home', icon: Rocket },
    { href: '/radar', labelKey: 'nav.radar', icon: Telescope },
    { href: '/epic', labelKey: 'nav.earth', icon: Earth },
    { href: '/apod', labelKey: 'nav.discovery', icon: Image },
    { href: '/sobre', labelKey: 'nav.about', icon: Info },
] as const;

const navigationProgressDelayMs = 80;
const navigationProgressFadeMs = 220;
const navigationProgressMaxMs = 12000;

type AppLayoutOptions = {
    hideHeader?: boolean;
    hideFooter?: boolean;
};

const AppLayoutOptionsContext = createContext<(options: AppLayoutOptions) => void>(() => undefined);

export function useAppLayoutOptions(options: AppLayoutOptions) {
    const setOptions = useContext(AppLayoutOptionsContext);

    useEffect(() => {
        setOptions(options);

        return () => setOptions({});
    }, [options.hideHeader, options.hideFooter, setOptions]);
}
function NavigationProgress() {
    const [phase, setPhase] = useState<'hidden' | 'visible' | 'leaving'>('hidden');
    const { locale } = useTranslation();
    const phaseRef = useRef<'hidden' | 'visible' | 'leaving'>('hidden');
    const navigationActiveRef = useRef(false);
    const showTimeoutRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);
    const watchdogTimeoutRef = useRef<number | null>(null);
    const label = locale === 'en' ? 'Loading...' : 'Carregando...';
    const detail = locale === 'en' ? 'Preparing the route' : 'Preparando a rota';

    useEffect(() => {
        const setNavigationPhase = (nextPhase: 'hidden' | 'visible' | 'leaving') => {
            phaseRef.current = nextPhase;
            setPhase(nextPhase);
        };

        const clearTimers = () => {
            if (showTimeoutRef.current !== null) {
                window.clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }


            if (hideTimeoutRef.current !== null) {
                window.clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            if (watchdogTimeoutRef.current !== null) {
                window.clearTimeout(watchdogTimeoutRef.current);
                watchdogTimeoutRef.current = null;
            }
        };

        const start = () => {
            if (navigationActiveRef.current && phaseRef.current !== 'leaving') {
                return;
            }

            clearTimers();
            navigationActiveRef.current = true;
            setNavigationPhase('hidden');

            showTimeoutRef.current = window.setTimeout(() => {
                showTimeoutRef.current = null;
                setNavigationPhase('visible');
            }, navigationProgressDelayMs);

            watchdogTimeoutRef.current = window.setTimeout(() => {
                navigationActiveRef.current = false;
                setNavigationPhase('hidden');
                clearTimers();
            }, navigationProgressMaxMs);
        };

        const finish = () => {
            if (!navigationActiveRef.current) {
                return;
            }

            navigationActiveRef.current = false;

            if (watchdogTimeoutRef.current !== null) {
                window.clearTimeout(watchdogTimeoutRef.current);
                watchdogTimeoutRef.current = null;
            }

            if (showTimeoutRef.current !== null) {
                window.clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
                setNavigationPhase('hidden');
                return;
            }

            if (phaseRef.current === 'hidden') {
                return;
            }

            setNavigationPhase('leaving');
            hideTimeoutRef.current = window.setTimeout(() => {
                setNavigationPhase('hidden');
            }, navigationProgressFadeMs);
        };

        const removeStartListener = router.on('start', start);
        const removeFinishListener = router.on('finish', finish);

        return () => {
            removeStartListener();
            removeFinishListener();
            navigationActiveRef.current = false;
            clearTimers();
        };
    }, []);

    if (phase === 'hidden') {
        return null;
    }

    return (
        <div
            className={`app-route-loader fixed inset-0 z-[9999] flex items-center justify-center px-4 transition duration-200 ${
                phase === 'leaving' ? 'opacity-0' : 'opacity-100'
            }`}
            role="status"
            aria-live="polite"
        >
            <div className="app-route-loader-card">
                <span className="app-route-loader-orbit" aria-hidden="true">
                    <LoaderCircle className="app-route-loader-spinner size-8 text-signal-cyan" aria-hidden="true" />
                </span>
                <span className="app-route-loader-copy">
                    <span className="app-route-loader-title">{label}</span>
                    <span className="app-route-loader-detail">{detail}</span>
                </span>
                <span className="app-route-loader-bar" aria-hidden="true" />
            </div>
        </div>
    );
}

export function AppLayout({ children, hideHeader = false, hideFooter = false }: PropsWithChildren<AppLayoutOptions>) {
    const { url, props } = usePage<PageProps>();
    const { locale, setLocale, t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [layoutOptions, setLayoutOptions] = useState<AppLayoutOptions>({});
    const menuRef = useRef<HTMLDivElement>(null);
    const appTagline = t('app.tagline');
    const footerCopy = transparencyCopy(locale);
    const effectiveHideHeader = hideHeader || Boolean(layoutOptions.hideHeader);
    const effectiveHideFooter = hideFooter || Boolean(layoutOptions.hideFooter);

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    return (
        <AppLayoutOptionsContext.Provider value={setLayoutOptions}>
        {/* No radar (hideFooter) a tela ocupa exatamente a viewport e nunca rola: h-[100dvh] +
           overflow-hidden travam a altura e o radar 3D preenche o espaço restante por flex. Nas
           demais páginas o layout cresce com o conteúdo (min-h-screen) e rola normalmente. */}
        <div className={`flex flex-col ${effectiveHideFooter ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
            <NavigationProgress />
            <header className={`app-header sticky top-0 z-[100] border-b border-white/10 bg-space-950/[0.88] backdrop-blur-xl transition-opacity duration-300 ${effectiveHideHeader ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                {/* Hairline ciano de assinatura, espelha a linha do footer */}
                <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-signal-cyan/25 to-transparent" aria-hidden="true" />
                <div ref={menuRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between lg:h-auto lg:py-4">
                        <Link href="/" prefetch className="app-brand group flex items-center gap-3">
                            <span className="app-brand-mark flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-signal-cyan to-signal-mint text-space-950 shadow-glow">
                                <Rocket className="size-5" aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold tracking-tight">CaeliView</span>
                                <span className="block text-[0.7rem] tracking-wide text-white/50">{appTagline}</span>
                            </span>
                        </Link>

                        <div className="hidden items-center gap-2 lg:flex">
                            <nav className="app-nav-shell flex gap-1.5">
                                {navItems.map((item) => {
                                    const active = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch
                                            className={`app-nav-link inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                                active
                                                    ? 'app-nav-link-active border border-signal-cyan/30 bg-signal-cyan/15 text-signal-cyan shadow-[0_0_12px_rgba(84,214,214,0.15)]'
                                                    : 'border border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                        >
                                            <Icon className="size-4" aria-hidden="true" />
                                            {t(item.labelKey)}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="app-locale-switch ml-1 inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1" aria-label={t('language.label')}>
                                {(['pt-BR', 'en'] as Locale[]).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            locale === item ? 'bg-signal-cyan text-space-950' : 'text-white/65 hover:bg-white/[0.08] hover:text-white'
                                        }`}
                                        onClick={() => setLocale(item)}
                                    >
                                        {t(`language.${item}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 lg:hidden">
                            <div className="app-locale-switch inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1" aria-label={t('language.label')}>
                                {(['pt-BR', 'en'] as Locale[]).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            locale === item ? 'bg-signal-cyan text-space-950' : 'text-white/65 hover:bg-white/[0.08] hover:text-white'
                                        }`}
                                        onClick={() => setLocale(item)}
                                    >
                                        {t(`language.${item}`)}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                                aria-expanded={menuOpen}
                                aria-controls="mobile-nav"
                                className="app-icon-button inline-flex items-center justify-center rounded-lg p-2 text-white/70 transition hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                onClick={() => setMenuOpen((value) => !value)}
                            >
                                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>

                    <div
                        id="mobile-nav"
                        className={`overflow-hidden transition-all duration-300 ease-out lg:hidden ${
                            menuOpen ? 'max-h-96 pb-4 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                        aria-hidden={!menuOpen}
                    >
                        <nav className="flex flex-col gap-1 pt-2">
                            {navItems.map((item) => {
                                const active = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch
                                        tabIndex={menuOpen ? 0 : -1}
                                        className={`inline-flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                                            active
                                                ? 'border border-signal-cyan/30 bg-signal-cyan/15 text-signal-cyan'
                                                : 'border border-transparent text-white/70 hover:bg-white/6 hover:text-white'
                                        }`}
                                    >
                                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                                        {t(item.labelKey)}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </header>
            {props.flash?.error ? (
                <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="rounded border border-signal-coral/30 bg-signal-coral/10 px-4 py-3 text-sm text-signal-coral">
                        {props.flash.error}
                    </div>
                </div>
            ) : null}
            <main className={`page-slide flex-1 ${effectiveHideFooter ? 'min-h-0' : ''}`}>{children}</main>
            {/* Rodapé de transparência: peso visual reduzido para não quebrar a atmosfera da página.
                Escondido em telas que ocupam a viewport inteira sem scroll (radar), onde a transparência
                migra para dentro do guia. */}
            {effectiveHideFooter ? null : (
            <footer className="relative border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(3,6,13,0),rgba(3,6,13,0.72)_25%,rgba(3,6,13,0.88))]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/20 to-transparent" />
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.24em] text-signal-cyan/45">
                                <Info className="size-3" aria-hidden="true" />
                                {footerCopy.label}
                            </span>
                            <div className="space-y-1.5">
                                <h2 className="max-w-xs text-[13px] font-medium tracking-tight text-white/55">
                                    {footerCopy.title}
                                </h2>
                                <p className="max-w-xs text-[12px] leading-relaxed text-white/28">
                                    {footerCopy.subtitle}
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-3 border-l-0 border-white/[0.06] lg:border-l lg:pl-8">
                            {footerCopy.paragraphs.map((paragraph, index) => (
                                <p
                                    key={paragraph}
                                    className={`max-w-4xl text-[12px] leading-6 text-white/32 ${
                                        index > 0 ? 'border-t border-white/[0.05] pt-3' : ''
                                    }`}
                                >
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
            )}
        </div>
        </AppLayoutOptionsContext.Provider>
    );
}
