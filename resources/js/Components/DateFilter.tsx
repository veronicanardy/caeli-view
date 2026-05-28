import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from '@/i18n';

type DateFilterProps = {
    action: string;
    date: string;
    errors?: Record<string, string>;
};

export function DateFilter({ action, date, errors = {} }: DateFilterProps) {
    const [value, setValue] = useState(date);
    const [loading, setLoading] = useState(false);
    const { locale } = useTranslation();

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(action, { date: value }, {
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    return (
        <form onSubmit={submit} className="rounded border border-white/10 bg-white/[0.04] p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm text-white/70">
                    {locale === 'en' ? 'Image date' : 'Data das imagens'}
                    <input className="mt-2 w-full rounded border border-white/10 bg-space-900 px-3 py-2 text-white outline-none focus:border-signal-cyan" type="date" value={value} onChange={(event) => setValue(event.target.value)} />
                    {errors.date ? <span className="mt-1 block text-xs text-signal-coral">{errors.date}</span> : null}
                </label>
                <button className="light-button inline-flex h-10 items-center justify-center gap-2 rounded bg-signal-cyan px-4 text-sm font-semibold text-space-950" type="submit" disabled={loading}>
                    <Search className="size-4" aria-hidden="true" />
                    {loading ? (locale === 'en' ? 'Observing' : 'Observando') : (locale === 'en' ? 'Observe' : 'Observar')}
                </button>
            </div>
        </form>
    );
}
