<?php

namespace App\Services\Jpl;

use App\DTOs\Jpl\CloseApproachData;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

final class CloseApproachService
{
    public function __construct(private readonly JplHttpClient $client)
    {
    }

    public function search(array $filters): array
    {
        $normalized = $this->normalizeFilters($filters);
        $key = 'jpl:cad:'.md5(json_encode($normalized, JSON_THROW_ON_ERROR));

        return Cache::remember($key, (int) config('services.jpl.cad_cache_ttl', 21600), function () use ($normalized) {
            $query = $this->cadQuery($normalized);
            $response = $this->client->get('/cad.api', $query);
            $approaches = $this->approachesFromCad($response, $normalized);

            return [
                'approaches' => $approaches->map->toArray()->values()->all(),
                'summary' => $this->summary($approaches),
                'charts' => $this->charts($approaches),
                'filters' => $normalized,
                'source' => 'NASA/JPL SBDB Close Approach Data API',
                'query' => $query,
            ];
        });
    }

    public function defaultFilters(): array
    {
        $today = CarbonImmutable::today();

        return [
            'date_min' => $today->toDateString(),
            'date_max' => $today->addDays(30)->toDateString(),
            'type' => 'all',
            'dist_max' => '0.2',
            'sort' => 'date',
        ];
    }

    private function normalizeFilters(array $filters): array
    {
        return [
            'date_min' => (string) ($filters['date_min'] ?? $this->defaultFilters()['date_min']),
            'date_max' => (string) ($filters['date_max'] ?? $this->defaultFilters()['date_max']),
            'type' => (string) ($filters['type'] ?? 'all'),
            'dist_max' => $filters['dist_max'] ?? $this->defaultFilters()['dist_max'],
            'sort' => (string) ($filters['sort'] ?? 'date'),
        ];
    }

    private function cadQuery(array $filters): array
    {
        $query = [
            'date-min' => $filters['date_min'],
            'date-max' => $filters['date_max'],
            'dist-max' => $filters['dist_max'],
            'body' => 'Earth',
            'sort' => $filters['sort'],
            'limit' => 100,
            'diameter' => 'true',
            'fullname' => 'true',
            'neo' => 'false',
        ];

        if ($filters['type'] === 'asteroid') {
            $query['kind'] = 'a';
        }

        if ($filters['type'] === 'comet') {
            $query['kind'] = 'c';
        }

        return $query;
    }

    private function approachesFromCad(array $response, array $filters): Collection
    {
        $fields = $response['fields'] ?? [];
        $records = $response['data'] ?? [];

        if (! is_array($fields) || ! is_array($records)) {
            return collect();
        }

        $forcedType = match ($filters['type']) {
            'asteroid' => 'asteroid',
            'comet' => 'comet',
            default => null,
        };

        return collect($records)
            ->filter(fn (mixed $record) => is_array($record))
            ->map(fn (array $record) => CloseApproachData::fromCadRecord($fields, $record, 'Earth', $forcedType))
            ->filter(fn (CloseApproachData $approach) => $approach->designation !== '')
            ->values();
    }

    private function summary(Collection $approaches): array
    {
        $closest = $approaches
            ->filter(fn (CloseApproachData $approach) => $approach->distanceAu !== null)
            ->sortBy('distanceAu')
            ->first();
        $fastest = $approaches
            ->filter(fn (CloseApproachData $approach) => $approach->relativeVelocityKmS !== null)
            ->sortByDesc('relativeVelocityKmS')
            ->first();
        $next = $approaches
            ->filter(fn (CloseApproachData $approach) => $approach->calendarDate !== null)
            ->sortBy('calendarDate')
            ->first();

        return [
            'total' => $approaches->count(),
            'comets' => $approaches->where('objectType', 'comet')->count(),
            'asteroids' => $approaches->where('objectType', 'asteroid')->count(),
            'closestDistanceAu' => $closest?->distanceAu,
            'closestDistanceKm' => $closest?->distanceKm(),
            'closestObjectName' => $closest?->displayName(),
            'fastestVelocityKmS' => $fastest?->relativeVelocityKmS,
            'fastestVelocityKmH' => $fastest?->relativeVelocityKmH(),
            'fastestObjectName' => $fastest?->displayName(),
            'nextApproachDate' => $next?->calendarDate,
            'nextApproachName' => $next?->displayName(),
        ];
    }

    private function charts(Collection $approaches): array
    {
        $byDay = $approaches
            ->groupBy(fn (CloseApproachData $approach) => substr((string) $approach->calendarDate, 0, 11) ?: 'Sem data')
            ->map(fn (Collection $items, string $date) => ['date' => trim($date), 'total' => $items->count()])
            ->values()
            ->all();

        $byType = [
            ['name' => 'Asteroides', 'value' => $approaches->where('objectType', 'asteroid')->count()],
            ['name' => 'Cometas', 'value' => $approaches->where('objectType', 'comet')->count()],
        ];

        $closest = $approaches
            ->filter(fn (CloseApproachData $approach) => $approach->distanceAu !== null)
            ->sortBy('distanceAu')
            ->take(5)
            ->map(fn (CloseApproachData $approach) => [
                'name' => $approach->displayName(),
                'distanceAu' => $approach->distanceAu,
                'distanceKm' => $approach->distanceKm(),
            ])
            ->values()
            ->all();

        $fastest = $approaches
            ->filter(fn (CloseApproachData $approach) => $approach->relativeVelocityKmS !== null)
            ->sortByDesc('relativeVelocityKmS')
            ->take(5)
            ->map(fn (CloseApproachData $approach) => [
                'name' => $approach->displayName(),
                'velocityKmS' => $approach->relativeVelocityKmS,
                'velocityKmH' => $approach->relativeVelocityKmH(),
            ])
            ->values()
            ->all();

        $byBody = $approaches
            ->groupBy(fn (CloseApproachData $approach) => $approach->approachBody ?: 'Não informado')
            ->map(fn (Collection $items, string $body) => ['name' => $body, 'value' => $items->count()])
            ->values()
            ->all();

        return compact('byDay', 'byType', 'closest', 'fastest', 'byBody');
    }
}
