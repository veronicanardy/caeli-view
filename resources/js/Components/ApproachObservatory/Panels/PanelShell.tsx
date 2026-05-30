import type { ReactNode } from 'react';

type PanelShellProps = {
    onClose: () => void;
    closeLabel: string;
    /** Conteúdo da linha de subtítulo acima do título principal. */
    eyebrow?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Cor do dot decorativo (hex). Quando ausente, o dot não é exibido. */
    dotColor?: string;
    /** Borda colorida do container — padrão: branca/15. */
    borderClass?: string;
    children: ReactNode;
    className?: string;
    /** Em mobile, alinha ao topo (substitui o painel lateral) em vez de bottom. */
    mobileTopAlign?: boolean;
};

/**
 * Shell comum dos painéis flutuantes da cena 3D (FocusCard, BodyInfoCard).
 * Garante posicionamento, bordas, backdrop e estrutura de header consistentes.
 */
export function PanelShell({
    onClose,
    closeLabel,
    eyebrow,
    title,
    subtitle,
    dotColor,
    borderClass = 'border-white/15',
    children,
    className = '',
    mobileTopAlign = false,
}: PanelShellProps) {
    return (
        <div
            className={[
                'pointer-events-auto absolute left-3 z-20 overflow-hidden rounded-xl border bg-space-950/92 shadow-glow backdrop-blur-xl',
                // Mobile: top-3 quando substitui painel, bottom-10 caso contrário
                mobileTopAlign ? 'top-3' : 'bottom-10',
                // Desktop: sempre centralizado verticalmente
                'sm:top-[54%] sm:bottom-auto sm:-translate-y-1/2',
                borderClass,
                className,
            ].join(' ')}
        >
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
                <div className="min-w-0">
                    {eyebrow ? (
                        <div className="flex items-center gap-2">
                            {dotColor ? (
                                <span
                                    className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                                    style={{ backgroundColor: dotColor }}
                                />
                            ) : null}
                            <div className="text-[11px] uppercase tracking-wide text-white/45">{eyebrow}</div>
                        </div>
                    ) : null}
                    <div className="mt-0.5 truncate text-base font-semibold text-white">{title}</div>
                    {subtitle ? (
                        <div className="truncate text-[12px] text-white/55">{subtitle}</div>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-white/55 transition outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    aria-label={closeLabel}
                >
                    ×
                </button>
            </div>
            {children}
        </div>
    );
}
