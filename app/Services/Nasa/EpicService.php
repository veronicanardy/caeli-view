<?php

namespace App\Services\Nasa;

use App\DTOs\Nasa\Epic\EpicImageData;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Consulta o endpoint EPIC (Earth Polychromatic Imaging Camera) da NASA.
 *
 * O EPIC é uma câmera a bordo do satélite DSCOVR que registra imagens diárias da Terra
 * em disco completo a partir do ponto de Lagrange L1. Este service oferece dois modos:
 *   - `imagesByDate()`: lista de imagens de uma data específica (para galeria)
 *   - `homeEarthImage()`: imagem mais recente disponível (para exibição no topo da página)
 *
 * Apenas imagens com URL válida do domínio oficial da NASA são retornadas; as demais
 * são descartadas para evitar quebra de layout por URLs expiradas ou malformadas.
 */
final class EpicService
{
    /** Coleção padrão: imagens em luz natural (versus enhanced/aerosol) */
    private const HOME_COLLECTION = 'natural';

    public function __construct(private readonly NasaHttpClient $client)
    {
    }

    /**
     * Retorna todas as imagens EPIC disponíveis para uma data específica no formato Y-m-d.
     * Usa stale-while-revalidate: serve o dado vencido imediatamente e revalida em background.
     */
    public function imagesByDate(string $date): array
    {
        $collection = self::HOME_COLLECTION;
        $key        = sprintf('nasa:epic:%s:%s', $collection, $date);
        $ttl        = (int) config('services.nasa.epic_cache_ttl', 86400);

        return Cache::flexible($key, [$ttl, $ttl + 3600], function () use ($collection, $date) {
            $endpoint = "/EPIC/api/{$collection}/date/{$date}";
            $response = $this->client->get($endpoint);

            Log::info('Consulta EPIC por data concluída.', [
                'endpoint'    => $endpoint,
                'date'        => $date,
                'collection'  => $collection,
                'image_count' => is_array($response) ? count($response) : 0,
            ]);

            $images = collect($response)
                ->filter(fn (mixed $image) => is_array($image))
                ->map(fn (array $image) => EpicImageData::fromArray($image)->toArray($collection))
                ->filter(fn (array $image) => is_string($image['imageUrl']) && str_starts_with($image['imageUrl'], 'https://epic.gsfc.nasa.gov/'))
                ->values()
                ->all();

            return [
                'date'   => $date,
                'images' => $images,
                'source' => 'NASA EPIC',
            ];
        });
    }

    /**
     * Retorna a imagem mais recente da Terra disponível no EPIC para uso como destaque na página.
     *
     * Estratégia de cache diferente de `imagesByDate()`: armazena o resultado processado diretamente
     * em vez de usar stale-while-revalidate, pois a imagem de destaque muda apenas uma vez ao dia
     * e a busca pela mais recente exige ordenação em memória após a resposta da API.
     */
    public function homeEarthImage(): array
    {
        $key    = 'nasa:epic:home-earth-image';
        $cached = Cache::get($key);

        if (is_array($cached)) {
            return $cached;
        }

        $collection = self::HOME_COLLECTION;
        $endpoint   = "/EPIC/api/{$collection}";
        $response   = $this->client->get($endpoint);

        if (! array_is_list($response)) {
            Log::warning('Consulta EPIC mais recente retornou JSON inesperado.', [
                'endpoint'   => $endpoint,
                'collection' => $collection,
            ]);

            return $this->fallbackEarthImage();
        }

        Log::info('Consulta EPIC mais recente concluída.', [
            'endpoint'    => $endpoint,
            'collection'  => $collection,
            'image_count' => count($response),
        ]);

        $image = collect($response)
            ->filter(fn (mixed $image) => is_array($image))
            ->map(fn (array $image) => EpicImageData::fromArray($image)->toArray($collection))
            ->filter(fn (array $image) => is_string($image['imageUrl']) && str_starts_with($image['imageUrl'], 'https://epic.gsfc.nasa.gov/'))
            ->sortByDesc(fn (array $image) => $image['date'] ?? '')
            ->first();

        if (! is_array($image)) {
            Log::notice('Consulta EPIC mais recente não retornou imagens utilizáveis.', [
                'endpoint'    => $endpoint,
                'collection'  => $collection,
                'image_count' => count($response),
            ]);

            return $this->fallbackEarthImage();
        }

        $earthImage = [
            'url'      => $image['imageUrl'],
            'imageUrl' => $image['imageUrl'],
            'alt'      => $image['caption'] ?: 'Imagem real da Terra em disco completo capturada pela missão NASA EPIC.',
            'caption'  => $image['caption'],
            'credit'   => 'Imagem: NASA/EPIC',
            'source'   => 'EPIC',
            'date'     => $image['date'],
        ];

        Cache::put($key, $earthImage, (int) config('services.nasa.epic_cache_ttl', 86400));

        return $earthImage;
    }

    /**
     * Retorna o payload de fallback usado quando nenhuma imagem EPIC está disponível.
     * O frontend exibe uma representação em CSS no lugar da imagem real.
     */
    public function fallbackEarthImage(): array
    {
        return [
            'url'      => null,
            'imageUrl' => null,
            'alt'      => 'Representação visual estilizada da Terra em disco completo.',
            'caption'  => 'Visual atmosférico em CSS enquanto a imagem EPIC não está disponível.',
            'credit'   => 'Visual: atmosfera CSS',
            'source'   => 'fallback',
            'date'     => null,
        ];
    }
}
