import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { LoadingState } from './LoadingState';

type DateRangeFilterProps = {
    action: string;
    startDate: string;
    endDate: string;
    errors?: Record<string, string>;
};

export function DateRangeFilter({ action, startDate, endDate, errors = {} }: DateRangeFilterProps) {
    const [start, setStart] = useState(startDate);
    const [end, setEnd] = useState(endDate);
    const [loading, setLoading] = useState(false);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(
            action,
            { start_date: start, end_date: end },
            {
                preserveState: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    return (
        <form onSubmit={submit} className="rounded border border-white/10 bg-white/[0.04] p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="text-sm text-white/70">
                    Data inicial
                    <input className="mt-2 w-full rounded border border-white/10 bg-space-900 px-3 py-2 text-white outline-none focus:border-signal-cyan" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
                    {errors.start_date ? <span className="mt-1 block text-xs text-signal-coral">{errors.start_date}</span> : null}
                </label>
                <label className="text-sm text-white/70">
                    Data final
                    <input className="mt-2 w-full rounded border border-white/10 bg-space-900 px-3 py-2 text-white outline-none focus:border-signal-cyan" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
                    {errors.end_date ? <span className="mt-1 block text-xs text-signal-coral">{errors.end_date}</span> : null}
                </label>
                <button className="light-button inline-flex h-10 items-center justify-center gap-2 rounded bg-signal-cyan px-4 text-sm font-semibold text-space-950" type="submit">
                    <Search className="size-4" aria-hidden="true" />
                    Observar
                </button>
            </div>
            {loading ? <div className="mt-4"><LoadingState /></div> : null}
        </form>
    );
}
