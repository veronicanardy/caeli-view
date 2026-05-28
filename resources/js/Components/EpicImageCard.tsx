import { Eye } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/lib/format';
import { EpicImage } from '@/types';

type EpicImageCardProps = {
    image: EpicImage;
    onOpen: (image: EpicImage) => void;
};

export function EpicImageCard({ image, onOpen }: EpicImageCardProps) {
    const { locale } = useTranslation();

    return (
        <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-glow backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20">
            {image.imageUrl ? (
                <button className="block aspect-square w-full overflow-hidden bg-space-900" type="button" onClick={() => onOpen(image)}>
                    <img className="h-full w-full object-cover transition duration-300 hover:scale-105" src={image.imageUrl} alt={image.caption ?? `EPIC image ${image.identifier}`} loading="lazy" />
                </button>
            ) : (
                <div className="flex aspect-square items-center justify-center bg-space-900 text-sm text-white/50">{locale === 'en' ? 'Image unavailable' : 'Imagem indisponível'}</div>
            )}
            <div className="p-4">
                <p className="inline-flex rounded-full bg-signal-cyan/10 px-3 py-1 text-xs uppercase text-signal-cyan">{formatDate(image.date?.slice(0, 10))}</p>
                <h2 className="mt-3 break-words text-base font-semibold text-white">{image.identifier}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/60">{image.caption ?? (locale === 'en' ? 'No caption available.' : 'Sem legenda disponível.')}</p>
                <button className="mt-4 inline-flex items-center gap-2 rounded bg-white/[0.08] px-3 py-2 text-sm text-white transition hover:bg-white/[0.14]" type="button" onClick={() => onOpen(image)}>
                    <Eye className="size-4" aria-hidden="true" />
                    {locale === 'en' ? 'View details' : 'Ver detalhes'}
                </button>
            </div>
        </article>
    );
}
