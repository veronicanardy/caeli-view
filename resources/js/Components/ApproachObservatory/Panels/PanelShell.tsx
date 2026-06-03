/**
 * Shell visual comum dos painéis flutuantes.
 *
 * Responsabilidade: padronizar posicionamento, header, bordas, backdrop e botão
 * de fechamento usados por cards como `FocusCard` e `BodyInfoCard`.
 */

import type { CSSProperties, ReactNode, Ref } from 'react';
import { X } from 'lucide-react';

type PanelShellProps = {
    onClose: () => void;
    closeLabel: string;
    showCloseButton?: boolean;
    /** Conteúdo da linha de subtítulo acima do título principal. */
    eyebrow?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Cor do dot decorativo (hex). Quando ausente, o dot não é exibido. */
    dotColor?: string;
    /** Borda colorida do container - padrão: branca/15. */
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
        <div
            ref={panelRef}
            style={style}
            className={[
                /* Camada de vidro: fundo escuro profundo com blur generoso e sombra de brilho ciano. */
                'pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 overflow-hidden rounded-2xl border',
                'bg-space-950/92 shadow-[0_0_32px_rgba(34,211,238,0.07),0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
                mobileTopAlign ? 'top-3' : 'bottom-10',
                'lg:left-3 lg:top-[40%] lg:bottom-auto lg:translate-x-0 lg:-translate-y-1/2',
                borderClass,
                className,
            ].join(' ')}
        >
            {/* Linha de acento ciano no topo — assinatura visual do observatório. */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-signal-cyan/40 to-transparent" aria-hidden />

            <div className="flex items-start justify-between gap-2 px-3 pt-3 lg:px-4 lg:pt-4">
                <div className="min-w-0">
                    {eyebrow ? (
                        <div className="flex items-center gap-2">
                            {dotColor ? (
                                <span
                                    className="inline-block size-2 shrink-0 rounded-full shadow-[0_0_6px_currentColor]"
                                    style={{ backgroundColor: dotColor }}
                                />
                            ) : null}
                            <div className="text-[10px] font-medium uppercase tracking-widest text-white/35 lg:text-[11px]">{eyebrow}</div>
                        </div>
                    ) : null}
                    <div className="mt-1 truncate text-[15px] font-semibold tracking-tight text-white lg:text-[17px]">{title}</div>
                    {/* min-h reserva espaço mesmo sem subtítulo — evita salto de layout ao trocar objeto. */}
                    <div className="mt-0.5 min-h-[1rem] truncate text-[11px] text-white/50 lg:text-[12px]">
                        {subtitle ?? null}
                    </div>
                </div>
                {showCloseButton ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="-mr-0.5 -mt-0.5 shrink-0 rounded-full p-1.5 text-white/40 transition outline-none hover:bg-white/8 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        aria-label={closeLabel}
                    >
                        <X className="size-3.5" aria-hidden />
                    </button>
                ) : null}
            </div>
            {children}
        </div>
    );
}
