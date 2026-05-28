import { Link } from '@inertiajs/react';
import { ExternalLink, Image, PlayCircle, Sparkles } from 'lucide-react';
import { Apod } from '@/types';
import { formatDate } from '@/lib/format';

type NasaHighlightCardProps = {
    apod: Apod | null;
    error?: string | null;
};

export function NasaHighlightCard({ apod, error }: NasaHighlightCardProps) {
    if (apod?.isImage && apod.displayUrl) {
        return (
            <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-space-950/80 shadow-glow">
                <img
                    className="h-80 w-full object-cover transition duration-700 group-hover:scale-[1.035] group-hover:brightness-110 sm:h-[28rem]"
                    src={apod.displayUrl}
                    alt={`Registro astronômico da NASA: ${apod.title}`}
                    loading="eager"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/72 to-transparent p-5">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                        <Image className="size-4 text-signal-cyan" aria-hidden="true" />
                        APOD real de {formatDate(apod.date)}
                    </div>
                    <h2 className="text-xl font-semibold leading-tight text-white">{apod.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/70 line-clamp-3">
                        {apod.explanation ?? 'A NASA não enviou uma descrição para esta descoberta.'}
                    </p>
                </div>
            </article>
        );
    }

    if (apod?.isVideo) {
        return (
            <article className="rounded-xl border border-white/10 bg-white/[0.045] p-6 shadow-glow backdrop-blur">
                <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-signal-cyan/20 bg-[radial-gradient(circle_at_center,rgba(84,214,214,0.22),transparent_18rem)] p-8 text-center">
                    <PlayCircle className="size-14 text-signal-cyan" aria-hidden="true" />
                    <p className="mt-5 text-lg font-semibold text-white">A descoberta de hoje está em movimento.</p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/65">
                        Abra o registro original da NASA em uma nova aba para assistir com segurança.
                    </p>
                    {apod.videoUrl ? (
                        <a className="light-button mt-6 inline-flex items-center gap-2 rounded bg-signal-cyan px-4 py-2 text-sm font-semibold text-space-950" href={apod.videoUrl} target="_blank" rel="noreferrer">
                            Abrir registro original
                            <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                    ) : null}
                </div>
            </article>
        );
    }

    return (
        <article className="rounded-xl border border-white/10 bg-white/[0.045] p-6 shadow-glow backdrop-blur">
            <div className="relative min-h-80 overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_42%,rgba(84,214,214,0.22),transparent_13rem),linear-gradient(135deg,rgba(17,19,26,0.9),rgba(9,11,16,0.95))]">
                <div className="absolute inset-0 star-field opacity-35" aria-hidden="true" />
                <div className="orbital-ring absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
                <div className="orbital-ring orbital-ring-slow absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
                <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_28%,#f8c76b_0,#54d6d6_22%,#1c6b78_48%,#090b10_76%)] shadow-[0_0_90px_rgba(84,214,214,0.28)]" aria-hidden="true" />
                <div className="absolute inset-x-6 bottom-6 text-center">
                    <Sparkles className="mx-auto size-8 text-signal-amber" aria-hidden="true" />
                    <p className="mt-3 text-lg font-semibold text-white">Janela astronômica em preparação</p>
                    <p className="mt-2 text-sm leading-6 text-white/65">
                        {error ?? 'Quando a APOD estiver disponível, este painel exibirá o registro real enviado pela NASA.'}
                    </p>
                    <Link className="mt-5 inline-flex items-center justify-center rounded border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.12]" href="/apod">
                        Consultar APOD
                    </Link>
                </div>
            </div>
        </article>
    );
}
