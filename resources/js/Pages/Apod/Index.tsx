import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { ApodFeature } from '@/Components/ApodFeature';
import { DateFilter } from '@/Components/DateFilter';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { PageHeader } from '@/Components/PageHeader';
import { useTranslation } from '@/i18n';
import { Apod, PageProps } from '@/types';

type Props = PageProps<{
    apod: Apod | null;
    filters: {
        date: string;
    };
    error?: string | null;
}>;

function ApodSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-space-950/70 shadow-glow lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="min-h-80 animate-pulse bg-white/[0.055]" />
            <div className="flex flex-col gap-4 p-6">
                <div className="h-3 w-24 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-7 w-3/4 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
                <div className="mt-2 space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                </div>
                <div className="mt-auto flex gap-3 pt-4">
                    <div className="h-9 w-36 animate-pulse rounded bg-white/[0.08]" />
                </div>
            </div>
        </div>
    );
}

export default function ApodIndex({ apod, filters, errors = {}, error }: Props) {
    const { locale } = useTranslation();
    const en = locale === 'en';
    const [currentApod, setCurrentApod] = useState<Apod | null>(apod);
    const [currentError, setCurrentError] = useState<string | null | undefined>(error);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setCurrentError(null);
        setCurrentApod(null);

        fetch(`/apod/data?date=${encodeURIComponent(filters.date)}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('APOD unavailable.');
                }

                return response.json() as Promise<{ apod: Apod | null; error?: string | null }>;
            })
            .then((payload) => {
                setCurrentApod(payload.apod);
                setCurrentError(payload.error);
            })
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === 'AbortError') {
                    return;
                }

                setCurrentError(en ? 'Could not load APOD right now.' : 'Nao foi possivel carregar a APOD agora.');
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [filters.date, en]);

    return (
        <AppLayout>
            <Head title="APOD" />
            <PageHeader
                eyebrow="Astronomy Picture of the Day"
                title={en ? 'Astronomical discovery of the day' : 'Descoberta astronômica do dia'}
                description={en
                    ? 'Open NASA daily record: an astronomical image or video fetched safely by the backend and cached by date.'
                    : 'Abra o registro diário da NASA: imagem ou vídeo astronômico preparado com consulta segura pelo backend e cache por data.'}
            />
            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <DateFilter action="/apod" date={filters.date} errors={errors} />
                <ErrorMessage message={currentError} />
                {loading ? <ApodSkeleton /> : <ApodFeature apod={currentApod} />}
            </section>
        </AppLayout>
    );
}
