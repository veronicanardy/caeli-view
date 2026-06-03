import { Link, usePage } from '@inertiajs/react';
import { Earth, Image, Info, Menu, Rocket, Telescope, X } from 'lucide-react';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Locale, useTranslation } from '@/i18n';
import { PageProps } from '@/types';

const navItems = [
    { href: '/', labelKey: 'nav.home', icon: Rocket },
    { href: '/radar', labelKey: 'nav.radar', icon: Telescope },
    { href: '/epic', labelKey: 'nav.earth', icon: Earth },
    { href: '/apod', labelKey: 'nav.discovery', icon: Image },
    { href: '/sobre', labelKey: 'nav.about', icon: Info },
] as const;

export function AppLayout({ children, hideHeader = false }: PropsWithChildren<{ hideHeader?: boolean }>) {
    const { url, props } = usePage<PageProps>();
    const { locale, setLocale, t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const appTagline = locale === 'en' ? 'Observatory with public NASA/JPL data' : 'Observatório com dados públicos NASA/JPL';
    const footerCopy = locale === 'en'
        ? {
            label: 'Transparency',
            title: 'Sources and visualization limits',
            subtitle: 'Independent educational interface built around public space data.',
            paragraphs: [
                'CaeliView is an independent project and is not affiliated with, sponsored by, or endorsed by NASA, JPL, or Caltech.',
                'Data sources: NASA/JPL CNEOS, NASA/JPL Horizons, and NASA public APIs, as indicated throughout the experience.',
                'Visualizations are educational and may use scale compression, visual approximations, and fallbacks. For official information, consult the original sources.',
            ],
        }
        : {
            label: 'Transparência',
            title: 'Fontes e limites da visualização',
            subtitle: 'Interface educativa independente construída a partir de dados públicos do espaço.',
            paragraphs: [
                'CaeliView é um projeto independente e não é afiliado, patrocinado ou endossado pela NASA, JPL ou Caltech.',
                'Fontes de dados: NASA/JPL CNEOS, NASA/JPL Horizons e APIs públicas da NASA, conforme indicado ao longo da experiência.',
                'As visualizações são educativas e podem usar compressão de escala, aproximações visuais e fallbacks. Para informações oficiais, consulte as fontes originais.',
            ],
        };

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
        <div className="flex min-h-screen flex-col">
            <header className={`sticky top-0 z-[100] border-b border-white/10 bg-space-950/[0.88] backdrop-blur-xl transition-opacity duration-300 ${hideHeader ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                <div ref={menuRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between lg:h-auto lg:py-4">
                        <Link href="/" prefetch className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-signal-cyan to-signal-mint text-space-950 shadow-glow">
                                <Rocket className="size-5" aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold tracking-tight">CaeliView</span>
                                <span className="block text-[0.7rem] tracking-wide text-white/50">{appTagline}</span>
                            </span>
                        </Link>

                        <div className="hidden items-center gap-2 lg:flex">
                            <nav className="flex gap-2">
                                {navItems.map((item) => {
                                    const active = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch
                                            className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
                                                active
                                                    ? 'border border-signal-cyan/30 bg-signal-cyan/15 text-signal-cyan shadow-[0_0_12px_rgba(84,214,214,0.15)]'
                                                    : 'border border-transparent bg-white/5 text-white/65 hover:bg-white/8 hover:text-white/90'
                                            }`}
                                        >
                                            <Icon className="size-4" aria-hidden="true" />
                                            {t(item.labelKey)}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="ml-1 inline-flex rounded border border-white/10 bg-white/[0.04] p-1" aria-label={t('language.label')}>
                                {(['pt-BR', 'en'] as Locale[]).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
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
                            <div className="inline-flex rounded border border-white/10 bg-white/[0.04] p-1" aria-label={t('language.label')}>
                                {(['pt-BR', 'en'] as Locale[]).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
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
                                className="inline-flex items-center justify-center rounded p-2 text-white/70 transition hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
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
            <main className="page-slide flex-1">{children}</main>
            <footer className="relative border-t border-white/10 bg-[linear-gradient(180deg,rgba(6,10,18,0),rgba(6,10,18,0.86)_18%,rgba(6,10,18,0.96))]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/50 to-transparent" />
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
                        <div className="space-y-3">
                            <span className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-signal-cyan/85">
                                <Info className="size-3.5" aria-hidden="true" />
                                {footerCopy.label}
                            </span>
                            <div className="space-y-2">
                                <h2 className="max-w-xs text-sm font-semibold tracking-[0.01em] text-white/88">
                                    {footerCopy.title}
                                </h2>
                                <p className="max-w-xs text-sm leading-6 text-white/40">
                                    {footerCopy.subtitle}
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 border-l-0 border-white/10 lg:border-l lg:pl-8">
                            {footerCopy.paragraphs.map((paragraph, index) => (
                                <p
                                    key={paragraph}
                                    className={`max-w-4xl text-sm leading-7 text-white/58 ${
                                        index > 0 ? 'border-t border-white/8 pt-4' : ''
                                    }`}
                                >
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
