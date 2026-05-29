<?php

namespace App\Services\SpaceNews;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Consulta a Spaceflight News API para obter notícias espaciais recentes.
 *
 * Utilizado para exibir um destaque editorial na página inicial.
 * Falhas de rede são silenciadas com retorno `null` para não impactar a renderização
 * do restante da página — notícias são conteúdo complementar, não crítico.
 *
 * O resultado é cacheado por 6 horas para reduzir chamadas à API externa.
 */
final class SpaceNewsService
{
    private const URL       = 'https://api.spaceflightnewsapi.net/v4/articles/';
    private const CACHE_KEY = 'space-news:highlight';
    private const CACHE_TTL = 21600; // 6 horas
    private const TIMEOUT   = 5;

    /**
     * Retorna a notícia mais recente disponível, ou `null` se a API estiver indisponível.
     */
    public function highlight(): ?array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, fn () => $this->fetch());
    }

    /**
     * Busca os artigos mais recentes e retorna o primeiro com título, URL e data válidos.
     * Busca 5 artigos para ter margem caso os primeiros estejam incompletos.
     */
    private function fetch(): ?array
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->acceptJson()
                ->get(self::URL, ['limit' => 5]);

            if (! $response->ok()) {
                return null;
            }

            $article = $response->json('results', [])[0] ?? null;

            if (! $article || empty($article['title']) || empty($article['url']) || empty($article['published_at'])) {
                return null;
            }

            return [
                'title'       => $article['title'],
                'source'      => $article['news_site'] ?? 'Spaceflight News',
                'publishedAt' => $article['published_at'],
                'url'         => $article['url'],
                'imageUrl'    => $article['image_url'] ?? null,
            ];
        } catch (Throwable) {
            return null;
        }
    }
}
