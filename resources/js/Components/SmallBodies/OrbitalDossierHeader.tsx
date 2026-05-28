import { Link } from '@inertiajs/react';
import { ArrowLeft, Orbit } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { SmallBody } from '@/types';
import { ObjectTypeBadge } from './ObjectTypeBadge';

export function OrbitalDossierHeader({ smallBody }: { smallBody: SmallBody }) {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden border-b border-white/10">
            <div className="absolute inset-0 star-field opacity-25" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-b from-space-950/20 via-space-950/72 to-space-950" aria-hidden="true" />
            <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <Link className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan" href="/radar" prefetch>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {t('object.backToObservatory')}
                </Link>
                <div className="mt-8 max-w-4xl">
                    <ObjectTypeBadge type={smallBody.objectType} />
                    <h1 className="mt-4 break-words text-4xl font-semibold tracking-normal text-white md:text-6xl">{smallBody.primaryName}</h1>
                    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/68">{t('object.header.description')}</p>
                    <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/65">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            <Orbit className="size-4 text-signal-cyan" aria-hidden="true" />
                            {smallBody.orbitClassDescription ?? smallBody.orbitClass ?? t('object.orbitClass.pending')}
                        </span>
                        {smallBody.designation ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{t('object.designation')} {smallBody.designation}</span> : null}
                        {smallBody.spkId ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">SPK {smallBody.spkId}</span> : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
