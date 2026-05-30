import { Head } from '@inertiajs/react';
import { AppLayout } from '@/Components/AppLayout';
import { CinematicHero } from '@/Components/Home/CinematicHero';
import { useTranslation } from '@/i18n';
import { HomePageData, PageProps } from '@/types';

export default function Home({ apod, apodError, nextApproach, spaceNewsHighlight }: PageProps<HomePageData>) {
    const { t } = useTranslation();

    return (
        <AppLayout>
            <Head title={t('home.title')} />
            <CinematicHero apod={apod} apodError={apodError} nextApproach={nextApproach} spaceNewsHighlight={spaceNewsHighlight ?? null} />
        </AppLayout>
    );
}
