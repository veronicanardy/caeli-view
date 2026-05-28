<?php

namespace App\Services\Nasa;

use App\DTOs\Nasa\NeoWs\AsteroidData;
use App\Support\AsteroidStats;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

final class NeoWsService
{
    public function __construct(private readonly NasaHttpClient $client)
    {
    }

    public function feed(string $startDate, string $endDate): array
    {
        $key = sprintf('nasa:neows:feed:%s:%s', $startDate, $endDate);

        return Cache::remember($key, (int) config('services.nasa.cache_ttl', 21600), function () use ($startDate, $endDate) {
            $response = $this->client->get('/neo/rest/v1/feed', [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            $asteroids = $this->asteroidsFromFeed($response);

            return [
                'asteroids' => $asteroids->map->toArray()->values()->all(),
                'stats' => AsteroidStats::fromCollection($asteroids),
                'period' => ['startDate' => $startDate, 'endDate' => $endDate],
                'source' => 'NASA NeoWs',
            ];
        });
    }

    public function lookup(string $asteroidId): array
    {
        $safeId = preg_replace('/[^A-Za-z0-9]/', '', $asteroidId);
        $key = sprintf('nasa:neows:lookup:%s', $safeId);

        return Cache::remember($key, (int) config('services.nasa.cache_ttl', 21600), function () use ($safeId) {
            return AsteroidData::fromArray($this->client->get("/neo/rest/v1/neo/{$safeId}"))->toArray();
        });
    }

    public function defaultPeriod(): array
    {
        $today = CarbonImmutable::today();

        return [
            'startDate' => $today->subDays(2)->toDateString(),
            'endDate' => $today->toDateString(),
        ];
    }

    private function asteroidsFromFeed(array $response): Collection
    {
        return collect($response['near_earth_objects'] ?? [])
            ->flatMap(fn (array $items) => $items)
            ->map(fn (array $asteroid) => AsteroidData::fromArray($asteroid))
            ->sortBy(fn (AsteroidData $asteroid) => $asteroid->primaryApproach()?->date ?? '9999-99-99')
            ->values();
    }
}
