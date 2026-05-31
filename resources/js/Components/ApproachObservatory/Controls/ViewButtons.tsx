import type { ReactNode } from 'react';

export function ViewButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-full px-3 py-1 text-[12px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

export function IconViewButton({
    active,
    onClick,
    title,
    children,
}: {
    active: boolean;
    onClick: () => void;
    title: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={[
                'rounded-full p-1.5 transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white',
            ].join(' ')}
        >
            {children}
        </button>
    );
}
