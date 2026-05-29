<?php

namespace App\Services\Nasa;

use App\DTOs\Nasa\Apod\ApodData;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

/**
 * Consulta o endpoint APOD (Astronomy Picture of the Day) da NASA.
 *
 * O APOD publica uma imagem ou vídeo astronômico por dia, com título e explicação científica.
 * Os resultados são cacheados por 24 horas (configurável em `services.nasa.apod_cache_ttl`)
 * pois o conteúdo de um dia específico nunca muda.
 */
final class ApodService
{
    public function __construct(private readonly NasaHttpClient $client)
    {
    }

    /**
     * Retorna o APOD de uma data específica no formato Y-m-d.
     * Solicita thumbnails (`thumbs: true`) para que vídeos também tenham imagem de prévia.
     */
    public function byDate(string $date): array
    {
        $key = sprintf('nasa:apod:%s', $date);

        return Cache::remember($key, (int) config('services.nasa.apod_cache_ttl', 86400), function () use ($date) {
            $response = $this->client->get('/planetary/apod', [
                'date'   => $date,
                'thumbs' => true,
            ]);

            return ApodData::fromArray($response)->toArray();
        });
    }

    /**
     * Atalho para o APOD de hoje.
     */
    public function today(): array
    {
        return $this->byDate(CarbonImmutable::today()->toDateString());
    }

    /**
     * Data padrão para exibição quando nenhuma é fornecida pela requisição: hoje.
     */
    public function defaultDate(): string
    {
        return CarbonImmutable::today()->toDateString();
    }
}
