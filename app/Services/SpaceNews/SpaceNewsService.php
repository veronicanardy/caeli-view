<?php

namespace App\Services\SpaceNews;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

final class SpaceNewsService
{
    private const URL = 'https://api.spaceflightnewsapi.net/v4/articles/';
    private const CACHE_KEY = 'space-news:highlight';
    private const CACHE_TTL = 21600; // 6 horas
    private const TIMEOUT = 5;

    public function highlight(): ?array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return $this->fetch();
        });
    }

    private function fetch(): ?array
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->acceptJson()
                ->get(self::URL, ['limit' => 5]);

            if (! $response->ok()) {
                return null;
            }

            $results = $response->json('results', []);
            $article = $results[0] ?? null;

            if (! $article || empty($article['title']) || empty($article['url']) || empty($article['published_at'])) {
                return null;
            }

            return [
                'title' => $article['title'],
                'source' => $article['news_site'] ?? 'Spaceflight News',
                'publishedAt' => $article['published_at'],
                'url' => $article['url'],
                'imageUrl' => $article['image_url'] ?? null,
            ];
        } catch (Throwable) {
            return null;
        }
    }
}
