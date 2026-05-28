import { Head } from '@inertiajs/react';
import { Images, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/Components/AppLayout';
import { DateFilter } from '@/Components/DateFilter';
import { EmptyState } from '@/Components/EmptyState';
import { EpicImageCard } from '@/Components/EpicImageCard';
import { ErrorMessage } from '@/Components/ErrorMessage';
import { PageHeader } from '@/Components/PageHeader';
import { useTranslation } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/format';
import { EpicImage, PageProps } from '@/types';

type Props = PageProps<{
    date: string;
    images: EpicImage[];
    filters: {
        date: string;
    };
    error?: string | null;
}>;

export default function EpicIndex({ date, images, filters, errors = {}, error }: Props) {
    const [selected, setSelected] = useState<EpicImage | null>(null);
    const [currentDate, setCurrentDate] = useState(date);
    const [currentImages, setCurrentImages] = useState<EpicImage[]>(images);
    const [currentError, setCurrentError] = useState<string | null | undefined>(error);
    // Começa sem loading — dados já vieram do servidor
    const [loading, setLoading] = useState(false);
    const initialDateRef = useRef(filters.date);
    const { locale } = useTranslation();
    const en = locale === 'en';

    useEffect(() => {
        // Não faz fetch na montagem inicial — dados já estão nas props
        if (filters.date === initialDateRef.current) {
            return undefined;
        }

        const controller = new AbortController();

        setLoading(true);
        setSelected(null);
        setCurrentDate(filters.date);
        setCurrentImages([]);
        setCurrentError(null);

        fetch(`/epic/data?date=${encodeURIComponent(filters.date)}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('EPIC unavailable.');
                }

                return response.json() as Promise<{ date: string; images: EpicImage[]; error?: string | null }>;
            })
            .then((payload) => {
                setCurrentDate(payload.date);
                setCurrentImages(payload.images);
                setCurrentError(payload.error);
            })
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === 'AbortError') {
                    return;
                }

                setCurrentError(en ? 'Could not load EPIC records right now.' : 'Nao foi possivel carregar os registros EPIC agora.');
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
            <Head title="EPIC" />
            <PageHeader
                eyebrow="EPIC"
                title={en ? 'Earth seen from far away' : 'A Terra vista de longe'}
                description={en
                    ? 'Contemplate real records captured by the Earth Polychromatic Imaging Camera, prepared by the backend before reaching the gallery.'
                    : 'Contemple registros reais capturados pela Earth Polychromatic Imaging Camera, com imagens preparadas pelo backend antes de chegarem à galeria.'}
            />
            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                <DateFilter action="/epic" date={filters.date} errors={errors} />
                <ErrorMessage message={currentError} />

                <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
                    <span className="flex size-12 items-center justify-center rounded bg-signal-cyan/10 text-signal-cyan">
                        <Images className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-sm text-white/60">{en ? `Records from ${formatDate(currentDate)}` : `Registros de ${formatDate(currentDate)}`}</p>
                        {loading
                            ? <div className="mt-1 h-7 w-24 animate-pulse rounded bg-white/[0.08]" />
                            : <p className="mt-1 text-2xl font-semibold text-white">{formatNumber(currentImages.length, 0)} {en ? 'images' : 'imagens'}</p>
                        }
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] shadow-glow">
                                <div className="aspect-square animate-pulse bg-white/[0.055]" />
                                <div className="space-y-2 p-3">
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.07]" />
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.05]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : currentImages.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {currentImages.map((image) => (
                            <EpicImageCard key={image.identifier} image={image} onOpen={setSelected} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title={en ? 'Earth did not reveal records for this date.' : 'A Terra não revelou registros para esta data.'}
                        message={en ? 'Choose another day to contemplate the planet from a new perspective.' : 'Escolha outro dia para contemplar o planeta por uma nova perspectiva.'}
                    />
                )}
            </section>

            {selected ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/[0.78] p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-white/10 bg-space-900 shadow-glow">
                        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
                            <div>
                                <p className="text-xs uppercase text-signal-cyan">{formatDate(selected.date?.slice(0, 10))}</p>
                                <h2 className="mt-1 text-lg font-semibold text-white">{selected.identifier}</h2>
                            </div>
                            <button className="rounded bg-white/[0.08] p-2 text-white hover:bg-white/[0.14]" type="button" onClick={() => setSelected(null)} aria-label={en ? 'Close modal' : 'Fechar modal'}>
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                        {selected.imageUrl ? (
                            <img className="max-h-[70vh] w-full bg-black object-contain" src={selected.imageUrl} alt={selected.caption ?? selected.identifier} />
                        ) : null}
                        <div className="grid gap-4 p-5 text-sm text-white/70 md:grid-cols-3">
                            <p className="md:col-span-2">{selected.caption ?? (en ? 'No caption available.' : 'Sem legenda disponível.')}</p>
                            <dl className="space-y-2">
                                <div>
                                    <dt className="text-white/50">{en ? 'Image' : 'Imagem'}</dt>
                                    <dd className="break-words text-white">{selected.image}</dd>
                                </div>
                                <div>
                                    <dt className="text-white/50">{en ? 'Centroid coordinates' : 'Coordenadas do centroide'}</dt>
                                    <dd>{selected.centroidCoordinates ? JSON.stringify(selected.centroidCoordinates) : (en ? 'Unavailable' : 'Indisponível')}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            ) : null}
        </AppLayout>
    );
}
