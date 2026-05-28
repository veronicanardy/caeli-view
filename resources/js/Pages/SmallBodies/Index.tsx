import { Head, router } from '@inertiajs/react';
import { Grid2X2, List, Search, SlidersHorizontal } from 'lucide-react';
import { FormEvent, lazy, ReactNode, Suspense, useMemo, useState } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { EmptyState } from '@/Components/EmptyState';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { PageHeader } from '@/Components/PageHeader';
import { ApproachVisualMap } from '@/Components/SmallBodies/ApproachVisualMap';

const ApproachOverviewCharts = lazy(() =>
    import('@/Components/SmallBodies/ApproachOverviewCharts').then((m) => ({ default: m.ApproachOverviewCharts })),
);
import { CloseApproachCard } from '@/Components/SmallBodies/CloseApproachCard';
import { CloseApproachTable } from '@/Components/SmallBodies/CloseApproachTable';
import { SmallBodySummaryCards } from '@/Components/SmallBodies/SmallBodySummaryCards';
import { JplApproachCharts, JplApproachSummary, JplCloseApproach, JplCloseApproachFilters, PageProps } from '@/types';

type Props = PageProps<{
    approaches: JplCloseApproach[];
    summary: JplApproachSummary | null;
    charts: JplApproachCharts | null;
    filters: JplCloseApproachFilters;
    error?: string | null;
}>;

export default function SmallBodiesIndex({ approaches, summary, charts, filters, errors = {}, error }: Props) {
    const [form, setForm] = useState(filters);
    const [query, setQuery] = useState('');
    const [view, setView] = useState<'cards' | 'table'>('cards');
    const [sortKey, setSortKey] = useState('calendarDate');

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return approaches
            .filter((approach) => {
                if (!needle) {
                    return true;
                }

                return [approach.displayName, approach.designation, approach.fullName].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
            })
            .sort((left, right) => compareApproaches(left, right, sortKey));
    }, [approaches, query, sortKey]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get('/radar', {
            date_min: form.date_min,
            date_max: form.date_max,
            type: form.type,
        }, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title="Consulta JPL" />
            <PageHeader
                eyebrow="JPL Solar System Dynamics"
                title="Consulta JPL de aproximações"
                description="Acompanhe corpos que atravessam a vizinhança da Terra — asteroides, cometas e outros pequenos mundos em movimento."
            />
            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <SlidersHorizontal className="size-4 text-signal-cyan" aria-hidden="true" />
                        Controles de observação
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <Field label="Data inicial" error={errors.date_min}>
                            <input className="w-full rounded border border-white/10 bg-space-950/60 px-3 py-2 text-white outline-none focus:border-signal-cyan" type="date" value={form.date_min} onChange={(event) => setForm({ ...form, date_min: event.target.value })} />
                        </Field>
                        <Field label="Data final" error={errors.date_max}>
                            <input className="w-full rounded border border-white/10 bg-space-950/60 px-3 py-2 text-white outline-none focus:border-signal-cyan" type="date" value={form.date_max} onChange={(event) => setForm({ ...form, date_max: event.target.value })} />
                        </Field>
                        <Field label="Tipo" error={errors.type}>
                            <select className="w-full rounded border border-white/10 bg-space-950/60 px-3 py-2 text-white outline-none focus:border-signal-cyan" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as JplCloseApproachFilters['type'] })}>
                                <option value="all">Todos</option>
                                <option value="asteroid">Asteroides</option>
                                <option value="comet">Cometas</option>
                            </select>
                        </Field>
                        <Field label="Distância máxima" error={errors.dist_max}>
                            <input className="w-full rounded border border-white/10 bg-space-950/60 px-3 py-2 text-white outline-none focus:border-signal-cyan" value={form.dist_max} onChange={(event) => setForm({ ...form, dist_max: event.target.value })} placeholder="0.2 ou 10LD" />
                        </Field>
                        <div className="flex items-end">
                            <button className="light-button w-full rounded border border-signal-cyan/40 bg-signal-cyan/15 px-4 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan" type="submit">
                                Atualizar observação
                            </button>
                        </div>
                    </div>
                </form>

                <ErrorMessage message={error} />

                {summary ? <SmallBodySummaryCards summary={summary} /> : null}
                {charts ? (
                    <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-white/[0.035]" />}>
                        <ApproachOverviewCharts charts={charts} />
                    </Suspense>
                ) : null}
                {approaches.length ? <ApproachVisualMap approaches={filtered} /> : null}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="relative block md:w-96">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                        <input className="w-full rounded border border-white/10 bg-white/[0.045] py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-signal-cyan" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou designação" />
                    </label>
                    <div className="flex gap-2">
                        <button className={`rounded border px-3 py-2 text-sm ${view === 'cards' ? 'border-signal-cyan/50 bg-signal-cyan/15' : 'border-white/10 bg-white/[0.045]'}`} onClick={() => setView('cards')} type="button">
                            <Grid2X2 className="inline size-4" aria-hidden="true" /> Cards
                        </button>
                        <button className={`rounded border px-3 py-2 text-sm ${view === 'table' ? 'border-signal-cyan/50 bg-signal-cyan/15' : 'border-white/10 bg-white/[0.045]'}`} onClick={() => setView('table')} type="button">
                            <List className="inline size-4" aria-hidden="true" /> Tabela
                        </button>
                    </div>
                </div>

                {filtered.length ? (
                    view === 'cards' ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((approach) => <CloseApproachCard key={`${approach.designation}-${approach.julianDate}`} approach={approach} />)}
                        </div>
                    ) : (
                        <CloseApproachTable approaches={filtered} sortKey={sortKey} onSort={setSortKey} />
                    )
                ) : (
                    <EmptyState title="Nenhum viajante encontrado nesse recorte." message="Ajuste datas, distância ou tipo de objeto para abrir uma nova janela de observação." />
                )}
            </section>
        </AppLayout>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="text-sm text-white/60">{label}</span>
            <span className="mt-2 block">{children}</span>
            {error ? <span className="mt-1 block text-xs text-signal-coral">{error}</span> : null}
        </label>
    );
}

function compareApproaches(left: JplCloseApproach, right: JplCloseApproach, key: string): number {
    const leftValue = left[key as keyof JplCloseApproach];
    const rightValue = right[key as keyof JplCloseApproach];

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
        return (leftValue as number | null ?? Number.POSITIVE_INFINITY) - (rightValue as number | null ?? Number.POSITIVE_INFINITY);
    }

    return String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
}
