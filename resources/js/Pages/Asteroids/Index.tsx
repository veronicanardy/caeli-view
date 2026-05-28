import { Head } from '@inertiajs/react';
import { Activity, Gauge, Ruler, ShieldAlert, Target } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { AsteroidCard } from '@/Components/AsteroidCard';
import { AsteroidTable } from '@/Components/AsteroidTable';
import { DateRangeFilter } from '@/Components/DateRangeFilter';
import { EmptyState } from '@/Components/EmptyState';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { PageHeader } from '@/Components/PageHeader';
import { StatCard } from '@/Components/StatCard';
import { compactKm, formatNumber } from '@/lib/format';
import { Asteroid, AsteroidStats, PageProps } from '@/types';

const AsteroidsByDayChart = lazy(() =>
    import('@/Components/Charts/AsteroidsByDayChart').then((m) => ({ default: m.AsteroidsByDayChart })),
);
const HazardChart = lazy(() =>
    import('@/Components/Charts/HazardChart').then((m) => ({ default: m.HazardChart })),
);
const TopAsteroidsChart = lazy(() =>
    import('@/Components/Charts/TopAsteroidsChart').then((m) => ({ default: m.TopAsteroidsChart })),
);

type Props = PageProps<{
    asteroids: Asteroid[];
    stats: AsteroidStats | null;
    filters: {
        start_date: string;
        end_date: string;
    };
    error?: string | null;
}>;

function ChartSkeleton() {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-glow">
            <div className="mb-4 flex items-center gap-3 text-sm text-white/60">
                <span className="size-2.5 animate-pulse rounded-full bg-signal-cyan" />
                Carregando gráfico…
            </div>
            <div className="h-48 animate-pulse rounded bg-white/[0.055]" />
        </div>
    );
}

export default function AsteroidIndex({ asteroids, stats, filters, errors = {}, error }: Props) {
    return (
        <AppLayout>
            <Head title="Asteroides" />
            <PageHeader
                eyebrow="NeoWs"
                title="Aproximações na vizinhança da Terra"
                description="Observe objetos próximos do nosso planeta por período, com distâncias, velocidades e dimensões estimadas em um painel pensado para leitura rápida."
            />
            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <DateRangeFilter action="/asteroides" startDate={filters.start_date} endDate={filters.end_date} errors={errors} />
                <ErrorMessage message={error} />

                {stats ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <StatCard label="Objetos no período" value={formatNumber(stats.total, 0)} icon={Activity} tone="cyan" />
                        <StatCard label="Potencialmente perigosos" value={formatNumber(stats.hazardous, 0)} icon={ShieldAlert} tone="coral" />
                        <StatCard label="Maior diâmetro médio" value={`${formatNumber(stats.largestDiameterKm, 3)} km`} icon={Ruler} tone="mint" />
                        <StatCard label="Maior velocidade" value={`${formatNumber(stats.fastestVelocityKmH, 0)} km/h`} icon={Gauge} tone="amber" />
                        <StatCard label="Menor distância" value={compactKm(stats.closestDistanceKm)} icon={Target} tone="cyan" />
                    </div>
                ) : null}

                {stats && asteroids.length > 0 ? (
                    <Suspense fallback={
                        <div className="grid gap-5 lg:grid-cols-2">
                            <ChartSkeleton />
                            <ChartSkeleton />
                            <ChartSkeleton />
                        </div>
                    }>
                        <div className="grid gap-5 lg:grid-cols-2">
                            <AsteroidsByDayChart data={stats.byDay} />
                            <HazardChart data={stats.hazardousBreakdown} />
                            <TopAsteroidsChart data={stats.topLargest} />
                        </div>
                    </Suspense>
                ) : null}

                {asteroids.length > 0 ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {asteroids.slice(0, 6).map((asteroid) => (
                                <AsteroidCard key={asteroid.id} asteroid={asteroid} />
                            ))}
                        </div>
                        <AsteroidTable asteroids={asteroids} />
                    </>
                ) : (
                    <EmptyState title="Nenhum viajante cósmico encontrado nesse intervalo." message="Tente ajustar as datas e iniciar uma nova observação." />
                )}
            </section>
        </AppLayout>
    );
}
