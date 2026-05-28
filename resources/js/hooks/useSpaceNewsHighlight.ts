import { useEffect, useState } from 'react';

export type SpaceNewsHighlight = {
    title: string;
    source: string;
    publishedAt: string;
    url: string;
};

type SpaceflightArticle = {
    title?: string;
    news_site?: string;
    published_at?: string;
    url?: string;
};

type SpaceflightResponse = {
    results?: SpaceflightArticle[];
};

type CachedSpaceNews = {
    expiresAt: number;
    data: SpaceNewsHighlight;
};

const SPACE_NEWS_CACHE_KEY = 'caeli-view:space-news-highlight';
const SPACE_NEWS_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const SPACE_NEWS_URL = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=5';
const SPACE_NEWS_TIMEOUT_MS = 4500;

export function useSpaceNewsHighlight(): { data: SpaceNewsHighlight | null; loading: boolean } {
    const [data, setData] = useState<SpaceNewsHighlight | null>(() => readCachedSpaceNews());
    const [loading, setLoading] = useState(!data);

    useEffect(() => {
        const cached = readCachedSpaceNews();

        if (cached) {
            setData(cached);
            setLoading(false);

            return undefined;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), SPACE_NEWS_TIMEOUT_MS);

        fetch(SPACE_NEWS_URL, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Spaceflight News unavailable.');
                }

                return response.json() as Promise<SpaceflightResponse>;
            })
            .then((payload) => {
                const highlight = normalizeArticle(payload.results?.[0]);

                if (!highlight) {
                    throw new Error('No Spaceflight News article available.');
                }

                writeCachedSpaceNews(highlight);
                setData(highlight);
            })
            .catch((error: unknown) => {
                if (import.meta.env.DEV) {
                    console.debug('[space-news] unavailable:', error);
                }
            })
            .finally(() => {
                window.clearTimeout(timeout);
                setLoading(false);
            });

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, []);

    return { data, loading };
}

function normalizeArticle(article: SpaceflightArticle | undefined): SpaceNewsHighlight | null {
    if (!article?.title || !article.url || !article.published_at) {
        return null;
    }

    return {
        title: article.title,
        source: article.news_site ?? 'Spaceflight News',
        publishedAt: article.published_at,
        url: article.url,
    };
}

function readCachedSpaceNews(): SpaceNewsHighlight | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const value = window.localStorage.getItem(SPACE_NEWS_CACHE_KEY);

        if (!value) {
            return null;
        }

        const parsed = JSON.parse(value) as Partial<CachedSpaceNews>;

        if (
            !parsed.data
            || typeof parsed.expiresAt !== 'number'
            || parsed.expiresAt <= Date.now()
            || typeof parsed.data.title !== 'string'
            || typeof parsed.data.url !== 'string'
            || typeof parsed.data.publishedAt !== 'string'
        ) {
            window.localStorage.removeItem(SPACE_NEWS_CACHE_KEY);

            return null;
        }

        return {
            title: parsed.data.title,
            source: parsed.data.source || 'Spaceflight News',
            publishedAt: parsed.data.publishedAt,
            url: parsed.data.url,
        };
    } catch {
        window.localStorage.removeItem(SPACE_NEWS_CACHE_KEY);

        return null;
    }
}

function writeCachedSpaceNews(data: SpaceNewsHighlight): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(SPACE_NEWS_CACHE_KEY, JSON.stringify({
        data,
        expiresAt: Date.now() + SPACE_NEWS_CACHE_TTL_MS,
    }));
}
