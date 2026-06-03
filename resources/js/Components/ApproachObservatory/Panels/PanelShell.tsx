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
    /** Texto do eyebrow acima do título. Estilizado automaticamente com cor do dot. */
    eyebrow?: string;
    /** Nó extra renderizado à esquerda do eyebrow (ex: botão "Lista" mobile). */
    eyebrowPrefix?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Cor do dot decorativo e do eyebrow (hex). Quando ausente, usa signal-cyan/60. */
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
        <div
            ref={panelRef}
            style={style}
            className={[
                /* Card dossiê: presença visual claramente maior que o painel de navegação lateral. */
                'pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 overflow-hidden rounded-2xl border',
                'bg-space-950/96 shadow-[0_0_48px_rgba(34,211,238,0.12),0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl',
                mobileTopAlign ? 'top-3' : 'bottom-10',
                'lg:left-3 lg:top-[30%] lg:bottom-auto lg:translate-x-0 lg:-translate-y-1/2',
                borderClass,
                className,
            ].join(' ')}
        >
            {/* Linha de acento ciano no topo — assinatura do dossiê; mais intensa que o painel lateral. */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-signal-cyan/70 to-transparent" aria-hidden />

            <div className="flex items-start justify-between gap-2 px-3 pt-3 lg:px-4 lg:pt-4">
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
