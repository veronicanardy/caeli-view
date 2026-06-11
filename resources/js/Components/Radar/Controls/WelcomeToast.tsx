/**
 * Toast de boas-vindas contextual do radar.
 *
 * Responsabilidade: exibir uma dica de primeiro acesso para o modo radar ou
 * orbital, persistindo a visita em localStorage para não repetir. Aparece uma
 * única vez por modo e não interfere com a cena ou com dados de aproximação.
 *
 * Quando o tutorial interativo está ativo (ou prestes a abrir sozinho), os
 * toasts ficam suprimidos: o tutorial é a experiência de primeira visita e
 * marca as chaves legadas ao terminar.
 */

import { useEffect, useRef, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';

const STORAGE_KEY_RADAR = 'caeli_radar_visited';
const STORAGE_KEY_ORBIT = 'caeli_orbit_visited';

type ToastVariant = 'radar' | 'orbit';

/**
 * Guarda local simples para mostrar a ajuda contextual apenas na primeira visita.
 */
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

/**
 * Suprime o toast enquanto o tutorial interativo roda (ou vai abrir sozinho) e
 * também depois que ele rodou nesta sessão: o estado `isFirst` foi lido do
 * localStorage antes de o tutorial gravar o desfecho, então sem esta trava o
 * toast apareceria logo após a conclusão.
 */
function useTutorialSuppression(): boolean {
    const tutorial = useRadarTutorialOptional();
    const ranThisSession = useRef(false);
    if (tutorial?.active) ranThisSession.current = true;
    return Boolean(tutorial && (tutorial.active || tutorial.pendingAutoStart)) || ranThisSession.current;
}

/**
 * Boas-vindas contextual da vista radar.
 */
export function RadarWelcomeToast({
    locale,
    onOpenManual,
}: {
    locale: 'pt-BR' | 'en';
    onOpenManual: () => void;
}) {
    const [visible, dismiss] = useFirstVisit(STORAGE_KEY_RADAR);
    const suppressed = useTutorialSuppression();
    return (
        <WelcomeToast
            visible={visible && !suppressed}
            variant="radar"
            locale={locale}
            onOpenManual={() => { dismiss(); onOpenManual(); }}
            onDismiss={dismiss}
        />
    );
}

/**
 * Boas-vindas contextual da vista orbital.
 */
export function OrbitWelcomeToast({
    locale,
    onOpenManual,
}: {
    locale: 'pt-BR' | 'en';
    onOpenManual: () => void;
}) {
    const [visible, dismiss] = useFirstVisit(STORAGE_KEY_ORBIT);
    const suppressed = useTutorialSuppression();
    return (
        <WelcomeToast
            visible={visible && !suppressed}
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
        ? (en ? 'Welcome to Earth\'s neighbourhood!' : 'Bem-vindo(a) à vizinhança da Terra!')
        : (en ? 'The scale just changed. So did everything.' : 'Mudou a escala. Mudou tudo.');

    const body = variant === 'radar'
        ? (en
            ? 'Those dots are real asteroids passing by right now. The guide shows you what you\'re looking at.'
            : 'Esses pontos são asteroides reais em passagem agora. O guia mostra o que você está vendo.')
        : (en
            ? 'The guide explains what this ellipse means and why the Sun isn\'t at the centre.'
            : 'O guia explica o que essa elipse significa e por que o Sol não está no centro.');

    const linkLabel = en ? 'Open the guide' : 'Abrir o guia';
    const closeLabel = en ? 'Dismiss' : 'Fechar';

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-[min(26rem,90vw)] flex-col gap-3 rounded-2xl border border-signal-cyan/30 bg-[#07101d]/97 px-6 py-5 shadow-[0_16px_64px_rgba(0,0,0,0.75)] backdrop-blur-xl ring-1 ring-signal-cyan/10"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden>🌍</span>
                    <p className="text-base font-semibold text-white leading-snug">{title}</p>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={closeLabel}
                    className="mt-0.5 shrink-0 rounded-full p-1 text-white/40 transition hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan outline-none"
                >
                    <X className="size-4" aria-hidden />
                </button>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{body}</p>
            <button
                type="button"
                onClick={onOpenManual}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full border border-signal-cyan/50 bg-signal-cyan/20 px-4 py-2 text-[13px] font-semibold text-signal-cyan transition hover:bg-signal-cyan/30 focus-visible:ring-2 focus-visible:ring-signal-cyan outline-none"
            >
                <BookOpen className="size-3.5" aria-hidden />
                {linkLabel}
            </button>
        </div>
    );
}
