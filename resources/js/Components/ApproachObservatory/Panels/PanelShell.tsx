import type { ReactNode, Ref } from 'react';

type PanelShellProps = {
    onClose: () => void;
    closeLabel: string;
    showCloseButton?: boolean;
    /** Conteudo da linha de subtitulo acima do titulo principal. */
    eyebrow?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Cor do dot decorativo (hex). Quando ausente, o dot nao e exibido. */
    dotColor?: string;
    /** Borda colorida do container - padrao: branca/15. */
    borderClass?: string;
    children: ReactNode;
    className?: string;
    /** Em mobile, alinha ao topo (substitui o painel lateral) em vez de bottom. */
    mobileTopAlign?: boolean;
    panelRef?: Ref<HTMLDivElement>;
};

/**
 * Shell comum dos paineis flutuantes da cena 3D (FocusCard, BodyInfoCard).
 * Garante posicionamento, bordas, backdrop e estrutura de header consistentes.
 */
export function PanelShell({
    onClose,
    closeLabel,
    showCloseButton = true,
    eyebrow,
    title,
    subtitle,
    dotColor,
    borderClass = 'border-white/15',
    children,
    className = '',
    mobileTopAlign = false,
    panelRef,
}: PanelShellProps) {
    return (
        <div
            ref={panelRef}
            className={[
                'pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 overflow-hidden rounded-xl border bg-space-950/92 shadow-glow backdrop-blur-xl',
                mobileTopAlign ? 'top-3' : 'bottom-10',
                'sm:left-3 sm:top-[54%] sm:bottom-auto sm:translate-x-0 sm:-translate-y-1/2',
                borderClass,
                className,
            ].join(' ')}
        >
            <div className="flex items-start justify-between gap-2 px-2.5 pt-2.5 sm:px-3 sm:pt-3">
                <div className="min-w-0">
                    {eyebrow ? (
                        <div className="flex items-center gap-2">
                            {dotColor ? (
                                <span
                                    className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                                    style={{ backgroundColor: dotColor }}
                                />
                            ) : null}
                            <div className="text-[10px] uppercase tracking-wide text-white/45 sm:text-[11px]">{eyebrow}</div>
                        </div>
                    ) : null}
                    <div className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base">{title}</div>
                    {subtitle ? (
                        <div className="truncate text-[11px] text-white/55 sm:text-[12px]">{subtitle}</div>
                    ) : null}
                </div>
                {showCloseButton ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="-mr-1 -mt-1 shrink-0 rounded-full border border-white/12 bg-white/6 p-1.5 text-white/70 transition outline-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        aria-label={closeLabel}
                    >
                        x
                    </button>
                ) : null}
            </div>
            {children}
        </div>
    );
}
