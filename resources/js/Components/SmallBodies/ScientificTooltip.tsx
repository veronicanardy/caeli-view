import { Info } from 'lucide-react';
import { PropsWithChildren } from 'react';

export function ScientificTooltip({ label, children }: PropsWithChildren<{ label: string }>) {
    return (
        <span className="group relative inline-flex items-center gap-1">
            {children}
            <span tabIndex={0} className="inline-flex rounded-full text-white/45 outline-none transition focus-visible:text-signal-cyan">
                <Info className="size-3.5" aria-label={label} />
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded border border-white/10 bg-space-950/95 px-3 py-2 text-xs leading-relaxed text-white/75 opacity-0 shadow-glow transition group-hover:opacity-100 group-focus-within:opacity-100">
                {label}
            </span>
        </span>
    );
}
