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

export function AppLayout({ children }: PropsWithChildren) {
    const { url, props } = usePage<PageProps>();
    const { locale, setLocale, t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 border-b border-white/10 bg-space-950/[0.88] backdrop-blur-xl">
                <div ref={menuRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Top bar — always visible */}
                    <div className="flex h-16 items-center justify-between lg:h-auto lg:py-4">
                        <Link href="/" prefetch className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-signal-cyan to-signal-mint text-space-950 shadow-glow">
                                <Rocket className="size-5" aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold tracking-tight">CaeliView</span>
                                <span className="block text-[0.7rem] text-white/50 tracking-wide">{t('app.tagline')}</span>
                            </span>
                        </Link>

                        {/* Desktop nav */}
                        <div className="hidden lg:flex items-center gap-2">
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
                                                    ? 'bg-signal-cyan/15 text-signal-cyan border border-signal-cyan/30 shadow-[0_0_12px_rgba(84,214,214,0.15)]'
                                                    : 'bg-white/5 text-white/65 border border-transparent hover:bg-white/8 hover:text-white/90'
                                            }`}
                                        >
                                            <Icon className="size-4" aria-hidden="true" />
                                            {t(item.labelKey)}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="inline-flex rounded border border-white/10 bg-white/[0.04] p-1 ml-1" aria-label={t('language.label')}>
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

                        {/* Mobile right side: lang switcher + hamburger */}
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
                                onClick={() => setMenuOpen((v) => !v)}
                            >
                                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile dropdown */}
                    <div
                        id="mobile-nav"
                        className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
                            menuOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'
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
                                                ? 'bg-signal-cyan/15 text-signal-cyan border border-signal-cyan/30'
                                                : 'text-white/70 hover:bg-white/6 hover:text-white border border-transparent'
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
            <main className="page-slide">{children}</main>
        </div>
    );
}
