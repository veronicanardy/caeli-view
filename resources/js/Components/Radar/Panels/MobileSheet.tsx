/**
 * Bottom sheet genérico do radar mobile.
 *
 * Responsabilidade: moldura inferior com handle de arraste real, snaps
 * meio/expandido, fechamento por arraste para baixo ou botão X, e área de
 * conteúdo com scroll interno. Não conhece dados do radar: recebe título,
 * ações e conteúdo prontos de quem o monta.
 *
 * Convive com a cena 3D sem backdrop: o usuário continua vendo (e tocando)
 * a parte superior do canvas enquanto o sheet está aberto.
 */

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { X } from 'lucide-react';
import { nextSnapOnTap } from './bottomSheetSnap';
import type { SheetSnap } from './bottomSheetSnap';
import { useBottomSheetDrag } from './useBottomSheetDrag';

const SHEET_SNAPS: SheetSnap[] = ['half', 'full'];

type Props = {
    en: boolean;
    title: string;
    closeLabel: string;
    onClose: () => void;
    /** Conteúdo extra no canto direito do cabeçalho (ex.: botão de atualizar). */
    headerTrailing?: ReactNode;
    children: ReactNode;
    dataTutorial?: string;
    panelRef?: Ref<HTMLDivElement>;
};

export function MobileSheet({
    en,
    title,
    closeLabel,
    onClose,
    headerTrailing,
    children,
    dataTutorial,
    panelRef,
}: Props) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [snap, setSnap] = useState<SheetSnap>('half');
    const { dragging, heightStyle, dragRegionProps, wasDraggedRef } = useBottomSheetDrag({
        sheetRef,
        snaps: SHEET_SNAPS,
        snap,
        onSnapChange: setSnap,
        onDismiss: onClose,
    });

    const onHandleTap = () => {
        // Ignora o click fantasma que o browser dispara logo após um arraste.
        if (wasDraggedRef.current) return;
        setSnap((current) => nextSnapOnTap(current, SHEET_SNAPS));
    };

    // Entrada suave: o sheet sobe do rodapé no primeiro frame após montar.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const setRefs = (el: HTMLDivElement | null) => {
        sheetRef.current = el;
        if (typeof panelRef === 'function') panelRef(el);
        else if (panelRef) panelRef.current = el;
    };

    return (
        <div
            ref={setRefs}
            role="dialog"
            aria-label={title}
            data-tutorial={dataTutorial}
            style={{
                ...heightStyle,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(24px)',
                transition: dragging
                    ? 'none'
                    : `${heightStyle.transition}, opacity 0.2s ease, transform 0.24s cubic-bezier(0.32, 0.72, 0.24, 1)`,
            }}
            className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl border border-white/[0.1] bg-space-950/96 shadow-[0_-8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl cursor-auto lg:hidden"
        >
            {/* Região de arraste: handle + cabeçalho. touch-none entrega o gesto ao hook. */}
            <div className="shrink-0 touch-none select-none" {...dragRegionProps}>
                <button
                    type="button"
                    onClick={onHandleTap}
                    aria-label={snap === 'full'
                        ? (en ? 'Shrink panel' : 'Reduzir painel')
                        : (en ? 'Expand panel' : 'Expandir painel')}
                    className="flex w-full justify-center pb-1 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                >
                    <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
                </button>
                <div className="flex items-center justify-between gap-2 px-4 pb-2">
                    <span className="min-w-0 truncate text-[12px] font-medium uppercase tracking-wide text-white/55">
                        {title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                        {headerTrailing ?? null}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={closeLabel}
                            className="rounded-full p-2 text-white/40 transition outline-none hover:bg-white/8 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    </span>
                </div>
            </div>
            {/* Área de conteúdo: cada conteúdo decide o próprio scroll (lista pinada,
                acordeão etc.); overscroll-contain evita arrastar a página junto. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain border-t border-white/[0.07]">
                {children}
            </div>
        </div>
    );
}
