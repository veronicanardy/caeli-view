import { CalendarDays, Search } from 'lucide-react';
import { FormEvent } from 'react';
import type { ReactNode } from 'react';
import type { Translator } from '@/i18n';
import { ApproachObservatoryFilters } from '@/types';

type ObservationForm = {
    date: string;
    type: ApproachObservatoryFilters['type'];
};

type Props = {
    form: ObservationForm;
    onFormChange: (form: ObservationForm) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onPresetDateSelect?: (date: string) => void;
    query: string;
    onQueryChange: (value: string) => void;
    isUpdating: boolean;
    errors: { date_min?: string; date_max?: string; type?: string };
    t: Translator;
    compact?: boolean;
};

export function ObservationControls({ form, onFormChange, onSubmit, onPresetDateSelect, query, onQueryChange, isUpdating, errors, t, compact = false }: Props) {
    const today = dayOffset(0);
    const yesterday = dayOffset(-1);
    const tomorrow = dayOffset(1);

    return (
        <form
            onSubmit={onSubmit}
            className={`rounded-lg border border-white/10 bg-white/[0.07] shadow-glow ${compact ? 'p-3 sm:p-3.5' : 'p-3 sm:p-4'}`}
            aria-label={t('observatory.controls.day')}
        >
            <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-signal-cyan">
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {t('observatory.controls.day')}
                        </div>
                        {!compact ? <p className="mt-1 text-xs text-white/45">{t('observatory.filterNote')}</p> : null}
                    </div>

                    <button
                        type="submit"
                        disabled={isUpdating}
                        className={`light-button shrink-0 rounded border border-signal-cyan/70 bg-signal-cyan/30 font-semibold text-white shadow-[0_0_22px_rgba(84,214,214,0.28)] outline-none transition hover:bg-signal-cyan/38 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-70 ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'}`}
                    >
                        {isUpdating ? t('observatory.loading.submit') : t('observatory.update')}
                    </button>
                </div>

                {compact ? (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <DatePreset label={t('observatory.date.yesterday')} active={form.date === yesterday} onClick={() => onPresetDateSelect ? onPresetDateSelect(yesterday) : onFormChange({ ...form, date: yesterday })} />
                            <DatePreset label={t('observatory.date.today')} active={form.date === today} onClick={() => onPresetDateSelect ? onPresetDateSelect(today) : onFormChange({ ...form, date: today })} />
                            <DatePreset label={t('observatory.date.tomorrow')} active={form.date === tomorrow} onClick={() => onPresetDateSelect ? onPresetDateSelect(tomorrow) : onFormChange({ ...form, date: tomorrow })} />
                        </div>

                        <div className="grid gap-2.5 lg:grid-cols-[minmax(11rem,0.85fr)_10rem_minmax(13rem,1fr)]">
                            <CompactField label={t('observatory.date.manual')} labelClassName="text-sm font-medium text-white/90" error={errors.date_min ?? errors.date_max}>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(event) => onFormChange({ ...form, date: event.target.value })}
                                    className="w-full rounded border border-white/20 bg-space-950/78 px-2.5 py-1.5 text-sm text-white outline-none focus:border-signal-cyan"
                                />
                            </CompactField>

                            <CompactField label={t('observatory.type')} labelClassName="text-sm font-medium text-white/90" error={errors.type}>
                                <select
                                    value={form.type}
                                    onChange={(event) => onFormChange({ ...form, type: event.target.value as ApproachObservatoryFilters['type'] })}
                                    className="w-full rounded border border-white/20 bg-space-950/78 px-2.5 py-1.5 text-sm text-white outline-none focus:border-signal-cyan"
                                >
                                    <option value="all">{t('observatory.all')}</option>
                                    <option value="asteroid">{t('observatory.asteroids')}</option>
                                    <option value="comet">{t('observatory.comets')}</option>
                                </select>
                            </CompactField>

                            <CompactField label={t('observatory.search')} labelClassName="text-sm font-medium text-white/90">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/50" aria-hidden="true" />
                                    <input
                                        value={query}
                                        onChange={(event) => onQueryChange(event.target.value)}
                                        placeholder={t('observatory.search')}
                                        className="w-full rounded border border-white/20 bg-space-950/78 py-1.5 pl-8 pr-2.5 text-sm text-white placeholder:text-white/55 outline-none focus:border-signal-cyan"
                                    />
                                </div>
                            </CompactField>
                        </div>
                    </>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_minmax(13rem,0.9fr)]">
                        <div className="flex flex-wrap gap-2">
                            <DatePreset label={t('observatory.date.yesterday')} active={form.date === yesterday} onClick={() => onPresetDateSelect ? onPresetDateSelect(yesterday) : onFormChange({ ...form, date: yesterday })} />
                            <DatePreset label={t('observatory.date.today')} active={form.date === today} onClick={() => onPresetDateSelect ? onPresetDateSelect(today) : onFormChange({ ...form, date: today })} />
                            <DatePreset label={t('observatory.date.tomorrow')} active={form.date === tomorrow} onClick={() => onPresetDateSelect ? onPresetDateSelect(tomorrow) : onFormChange({ ...form, date: tomorrow })} />
                            <CompactField label={t('observatory.date.manual')} labelClassName="text-sm font-medium text-white/90" error={errors.date_min ?? errors.date_max}>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(event) => onFormChange({ ...form, date: event.target.value })}
                                    className="w-full rounded border border-white/10 bg-space-950/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-signal-cyan"
                                />
                            </CompactField>
                        </div>

                        <CompactField label={t('observatory.type')} labelClassName="text-sm font-medium text-white/90" error={errors.type}>
                            <select
                                value={form.type}
                                onChange={(event) => onFormChange({ ...form, type: event.target.value as ApproachObservatoryFilters['type'] })}
                                className="w-full rounded border border-white/10 bg-space-950/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-signal-cyan"
                            >
                                <option value="all">{t('observatory.all')}</option>
                                <option value="asteroid">{t('observatory.asteroids')}</option>
                                <option value="comet">{t('observatory.comets')}</option>
                            </select>
                        </CompactField>

                        <CompactField label={t('observatory.search')} labelClassName="text-sm font-medium text-white/90">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" aria-hidden="true" />
                                <input
                                    value={query}
                                    onChange={(event) => onQueryChange(event.target.value)}
                                    placeholder={t('observatory.search')}
                                    className="w-full rounded border border-white/10 bg-space-950/60 py-1.5 pl-8 pr-2.5 text-sm text-white placeholder:text-white/55 outline-none focus:border-signal-cyan"
                                />
                            </div>
                        </CompactField>
                    </div>
                )}
            </div>
        </form>
    );
}

function DatePreset({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-signal-cyan ${
                active
                    ? 'border-signal-cyan/60 bg-signal-cyan/18 text-white shadow-[0_0_18px_rgba(84,214,214,0.18)]'
                    : 'border-white/10 bg-white/[0.045] text-white/62 hover:border-white/20 hover:text-white'
            }`}
        >
            {label}
        </button>
    );
}

function CompactField({
    label,
    error,
    labelClassName,
    children,
}: {
    label: string;
    error?: string;
    labelClassName?: string;
    children: ReactNode;
}) {
    return (
        <label className="block min-w-[150px] flex-1">
            <span className={`block text-xs text-white/65 ${labelClassName ?? ''}`.trim()}>{label}</span>
            <span className="mt-1 block">{children}</span>
            {error ? <span className="mt-0.5 block text-[11px] text-signal-coral">{error}</span> : null}
        </label>
    );
}

function dayOffset(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
}
