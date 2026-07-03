import { Link, usePage } from '@inertiajs/react';
import { Earth, Image, Info, Menu, Rocket, Telescope, X } from 'lucide-react';
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

type AppLayoutOptions = {
    hideHeader?: boolean;
    hideFooter?: boolean;
    // Trava a altura na viewport (h-[100dvh] + overflow-hidden) para telas que NÃO rolam, como o
    // radar, onde a cena 3D preenche o espaço restante por flex. Sem isto, esconder o rodapé não
    // deve impedir o scroll: páginas longas sem footer (ex.: Termos) continuam rolando normalmente.
    lockViewport?: boolean;
};

const AppLayoutOptionsContext = createContext<(options: AppLayoutOptions) => void>(() => undefined);

export function useAppLayoutOptions(options: AppLayoutOptions) {
    const setOptions = useContext(AppLayoutOptionsContext);

    useEffect(() => {
        setOptions(options);

        return () => setOptions({});
    }, [options.hideHeader, options.hideFooter, options.lockViewport, setOptions]);
}

export function AppLayout({ children, hideHeader = false, hideFooter = false, lockViewport = false }: PropsWithChildren<AppLayoutOptions>) {
    const { url, props } = usePage<PageProps>();
    const { locale, setLocale, t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [layoutOptions, setLayoutOptions] = useState<AppLayoutOptions>({});
    const menuRef = useRef<HTMLDivElement>(null);
    const appTagline = t('app.tagline');
    const footerCopy = transparencyCopy(locale);
    const effectiveHideHeader = hideHeader || Boolean(layoutOptions.hideHeader);
    const effectiveHideFooter = hideFooter || Boolean(layoutOptions.hideFooter);
    const effectiveLockViewport = lockViewport || Boolean(layoutOptions.lockViewport);

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
        {/* No radar (lockViewport) a tela ocupa exatamente a viewport e nunca rola: h-[100dvh] +
           overflow-hidden travam a altura e o radar 3D preenche o espaço restante por flex. Nas
           demais páginas o layout cresce com o conteúdo (min-h-screen) e rola normalmente, mesmo
           quando o rodapé está escondido (ex.: Termos). */}
        <div className={`flex flex-col ${effectiveLockViewport ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
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
            <main className={`page-slide flex-1 ${effectiveLockViewport ? 'min-h-0' : ''}`}>{children}</main>
            {/* Rodapé de transparência enxuto: só a não-afiliação (a linha que precisa estar sempre
                visível) e um botão chamativo para os Termos de uso, onde vivem as fontes, os limites e a
                isenção completos. Escondido em telas que ocupam a viewport inteira sem scroll (radar),
                onde a transparência migra para dentro do guia. */}
            {effectiveHideFooter ? null : (
            <footer className="relative border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(3,6,13,0),rgba(3,6,13,0.72)_25%,rgba(3,6,13,0.88))]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/20 to-transparent" />
                <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-signal-cyan/70">
                                <Info className="size-3.5" aria-hidden="true" />
                                {footerCopy.label}
                            </span>
                            <p className="max-w-xl text-[13px] leading-relaxed text-white/60">
                                {footerCopy.paragraphs[0]}
                            </p>
                        </div>
                        <Link
                            href="/termos"
                            className="shrink-0 text-[13px] font-medium text-signal-cyan/80 underline decoration-signal-cyan/30 decoration-1 underline-offset-4 transition hover:text-signal-cyan hover:decoration-signal-cyan/70"
                        >
                            {t('nav.terms')}
                        </Link>
                    </div>
                </div>
            </footer>
            )}
        </div>
        </AppLayoutOptionsContext.Provider>
    );
}
