/**
 * Shell visual comum dos painéis flutuantes.
 *
 * Em desktop: card do trilho esquerdo (left-3); o `top` e a altura máxima vêm
 * de quem monta, calculados para encaixar logo abaixo do painel de navegação
 * sem colidir com ele nem estourar a base da cena.
 * Em mobile: bottom sheet com arraste real e três estados (minimizado, meio
 * aberto, expandido). O handle e o cabeçalho são a região de arraste; um toque
 * no handle cicla os estados. No estado minimizado só o cabeçalho fica visível,
 * devolvendo a cena 3D ao usuário sem perder o contexto do objeto.
 *
 * Nota: o shell não usa -translate-y para posicionar no desktop. A animação de
 * entrada aplica `transform` inline, que sobrescreveria qualquer classe de
 * translate. Posição vertical é sempre via `top` + `max-height`.
 */

import { createContext, useContext, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MOBILE_MEDIA_QUERY } from '../radarLayoutConstants';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';
import { FOCUS_CARD_SNAP_FRACTION, nextSnapOnTap } from './bottomSheetSnap';
import type { SheetSnap } from './bottomSheetSnap';
import { useBottomSheetDrag } from './useBottomSheetDrag';

/** Estados do card mobile: minimizado, meio aberto (padrão) e expandido. */
const CARD_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/**
 * Estado do sheet exposto ao conteúdo do card: permite priorizar dados no
 * mobile (ex.: esconder o preview decorativo fora do estado expandido) sem
 * acoplar o conteúdo ao mecanismo de arraste.
 */
export type PanelSheetState = {
    /** True quando o shell está em modo bottom sheet (viewport mobile). */
    isMobileSheet: boolean;
    snap: SheetSnap;
};

const PanelSheetContext = createContext<PanelSheetState>({ isMobileSheet: false, snap: 'full' });

export function usePanelSheetState(): PanelSheetState {
    return useContext(PanelSheetContext);
}

type PanelShellProps = {
    /** Idioma dos rótulos próprios do shell (handle de redimensionar). */
    en?: boolean;
    onClose: () => void;
    closeLabel: string;
    showCloseButton?: boolean;
    eyebrow?: string;
    eyebrowPrefix?: ReactNode;
    title: ReactNode;
    dotColor?: string;
    borderClass?: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    panelRef?: Ref<HTMLDivElement>;
    /** Marcador estável para o tutorial interativo destacar este painel. */
    dataTutorial?: string;
};

export function PanelShell({
    en = false,
    onClose,
    closeLabel,
    showCloseButton = true,
    eyebrow,
    eyebrowPrefix,
    title,
    dotColor,
    borderClass = 'border-white/12',
    children,
    className = '',
    style,
    panelRef,
    dataTutorial,
}: PanelShellProps) {
    const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
    const tutorial = useRadarTutorialOptional();
    const sheetRef = useRef<HTMLDivElement>(null);
    const [snap, setSnap] = useState<SheetSnap>('half');
    const resizeAction = snap === 'full' ? 'collapse-object-panel' : 'expand-object-panel';
    const canResize = tutorial?.isActionAllowed(resizeAction) ?? true;
    const { dragging, heightStyle, dragRegionProps, wasDraggedRef } = useBottomSheetDrag({
        sheetRef,
        snaps: CARD_SNAPS,
        snap,
        onSnapChange: setSnap,
        // Sem onDismiss: fechar o card é decisão explícita (botão X), nunca acidente de gesto.
        fractions: FOCUS_CARD_SNAP_FRACTION,
        disabled: !canResize,
    });

    const onHandleTap = () => {
        // Ignora o click fantasma que o browser dispara logo após um arraste.
        if (wasDraggedRef.current) return;
        if (!canResize) return;
        setSnap((current) => {
            tutorial?.completeStep(current === 'full' ? 'collapse-object-panel' : 'expand-object-panel');
            return nextSnapOnTap(current, CARD_SNAPS);
        });
    };

    const setRefs = (el: HTMLDivElement | null) => {
        sheetRef.current = el;
        if (typeof panelRef === 'function') panelRef(el);
        else if (panelRef) panelRef.current = el;
    };

    // Memoizado para o conteúdo não re-renderizar a cada frame do arraste
    // (dragHeight muda por pointermove; snap só muda no fim do gesto).
    const sheetState = useMemo<PanelSheetState>(() => ({ isMobileSheet: isMobile, snap }), [isMobile, snap]);

    const mobileStyle: CSSProperties = isMobile
        ? {
            ...heightStyle,
            // Durante o arraste, a animação de entrada (opacity/transform) não pode reativar transição.
            transition: dragging ? 'none' : `${heightStyle.transition}, opacity 0.18s ease, transform 0.22s ease`,
        }
        : {};

    return (
        <div
            ref={setRefs}
            data-tutorial={dataTutorial}
            style={{ ...style, ...mobileStyle, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            className={[
                'pointer-events-auto absolute z-20 overflow-hidden border cursor-auto',
                'bg-space-950/96 shadow-[0_0_36px_rgba(34,211,238,0.10),0_10px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl',
                /* Mobile: bottom sheet largura total, canto superior arredondado */
                'left-0 right-0 bottom-0 rounded-t-2xl',
                /* Desktop: card do trilho esquerdo; top/max-h vêm do caller */
                'lg:left-3 lg:right-auto lg:bottom-auto lg:rounded-2xl',
                borderClass,
                className,
            ].join(' ')}
        >
            {/* Linha de acento ciano no topo */}
            <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-signal-cyan/70 to-transparent" aria-hidden />

            {/* Região de arraste mobile: handle + cabeçalho. touch-none entrega o gesto ao hook. */}
            <div className="shrink-0 touch-none lg:touch-auto" {...(isMobile ? dragRegionProps : {})}>
                {/* Handle de arraste — apenas mobile. Toque cicla minimizado/meio/expandido. */}
                <button
                    type="button"
                    onClick={onHandleTap}
                    aria-label={en ? 'Toggle panel size' : 'Alternar tamanho do painel'}
                    className="flex w-full justify-center pb-0 pt-1.5 outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan lg:hidden"
                >
                    <span className="h-1 w-8 rounded-full bg-white/20" aria-hidden />
                </button>

                <div className="flex min-h-0 shrink-0 items-start justify-between gap-2 px-4 pt-1.5 lg:px-4 lg:pt-4">
                    <div className="min-w-0">
                        {eyebrow ? (
                            <div className="flex items-center gap-1.5">
                                {eyebrowPrefix ?? null}
                                {dotColor ? (
                                    <span
                                        className="inline-block size-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                                    />
                                ) : null}
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-signal-cyan/60 lg:text-[11px]">
                                    {eyebrow}
                                </div>
                            </div>
                        ) : null}
                        <div className="mt-1 truncate pb-1 text-[16px] font-bold tracking-tight text-white lg:text-[18px]">{title}</div>
                    </div>
                    {showCloseButton ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="-mr-0.5 -mt-0.5 shrink-0 rounded-full p-2 text-white/40 transition outline-none hover:bg-white/8 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            aria-label={closeLabel}
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Minimizado no mobile: corpo escondido, só o cabeçalho permanece. */}
            <div className={`flex min-h-0 flex-1 flex-col ${isMobile && snap === 'peek' ? 'hidden' : ''}`}>
                <PanelSheetContext.Provider value={sheetState}>
                    {children}
                </PanelSheetContext.Provider>
            </div>
        </div>
    );
}
