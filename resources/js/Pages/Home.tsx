import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Earth, Image, Orbit } from 'lucide-react';
import { AppLayout } from '@/Components/AppLayout';
import { CinematicHero } from '@/Components/Home/CinematicHero';
import { SectionTitle } from '@/Components/SectionTitle';
import { useTranslation } from '@/i18n';
import { HomePageData, PageProps } from '@/types';

const missionLinks = [
    {
        href: '/radar',
        icon: Orbit,
        titleKey: 'home.mission.approaches.title',
        textKey: 'home.mission.approaches.text',
    },
    {
        href: '/epic',
        icon: Earth,
        titleKey: 'home.mission.planet.title',
        textKey: 'home.mission.planet.text',
    },
    {
        href: '/apod',
        icon: Image,
        titleKey: 'home.mission.discovery.title',
        textKey: 'home.mission.discovery.text',
    },
] as const;

export default function Home({ apod, apodError, nextApproach, spaceNewsHighlight }: PageProps<HomePageData>) {
    const { t } = useTranslation();

    return (
        <AppLayout>
            <Head title={t('home.title')} />
            <CinematicHero apod={apod} apodError={apodError} nextApproach={nextApproach} spaceNewsHighlight={spaceNewsHighlight ?? null} />

            <section className="border-b border-white/10 bg-space-950/95 home-mission-section">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <SectionTitle
                        eyebrow={t('home.mission.eyebrow')}
                        title={t('home.mission.title')}
                        description={t('home.mission.description')}
                    />

                    <div className="mt-10 grid gap-8 border-t border-white/10 pt-8 md:grid-cols-3">
                        {missionLinks.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    className="group flex gap-4 text-left transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                >
                                    <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span>
                                        <span className="flex items-center gap-2 text-lg font-semibold text-white">
                                            {t(item.titleKey)}
                                            <ArrowRight className="size-4 text-signal-cyan transition group-hover:translate-x-1" aria-hidden="true" />
                                        </span>
                                        <span className="mt-3 block text-sm leading-6 text-white/62">{t(item.textKey)}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
