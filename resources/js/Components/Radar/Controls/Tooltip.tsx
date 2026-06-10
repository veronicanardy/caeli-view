/**
 * Tooltip customizado do observatório.
 *
 * Aparece imediatamente no hover, some após 2s sem hover (hideDelay).
 * Quando um novo tooltip abre, o anterior fecha imediatamente.
 * Nunca usa o title nativo do navegador.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

// ID do tooltip atualmente visível — compartilhado entre todas as instâncias.
let activeTooltipId: number | null = null;
const listeners = new Set<() => void>();

function notifyOthers() {
    listeners.forEach((fn) => fn());
}

let nextId = 0;

type TooltipProps = {
    content: ReactNode;
    children: ReactNode;
    /** Posição do tooltip em relação ao trigger. Padrão: 'bottom'. */
    side?: 'bottom' | 'top';
    /** Alinhamento horizontal. Padrão: 'center'. */
    align?: 'center' | 'left' | 'right';
    /** ms sem hover antes de esconder. Padrão: 1000. */
    hideDelay?: number;
    /** Permite quebra de linha no conteúdo. Padrão: false (whitespace-nowrap). */
    wrap?: boolean;
    /** Offset adicional em px entre o trigger e o balão. */
    offset?: number;
    className?: string;
};

export function Tooltip({
    content,
    children,
    side = 'bottom',
    align = 'center',
    hideDelay = 1000,
    wrap = false,
    offset,
    className = '',
}: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const id = useRef(nextId++);

    useEffect(() => {
        const check = () => {
            if (activeTooltipId !== id.current) {
                if (hideTimer.current) clearTimeout(hideTimer.current);
                setVisible(false);
            }
        };
        listeners.add(check);
        return () => { listeners.delete(check); };
    }, []);

    const show = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        activeTooltipId = id.current;
        notifyOthers();
        setVisible(true);
    };

    const hide = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            if (activeTooltipId === id.current) activeTooltipId = null;
            setVisible(false);
        }, hideDelay);
    };

    const posY = side === 'top'
        ? 'bottom-full'
        : 'top-full';

    const posX = align === 'left'
        ? 'left-0'
        : align === 'right'
            ? 'right-0'
            : 'left-1/2 -translate-x-1/2';

    const arrowY = side === 'top'
        ? 'bottom-0 translate-y-1/2 rotate-[225deg]'
        : 'top-0 -translate-y-1/2 rotate-45';

    const arrowX = align === 'left'
        ? 'left-3'
        : align === 'right'
            ? 'right-3'
            : 'left-1/2 -translate-x-1/2';

    return (
        <span
            className={['relative inline-flex', className].join(' ')}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children}
            <span
                role="tooltip"
                style={offset != null ? (side === 'top' ? { marginBottom: offset } : { marginTop: offset }) : undefined}
                className={[
                    `pointer-events-none absolute z-[120] hidden ${wrap ? 'whitespace-normal' : 'whitespace-nowrap'} rounded-md border border-signal-cyan/35 bg-[#07111f]`,
                    'px-2.5 py-1.5 text-[11px] font-medium text-white/80',
                    side === 'top' ? 'mb-2' : 'mt-2',
                    'shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(34,211,238,0.14)]',
                    'transition-[opacity,transform] duration-150 sm:block',
                    posY,
                    posX,
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-2px]',
                ].join(' ')}
            >
                <span
                    className={[
                        'absolute size-2 border-l border-t border-signal-cyan/35 bg-[#07111f]',
                        arrowY,
                        arrowX,
                    ].join(' ')}
                    aria-hidden
                />
                {content}
            </span>
        </span>
    );
}
