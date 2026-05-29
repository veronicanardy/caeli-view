<?php

namespace App\Services\Nasa;

use App\DTOs\Nasa\NeoWs\AsteroidData;
use App\Support\AsteroidStats;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Consulta o endpoint NeoWs (Near Earth Object Web Service) da NASA.
 *
 * Oferece dois modos de acesso:
 *   - `feed()`: lista de asteroides que se aproximam da Terra em um período de até 8 dias
 *   - `lookup()`: detalhes completos de um asteroide específico pelo ID do NeoWs
 *
 * Ambos os métodos cacheiam o resultado para reduzir chamadas à API; o TTL é configurado
 * em `services.nasa.cache_ttl` (padrão: 6 horas).
 */
final class NeoWsService
{
    public function __construct(private readonly NasaHttpClient $client)
    {
    }

    /**
     * Retorna os asteroides que se aproximam da Terra no período informado.
     *
     * A API do NeoWs aceita no máximo 8 dias por requisição. Intervalos maiores
     * devem ser fatiados externamente (veja `ApproachObservatoryService`).
     *
     * @param  string  $startDate  Data inicial no formato Y-m-d
     * @param  string  $endDate    Data final no formato Y-m-d (máx. 8 dias após $startDate)
     */
    public function feed(string $startDate, string $endDate): array
    {
        $key = sprintf('nasa:neows:feed:%s:%s', $startDate, $endDate);

        return Cache::remember($key, (int) config('services.nasa.cache_ttl', 21600), function () use ($startDate, $endDate) {
            $response  = $this->client->get('/neo/rest/v1/feed', [
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ]);

            $asteroids = $this->asteroidsFromFeed($response);

            return [
                'asteroids' => $asteroids->map->toArray()->values()->all(),
                'stats'     => AsteroidStats::fromCollection($asteroids),
                'period'    => ['startDate' => $startDate, 'endDate' => $endDate],
                'source'    => 'NASA NeoWs',
            ];
        });
    }

    /**
     * Retorna os detalhes completos de um asteroide pelo seu ID no NeoWs.
     * O ID é sanitizado para conter apenas caracteres alfanuméricos antes da requisição.
     */
    public function lookup(string $asteroidId): array
    {
        $safeId = preg_replace('/[^A-Za-z0-9]/', '', $asteroidId);
        $key    = sprintf('nasa:neows:lookup:%s', $safeId);

        return Cache::remember($key, (int) config('services.nasa.cache_ttl', 21600), function () use ($safeId) {
            return AsteroidData::fromArray($this->client->get("/neo/rest/v1/neo/{$safeId}"))->toArray();
        });
    }

    /**
     * Retorna o período padrão de consulta: 2 dias atrás até hoje.
     * Usado pelos controllers quando nenhuma data é fornecida na requisição.
     */
    public function defaultPeriod(): array
    {
        $today = CarbonImmutable::today();

        return [
            'startDate' => $today->subDays(2)->toDateString(),
            'endDate'   => $today->toDateString(),
        ];
    }

    /**
     * Extrai e normaliza os asteroides da resposta bruta do NeoWs.
     * A resposta agrupa objetos por dia (`near_earth_objects`), então é necessário
     * achatar o mapa antes de mapear para `AsteroidData`. O resultado é ordenado por data.
     */
    private function asteroidsFromFeed(array $response): Collection
    {
        return collect($response['near_earth_objects'] ?? [])
            ->flatMap(fn (array $items) => $items)
            ->map(fn (array $asteroid) => AsteroidData::fromArray($asteroid))
            ->sortBy(fn (AsteroidData $asteroid) => $asteroid->primaryApproach()?->date ?? '9999-99-99')
            ->values();
    }
}
