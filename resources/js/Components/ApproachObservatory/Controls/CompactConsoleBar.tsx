import { CalendarDays, ChevronDown, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { Translator } from '@/i18n';
import { ApproachObservatoryFilters } from '@/types';

type ConsoleForm = {
    date: string;
    type: ApproachObservatoryFilters['type'];
};

type Props = {
    form: ConsoleForm;
    onFormChange: (form: ConsoleForm) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onPresetDateSelect: (date: string) => void;
    query: string;
    onQueryChange: (value: string) => void;
    isUpdating: boolean;
    errors: { date_min?: string; date_max?: string; type?: string };
    t: Translator;
};

export function CompactConsoleBar({
    form,
    onFormChange,
    onSubmit,
    onPresetDateSelect,
    query,
    onQueryChange,
    isUpdating,
    errors,
    t,
}: Props) {
    const today = dayOffset(0);
    const yesterday = dayOffset(-1);
    const tomorrow = dayOffset(1);
    const [mobileOpen, setMobileOpen] = useState(false);

    const errorMessage = errors.date_min ?? errors.date_max ?? errors.type;

    const controlsBody = (compact: boolean) => (
        <div
            className={
                compact
                    ? 'flex flex-wrap items-center gap-2'
                    : 'flex flex-col gap-3'
            }
        >
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('observatory.controls.day')}>
                <Chip label={t('observatory.date.yesterday')} active={form.date === yesterday} onClick={() => onPresetDateSelect(yesterday)} />
                <Chip label={t('observatory.date.today')} active={form.date === today} onClick={() => onPresetDateSelect(today)} />
                <Chip label={t('observatory.date.tomorrow')} active={form.date === tomorrow} onClick={() => onPresetDateSelect(tomorrow)} />
            </div>

            <div className={compact ? 'h-5 w-px bg-white/10' : 'hidden'} aria-hidden="true" />

            <label className="flex items-center gap-1.5 text-xs text-white/55" title={t('observatory.date.manual')}>
                <CalendarDays className="size-3.5 text-signal-cyan/80" aria-hidden="true" />
                <input
                    type="date"
                    value={form.date}
                    onChange={(event) => onFormChange({ ...form, date: event.target.value })}
                    aria-label={t('observatory.date.manual')}
                    className="rounded border border-white/10 bg-space-950/70 px-2 py-1 text-xs text-white outline-none transition focus:border-signal-cyan"
                />
            </label>

            <label className="relative flex items-center gap-1.5 text-xs text-white/55" title={t('observatory.type')}>
                <select
                    value={form.type}
                    onChange={(event) => onFormChange({ ...form, type: event.target.value as ApproachObservatoryFilters['type'] })}
                    aria-label={t('observatory.type')}
                    className="appearance-none rounded border border-white/10 bg-space-950/70 py-1 pl-2 pr-7 text-xs text-white outline-none transition focus:border-signal-cyan"
                >
                    <option value="all">{t('observatory.all')}</option>
                    <option value="asteroid">{t('observatory.asteroids')}</option>
                    <option value="comet">{t('observatory.comets')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-white/45" aria-hidden="true" />
            </label>

            <div className={compact ? 'relative flex-1 min-w-[12rem]' : 'relative'}>
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-white/40" aria-hidden="true" />
                <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={t('observatory.console.search')}
                    aria-label={t('observatory.console.search')}
                    className="w-full rounded border border-white/10 bg-space-950/70 py-1 pl-7 pr-2 text-xs text-white placeholder:text-white/40 outline-none transition focus:border-signal-cyan"
                />
            </div>

            <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/85 outline-none transition hover:border-signal-cyan/45 hover:bg-signal-cyan/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-70"
            >
                <RefreshCw className={`size-3.5 ${isUpdating ? 'animate-spin' : ''}`} aria-hidden="true" />
                {isUpdating ? t('observatory.loading.submit') : t('observatory.console.update')}
            </button>
        </div>
    );

    return (
        <form
            onSubmit={onSubmit}
            aria-label={t('observatory.controls.day')}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur"
        >
            <div className="hidden lg:block">{controlsBody(true)}</div>

            <div className="lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen((value) => !value)}
                    aria-expanded={mobileOpen}
                    className="flex w-full items-center justify-between gap-2 text-left text-xs text-white/75"
                >
                    <span className="inline-flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3.5 text-signal-cyan/80" aria-hidden="true" />
                        {t('observatory.console.filters')} - {form.date}
                    </span>
                    <ChevronDown
                        className={`size-3.5 transition ${mobileOpen ? 'rotate-180 text-white' : 'text-white/55'}`}
                        aria-hidden="true"
                    />
                </button>
                {mobileOpen ? <div className="mt-3">{controlsBody(false)}</div> : null}
            </div>

            {errorMessage ? <p className="mt-2 text-[11px] text-signal-coral">{errorMessage}</p> : null}
        </form>
    );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-signal-cyan ' +
                (active
                    ? 'border-signal-cyan/55 bg-signal-cyan/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white')
            }
        >
            {label}
        </button>
    );
}

function dayOffset(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
