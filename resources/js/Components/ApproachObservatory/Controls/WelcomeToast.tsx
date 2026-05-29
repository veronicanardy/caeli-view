import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';

const STORAGE_KEY_RADAR = 'caeli_radar_visited';
const STORAGE_KEY_ORBIT = 'caeli_orbit_visited';

type ToastVariant = 'radar' | 'orbit';

function useFirstVisit(key: string): [boolean, () => void] {
    const [isFirst, setIsFirst] = useState(false);

    useEffect(() => {
        try {
            if (!localStorage.getItem(key)) {
                setIsFirst(true);
            }
        } catch {
            // localStorage indisponível (modo privado restrito etc.)
        }
    }, [key]);

    const dismiss = () => {
        setIsFirst(false);
        try {
            localStorage.setItem(key, '1');
        } catch {
            // silêncio intencional
        }
    };

    return [isFirst, dismiss];
}

export function RadarWelcomeToast({
    locale,
    onOpenManual,
}: {
    locale: 'pt-BR' | 'en';
    onOpenManual: () => void;
}) {
    const [visible, dismiss] = useFirstVisit(STORAGE_KEY_RADAR);
    return (
        <WelcomeToast
            visible={visible}
            variant="radar"
            locale={locale}
            onOpenManual={() => { dismiss(); onOpenManual(); }}
            onDismiss={dismiss}
        />
    );
}

export function OrbitWelcomeToast({
    locale,
    onOpenManual,
}: {
    locale: 'pt-BR' | 'en';
    onOpenManual: () => void;
}) {
    const [visible, dismiss] = useFirstVisit(STORAGE_KEY_ORBIT);
    return (
        <WelcomeToast
            visible={visible}
            variant="orbit"
            locale={locale}
            onOpenManual={() => { dismiss(); onOpenManual(); }}
            onDismiss={dismiss}
        />
    );
}

function WelcomeToast({
    visible,
    variant,
    locale,
    onOpenManual,
    onDismiss,
}: {
    visible: boolean;
    variant: ToastVariant;
    locale: 'pt-BR' | 'en';
    onOpenManual: () => void;
    onDismiss: () => void;
}) {
    const en = locale === 'en';

    if (!visible) return null;

    const title = variant === 'radar'
        ? (en ? 'Welcome to the Orbital Radar!' : 'Bem-vindo ao Radar Orbital!')
        : (en ? 'Keplerian orbit view' : 'Vista orbital kepleriana');

    const body = variant === 'radar'
        ? (en
            ? 'Each dot is a real rock flying near Earth right now. Before exploring, read the guide to understand distances, scales and what everything means.'
            : 'Cada ponto é uma rocha real voando perto da Terra agora. Antes de explorar, leia o guia para entender distâncias, escalas e o que tudo significa.')
        : (en
            ? 'Now you\'re seeing the full orbit of this asteroid around the Sun. The guide explains how to read the ellipse and what the scale means.'
            : 'Agora você está vendo a órbita completa desse asteroide ao redor do Sol. O guia explica como ler a elipse e o que a escala significa.');

    const linkLabel = en ? 'Read the guide' : 'Ler o guia';
    const closeLabel = en ? 'Dismiss' : 'Fechar';

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-[min(26rem,90vw)] flex-col gap-4 rounded-2xl border border-signal-cyan/30 bg-[#07101d]/97 px-6 py-5 shadow-[0_16px_64px_rgba(0,0,0,0.75)] backdrop-blur-xl ring-1 ring-signal-cyan/10"
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-white leading-snug">{title}</p>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={closeLabel}
                    className="mt-0.5 shrink-0 rounded-full p-1 text-white/40 transition hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan outline-none"
                >
                    <X className="size-4" aria-hidden />
                </button>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{body}</p>
            <button
                type="button"
                onClick={onOpenManual}
                className="inline-flex items-center gap-2 self-start rounded-full border border-signal-cyan/40 bg-signal-cyan/15 px-4 py-2 text-[13px] font-semibold text-signal-cyan transition hover:bg-signal-cyan/25 focus-visible:ring-2 focus-visible:ring-signal-cyan outline-none"
            >
                <BookOpen className="size-3.5" aria-hidden />
                {linkLabel}
            </button>
        </div>
    );
}
