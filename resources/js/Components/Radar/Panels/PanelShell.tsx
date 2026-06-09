/**
 * Shell visual comum dos painéis flutuantes.
 *
 * Em desktop: painel lateral fixo (left-3, top-30%).
 * Em mobile: bottom sheet com handle de arraste, backdrop e posicionamento bottom-0.
 */

import type { CSSProperties, ReactNode, Ref } from 'react';
import { X } from 'lucide-react';

type PanelShellProps = {
    onClose: () => void;
    closeLabel: string;
    showCloseButton?: boolean;
    eyebrow?: string;
    eyebrowPrefix?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    dotColor?: string;
    borderClass?: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    /** Em mobile, alinha ao topo (substitui o painel lateral) em vez de bottom. */
    mobileTopAlign?: boolean;
    panelRef?: Ref<HTMLDivElement>;
};

export function PanelShell({
    onClose,
    closeLabel,
    showCloseButton = true,
    eyebrow,
    eyebrowPrefix,
    title,
    subtitle,
    dotColor,
    borderClass = 'border-white/12',
    children,
    className = '',
    style,
    mobileTopAlign = false,
    panelRef,
}: PanelShellProps) {
    return (
        <>
            {/* Backdrop mobile: pointer-events-none para não bloquear toques na cena 3D.
                Fechar acontece pelo botão X ou selecionando outro objeto. */}
            <div
                className="pointer-events-none absolute inset-0 z-[19] lg:hidden"
                aria-hidden
            />

            <div
                ref={panelRef}
                style={{ ...style, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                className={[
                    'pointer-events-auto absolute z-20 overflow-hidden border cursor-auto',
                    'bg-space-950/96 shadow-[0_0_48px_rgba(34,211,238,0.12),0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl',
                    /* Mobile: bottom sheet largura total, canto superior arredondado */
                    'left-0 right-0 bottom-0 rounded-t-2xl',
                    /* Desktop: card lateral esquerdo com cantos completos */
                    'lg:left-3 lg:right-auto lg:bottom-auto lg:top-[30%] lg:-translate-y-1/2 lg:rounded-2xl',
                    borderClass,
                    className,
                ].join(' ')}
            >
                {/* Linha de acento ciano no topo */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-signal-cyan/70 to-transparent" aria-hidden />

                {/* Handle de arraste — apenas mobile */}
                <div className="flex justify-center pt-1.5 pb-0 lg:hidden" aria-hidden>
                    <div className="h-1 w-8 rounded-full bg-white/20" />
                </div>

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
                        <div className="mt-1 truncate text-[16px] font-bold tracking-tight text-white lg:text-[18px]">{title}</div>
                        {/* min-h reserva espaço mesmo sem subtítulo — evita salto de layout ao trocar objeto */}
                        <div className="mt-0.5 min-h-[1rem] truncate text-[11px] text-white/50 lg:text-[12px]">
                            {subtitle ?? null}
                        </div>
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
                {children}
            </div>
        </>
    );
}
