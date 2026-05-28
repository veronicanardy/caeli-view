import { Link } from '@inertiajs/react';
import { ArrowRight, ExternalLink, Image, PlayCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/lib/format';
import { Apod } from '@/types';

type ApodFeatureProps = {
    apod: Apod | null;
    error?: string | null;
    compact?: boolean;
};

export function ApodFeature({ apod, error, compact = false }: ApodFeatureProps) {
    const { locale } = useTranslation();

    if (error) {
        return (
            <div className="rounded-xl border border-signal-coral/25 bg-signal-coral/10 p-6 text-signal-coral">
                <p className="font-semibold">{locale === 'en' ? 'The astronomical window did not open right now' : 'A janela astronômica não abriu agora'}</p>
                <p className="mt-2 text-sm leading-6">{error}</p>
            </div>
        );
    }

    if (!apod) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
                {locale === 'en' ? 'Could not load today astronomical discovery.' : 'Não foi possível carregar a descoberta astronômica do dia.'}
            </div>
        );
    }

    return (
        <article className={`overflow-hidden rounded-xl border border-white/10 bg-space-950/70 shadow-glow backdrop-blur ${compact ? '' : 'lg:grid lg:grid-cols-[1.1fr_0.9fr]'}`}>
            <div className="relative min-h-80 bg-space-900">
                {apod.isImage && apod.displayUrl ? (
                    <img className="h-full min-h-80 w-full object-cover transition duration-500 hover:scale-[1.025] hover:brightness-110" src={apod.displayUrl} alt={apod.title} loading="lazy" />
                ) : (
                    <div className="flex min-h-80 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(84,214,214,0.22),transparent_18rem)] p-8 text-center">
                        <div>
                            <PlayCircle className="mx-auto size-14 text-signal-cyan" aria-hidden="true" />
                            <p className="mt-4 text-lg font-semibold text-white">{locale === 'en' ? 'Today discovery is in motion.' : 'A descoberta de hoje está em movimento.'}</p>
                            <p className="mt-2 text-sm text-white/65">{locale === 'en' ? 'Open NASA original record in a new tab to watch safely.' : 'Abra o registro original da NASA em uma nova aba para assistir com segurança.'}</p>
                        </div>
                    </div>
                )}
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                    {apod.isImage ? <Image className="size-4" aria-hidden="true" /> : <PlayCircle className="size-4" aria-hidden="true" />}
                    {apod.isImage ? (locale === 'en' ? 'Real NASA image' : 'Imagem real da NASA') : (locale === 'en' ? 'NASA video' : 'Vídeo da NASA')}
                </div>
            </div>
            <div className="flex flex-col justify-between p-6">
                <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-signal-cyan">{formatDate(apod.date)}</p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">{apod.title}</h2>
                    {apod.copyright ? <p className="mt-2 text-sm text-white/55">{locale === 'en' ? 'Credit' : 'Crédito'}: {apod.copyright}</p> : null}
                    <p className={`mt-5 text-sm leading-6 text-white/70 ${compact ? 'line-clamp-5' : ''}`}>
                        {apod.explanation ?? (locale === 'en' ? 'NASA did not send a description for this date.' : 'A NASA não enviou uma descrição para esta data.')}
                    </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                    {apod.isVideo && apod.videoUrl ? (
                        <a className="light-button inline-flex items-center gap-2 rounded bg-signal-cyan px-4 py-2 text-sm font-semibold text-space-950" href={apod.videoUrl} target="_blank" rel="noreferrer">
                            {locale === 'en' ? 'Open original record' : 'Abrir registro original'}
                            <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                    ) : null}
                    <Link className="light-button inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white" href={`/apod?date=${apod.date}`} prefetch>
                        {locale === 'en' ? 'View discovery details' : 'Ver detalhes da descoberta'}
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </article>
    );
}
