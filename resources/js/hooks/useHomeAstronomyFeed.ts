import { useEffect, useState } from 'react';
import type { Apod, SpaceNewsHighlight, UnifiedApproach } from '@/types';

export type HomeFeed = {
    apod: Apod | null;
    apodError: string | null;
    nextApproach: UnifiedApproach | null;
    spaceNewsHighlight: SpaceNewsHighlight | null;
};

let cachedHomeFeed: HomeFeed | null = null;

export function useHomeAstronomyFeed(initialFeed: HomeFeed): { data: HomeFeed; loading: boolean } {
    const hasInitialData = Boolean(initialFeed.apod || initialFeed.apodError || initialFeed.nextApproach || initialFeed.spaceNewsHighlight);
    const [data, setData] = useState<HomeFeed>(cachedHomeFeed ?? initialFeed);
    const [loading, setLoading] = useState(!cachedHomeFeed && !hasInitialData);

    useEffect(() => {
        if (cachedHomeFeed || hasInitialData) {
            setLoading(false);

            return undefined;
        }

        const controller = new AbortController();

        fetch('/home/astronomy-feed', {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Home astronomy feed unavailable.');
                }

                return response.json() as Promise<HomeFeed>;
            })
            .then((feed) => {
                cachedHomeFeed = feed;
                setData(feed);
                setLoading(false);
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                setData({
                    apod: null,
                    apodError: 'NASA APOD indisponivel agora.',
                    nextApproach: null,
                    spaceNewsHighlight: null,
                });
                setLoading(false);
            });

        return () => controller.abort();
    }, [hasInitialData]);

    return { data, loading };
}
