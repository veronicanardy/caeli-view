import { ChevronDown, Terminal } from 'lucide-react';
import { ReactNode, useState } from 'react';

type Props = {
    title: string;
    description: string;
    openLabel: string;
    closeLabel: string;
    count: number;
    children: ReactNode;
};

export function TechnicalDataPanel({ title, description, openLabel, closeLabel, count, children }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.025]">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left outline-none transition hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-signal-cyan sm:px-5"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/70">
                        <Terminal className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="mt-0.5 truncate text-xs text-white/50">{description}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-white/55">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5">{count}</span>
                    <span className="hidden sm:inline">{open ? closeLabel : openLabel}</span>
                    <ChevronDown className={`size-4 transition ${open ? 'rotate-180 text-signal-cyan' : ''}`} aria-hidden="true" />
                </div>
            </button>
            {open ? <div className="border-t border-white/10 p-3 sm:p-4">{children}</div> : null}
        </section>
    );
}
