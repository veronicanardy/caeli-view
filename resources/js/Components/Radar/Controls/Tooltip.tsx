/**
 * Tooltip customizado do observatório.
 *
 * Aparece imediatamente no hover, some após 2s sem hover (hideDelay).
 * Quando um novo tooltip abre, o anterior fecha imediatamente.
 * Nunca usa o title nativo do navegador.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
    side?: 'bottom' | 'top' | 'right';
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
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const id = useRef(nextId++);
    const triggerRef = useRef<HTMLSpanElement>(null);

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
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            const gap = (offset ?? 0) + 8;
            if (side === 'right') {
                setCoords({ top: r.top + r.height / 2, left: r.right + gap });
            } else if (side === 'top') {
                setCoords({ top: r.top - gap, left: r.left + r.width / 2 });
            } else {
                setCoords({ top: r.bottom + gap, left: r.left + r.width / 2 });
            }
        }
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

    const transformOrigin = side === 'right'
        ? 'translateY(-50%)'
        : side === 'top'
            ? 'translateX(-50%)'
            : 'translateX(-50%)';

    const arrowClass = side === 'right'
        ? 'absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 border-l border-t border-signal-cyan/35 bg-[#07111f] rotate-[-135deg]'
        : side === 'top'
            ? 'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-2 border-l border-t border-signal-cyan/35 bg-[#07111f] rotate-[225deg]'
            : 'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 border-l border-t border-signal-cyan/35 bg-[#07111f] rotate-45';

    const balloon = coords ? (
        <span
            role="tooltip"
            style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                transform: transformOrigin,
                maxWidth: wrap ? '14rem' : undefined,
                zIndex: 9999,
            }}
            className={[
                `pointer-events-none hidden ${wrap ? 'whitespace-normal' : 'whitespace-nowrap'} rounded-md border border-signal-cyan/35 bg-[#07111f]`,
                'px-2.5 py-1.5 text-[11px] font-medium text-white/80',
                'shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(34,211,238,0.14)]',
                'transition-[opacity] duration-150 sm:block',
                visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
        >
            <span className={arrowClass} aria-hidden />
            {content}
        </span>
    ) : null;

    return (
        <span
            ref={triggerRef}
            className={['relative inline-flex', className].join(' ')}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children}
            {balloon && createPortal(balloon, document.body)}
        </span>
    );
}
