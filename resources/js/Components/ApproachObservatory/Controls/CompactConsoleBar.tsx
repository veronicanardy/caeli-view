import { CalendarDays, ChevronDown } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import type { Translator } from '@/i18n';
import { RadarObjectControls } from './RadarObjectControls';
import type { ObjectLimit, SelectionMode } from '@/types';

type ConsoleForm = {
    date: string;
};

type Props = {
    form: ConsoleForm;
    onFormChange: (form: ConsoleForm) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    isUpdating: boolean;
    errors: { date_min?: string; date_max?: string };
    t: Translator;
    locale: 'pt-BR' | 'en';
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    radarLoading?: boolean;
};

/**
 * Barra superior de filtros do radar.
 *
 * No mobile ela vira um bloco recolhivel; no desktop, permanece aberta. A data
 * submete automaticamente para nao depender de um botao extra.
 */
export function CompactConsoleBar({
    form,
    onFormChange,
    onSubmit,
    isUpdating,
    errors,
    t,
    locale,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading = false,
}: Props) {
    const errorMessage = errors.date_min ?? errors.date_max;
    const [mobileOpen, setMobileOpen] = useState(false);
    const formRef = useRef<HTMLFormElement | null>(null);

    const requestSubmit = () => {
        requestAnimationFrame(() => formRef.current?.requestSubmit());
    };

    const currentModeLabel = (() => {
        if (locale === 'en') {
            if (selectionMode === 'upcoming') return 'Upcoming passes';
            if (selectionMode === 'attention') return 'Watch list';
            return 'Closest now';
        }
        if (selectionMode === 'upcoming') return 'Proximas aproximacoes';
        if (selectionMode === 'attention') return 'Maior atencao';
        return 'Mais proximos agora';
    })();

    const filtersContent = (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                <div className="min-w-0">
                    <RadarObjectControls
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        onLimitChange={onLimitChange}
                        onModeChange={onModeChange}
                        locale={locale}
                        loading={radarLoading}
                    />
                </div>

                <label className="flex min-w-[11rem] flex-col gap-1 text-xs text-white/60" title={t('observatory.date.manual')}>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {t('observatory.date.manual')}
                    </span>
                    <input
                        type="date"
                        value={form.date}
                        onChange={(event) => {
                            onFormChange({ ...form, date: event.target.value });
                            requestSubmit();
                        }}
                        aria-label={t('observatory.date.manual')}
                        className="rounded border border-white/10 bg-space-950/70 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-signal-cyan"
                    />
                </label>
            </div>
        </div>
    );

    return (
        <form
            ref={formRef}
            onSubmit={onSubmit}
            aria-label={t('observatory.controls.day')}
            className="relative z-30 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 backdrop-blur"
        >
            <div className="hidden lg:block">{filtersContent}</div>

            <div className="lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen((value) => !value)}
                    aria-expanded={mobileOpen}
                    className="flex w-full items-center justify-between gap-3 text-left"
                >
                    <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-signal-cyan/85">
                            {locale === 'en' ? 'Radar filters' : 'Filtros do radar'}
                        </div>
                        <div className="truncate pt-1 text-xs text-white/65">
                            {currentModeLabel} | {objectLimit} {locale === 'en' ? 'objects' : 'objetos'} | {form.date}
                        </div>
                    </div>
                    <ChevronDown
                        className={`size-4 shrink-0 text-white/55 transition ${mobileOpen ? 'rotate-180 text-white' : ''}`}
                        aria-hidden="true"
                    />
                </button>

                {mobileOpen ? <div className="pt-3">{filtersContent}</div> : null}
            </div>

            {errorMessage ? <p className="mt-2 text-[11px] text-signal-coral">{errorMessage}</p> : null}
            {isUpdating ? <p className="mt-2 text-[11px] text-white/45">{t('observatory.loading.submit')}</p> : null}
        </form>
    );
}
