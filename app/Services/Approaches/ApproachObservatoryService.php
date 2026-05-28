<?php

namespace App\Services\Approaches;

use App\DTOs\Approaches\UnifiedApproachData;
use App\Exceptions\JplApiException;
use App\Exceptions\NasaApiException;
use App\Services\Jpl\CloseApproachService;
use App\Services\Nasa\NeoWsService;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;

final class ApproachObservatoryService
{
    private const ASTRONOMICAL_UNIT_KM = 149_597_870.7;

    public function __construct(
        private readonly NeoWsService $neoWs,
        private readonly CloseApproachService $cad,
    ) {
    }

    public function defaultFilters(): array
    {
        $today = CarbonImmutable::today();

        return [
            'date_min' => $today->toDateString(),
            'date_max' => $today->toDateString(),
            'type' => 'all',
            'dist_max' => '0.2',
            'sort' => 'dist',
            'distance_unit' => 'km',
        ];
    }

    public function observe(array $filters): array
    {
        $normalized = $this->normalizeFilters($filters);
        $key = 'approach-observatory:' . md5(json_encode($normalized, JSON_THROW_ON_ERROR));
        $ttl = (int) config('services.jpl.cad_cache_ttl', 21600);

        // stale-while-revalidate: serve cache vencido imediatamente e revalida em background
        return Cache::flexible($key, [$ttl, $ttl + 3600], function () use ($normalized) {
            return $this->fetch($normalized);
        });
    }

    public function nextApproach(array $filters): ?array
    {
        $normalized = $this->normalizeFilters($filters);
        $key = 'approach-observatory:next:' . md5(json_encode($normalized, JSON_THROW_ON_ERROR));
        $ttl = (int) config('services.jpl.cad_cache_ttl', 21600);

        $result = Cache::flexible($key, [$ttl, $ttl + 3600], function () use ($normalized) {
            [$neoWsItems, $cadItems] = $this->fetchParallel($normalized);
            $approaches = $this->filterByMaxDistance(
                $this->mergeApproaches($neoWsItems, $cadItems, 'date'),
                $normalized['dist_max'],
            );

            return $approaches
                ->filter(fn (UnifiedApproachData $item) => isset($item->approachDate))
                ->sortBy('approachDate')
                ->first()
                ?->toArray();
        });

        return is_array($result) ? $result : null;
    }

    private function fetch(array $normalized): array
    {
        [$neoWsItems, $cadItems, $errors] = $this->fetchParallelWithErrors($normalized);
        $approaches = $this->filterByMaxDistance(
            $this->mergeApproaches($neoWsItems, $cadItems, $normalized['sort']),
            $normalized['dist_max'],
        );

        return [
            'approaches' => $approaches->map->toArray()->values()->all(),
            'summary' => $this->summary($approaches),
            'charts' => $this->charts($approaches),
            'filters' => $normalized,
            'source' => 'NASA NeoWs + JPL CAD + JPL SBDB',
            'errorsBySource' => $errors,
            'lunarReference' => [
                'distanceKm' => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label' => 'Distância média Terra-Lua',
                'description' => 'A Lua é usada como referência visual: cerca de 384.400 km, aproximadamente 30 Terras de distância.',
            ],
            'visualNote' => 'Os objetos são posicionados de acordo com a distância registrada da Terra. A Lua aparece como referência em sua distância média de 384.400 km. O mapa não representa órbitas reais, mas preserva a comparação de distância entre os objetos.',
        ];
    }

    /**
     * Dispara NeoWs (todas as janelas) e CAD em paralelo usando Concurrency::run().
     * Retorna [neoWsItems, cadItems, errors].
     */
    private function fetchParallelWithErrors(array $normalized): array
    {
        $tasks = [];
        $errors = [];

        if ($normalized['type'] !== 'comet') {
            $tasks['neows'] = function () use ($normalized): array|string {
                try {
                    return ['ok' => true, 'data' => $this->neoWsApproaches($normalized['date_min'], $normalized['date_max'])];
                } catch (NasaApiException $e) {
                    return ['ok' => false, 'error' => $e->getUserMessage()];
                }
            };
        }

        $tasks['cad'] = function () use ($normalized): array {
            try {
                return ['ok' => true, 'data' => $this->cadApproaches($normalized)];
            } catch (JplApiException $e) {
                return ['ok' => false, 'error' => $e->getUserMessage()];
            }
        };

        $results = Concurrency::run($tasks);

        $neoWsItems = collect();
        $cadItems = collect();

        if (isset($results['neows'])) {
            if ($results['neows']['ok']) {
                $neoWsItems = $results['neows']['data'];
            } else {
                $errors['neows'] = $results['neows']['error'];
            }
        }

        if (isset($results['cad'])) {
            if ($results['cad']['ok']) {
                $cadItems = $results['cad']['data'];
            } else {
                $errors['cad'] = $results['cad']['error'];
            }
        }

        return [$neoWsItems, $cadItems, $errors];
    }

    /**
     * Versão sem rastreamento de erros (para nextApproach).
     */
    private function fetchParallel(array $normalized): array
    {
        [$neoWsItems, $cadItems] = $this->fetchParallelWithErrors($normalized);

        return [$neoWsItems, $cadItems];
    }

    private function normalizeFilters(array $filters): array
    {
        $defaults = $this->defaultFilters();

        return [
            'date_min' => (string) ($filters['date_min'] ?? $defaults['date_min']),
            'date_max' => (string) ($filters['date_max'] ?? $defaults['date_max']),
            'type' => (string) ($filters['type'] ?? $defaults['type']),
            'dist_max' => (string) ($filters['dist_max'] ?? $defaults['dist_max']),
            'sort' => (string) ($filters['sort'] ?? $defaults['sort']),
            'distance_unit' => (string) ($filters['distance_unit'] ?? $defaults['distance_unit']),
        ];
    }

    /**
     * Busca todas as janelas de 8 dias do NeoWs em paralelo.
     */
    private function neoWsApproaches(string $startDate, string $endDate): Collection
    {
        $start = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);

        $windows = [];
        for ($ws = $start; $ws->lessThanOrEqualTo($end); $ws = $ws->addDays(8)) {
            $we = $ws->addDays(7)->min($end);
            $windows[] = [$ws->toDateString(), $we->toDateString()];
        }

        if (count($windows) === 1) {
            [$s, $e] = $windows[0];
            $feed = $this->neoWs->feed($s, $e);

            return collect($feed['asteroids'] ?? [])->map(fn (array $a) => UnifiedApproachData::fromNeoWs($a));
        }

        $tasks = array_map(
            fn (array $window) => fn () => $this->neoWs->feed($window[0], $window[1]),
            $windows,
        );

        $results = Concurrency::run($tasks);

        return collect($results)
            ->filter(fn ($r) => is_array($r))
            ->flatMap(fn (array $feed) => collect($feed['asteroids'] ?? [])
                ->map(fn (array $a) => UnifiedApproachData::fromNeoWs($a)))
            ->values();
    }

    private function cadApproaches(array $filters): Collection
    {
        $data = $this->cad->search([
            'date_min' => $filters['date_min'],
            'date_max' => $filters['date_max'],
            'type' => $filters['type'],
            'dist_max' => $filters['dist_max'],
            'sort' => $filters['sort'],
        ]);

        return collect($data['approaches'] ?? [])->map(fn (array $approach) => UnifiedApproachData::fromCad($approach));
    }

    private function mergeApproaches(Collection $neoWsItems, Collection $cadItems, string $sort): Collection
    {
        $seen = [];
        $merged = collect();

        foreach ($neoWsItems->concat($cadItems) as $approach) {
            if (! $approach instanceof UnifiedApproachData) {
                continue;
            }

            $key = $approach->dedupeKey();

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $merged->push($approach);
        }

        return match ($sort) {
            'dist' => $merged->sortBy(fn (UnifiedApproachData $item) => $item->nominalDistanceKm ?? INF)->values(),
            '-dist' => $merged->sortByDesc(fn (UnifiedApproachData $item) => $item->nominalDistanceKm ?? -INF)->values(),
            'v-rel' => $merged->sortBy(fn (UnifiedApproachData $item) => $item->relativeVelocityKms ?? INF)->values(),
            '-v-rel' => $merged->sortByDesc(fn (UnifiedApproachData $item) => $item->relativeVelocityKms ?? -INF)->values(),
            'object' => $merged->sortBy('name')->values(),
            default => $merged->sortBy(fn (UnifiedApproachData $item) => $item->approachDate ?? '9999-99-99')->values(),
        };
    }

    private function filterByMaxDistance(Collection $approaches, string $maxDistanceAu): Collection
    {
        if (! is_numeric($maxDistanceAu)) {
            return $approaches->values();
        }

        $limitKm = (float) $maxDistanceAu * self::ASTRONOMICAL_UNIT_KM;
        if ($limitKm <= 0) {
            return $approaches->values();
        }

        return $approaches
            ->filter(fn (UnifiedApproachData $item) => $item->nominalDistanceKm === null || $item->nominalDistanceKm <= $limitKm)
            ->values();
    }

    private function summary(Collection $approaches): array
    {
        $closest = $approaches->filter(fn (UnifiedApproachData $item) => $item->nominalDistanceKm !== null)->sortBy('nominalDistanceKm')->first();
        $fastest = $approaches->filter(fn (UnifiedApproachData $item) => $item->relativeVelocityKph !== null)->sortByDesc('relativeVelocityKph')->first();
        $next = $approaches->filter(fn (UnifiedApproachData $item) => $item->approachDate !== null)->sortBy('approachDate')->first();

        return [
            'total' => $approaches->count(),
            'asteroids' => $approaches->where('objectType', 'asteroid')->count(),
            'comets' => $approaches->where('objectType', 'comet')->count(),
            'fromNeoWs' => $approaches->where('source', 'neows')->count(),
            'fromCad' => $approaches->where('source', 'cad')->count(),
            'closerThanMoon' => $approaches->filter(fn (UnifiedApproachData $item) => $item->lunarDistance !== null && $item->lunarDistance < 1)->count(),
            'nearMoon' => $approaches->filter(fn (UnifiedApproachData $item) => $item->lunarDistance !== null && $item->lunarDistance >= 1 && $item->lunarDistance <= 1.5)->count(),
            'closestObjectName' => $closest?->name,
            'closestDistanceKm' => $closest?->nominalDistanceKm,
            'closestLunarDistance' => $closest?->lunarDistance,
            'fastestObjectName' => $fastest?->name,
            'fastestVelocityKph' => $fastest?->relativeVelocityKph,
            'nextApproachName' => $next?->name,
            'nextApproachDate' => $next?->approachDate,
        ];
    }

    private function charts(Collection $approaches): array
    {
        return [
            'byDay' => $approaches
                ->groupBy(fn (UnifiedApproachData $item) => substr((string) $item->approachDate, 0, 10) ?: 'Sem data')
                ->map(fn (Collection $items, string $date) => ['date' => $date, 'total' => $items->count()])
                ->values()
                ->all(),
            'byType' => [
                ['name' => 'Asteroides', 'value' => $approaches->where('objectType', 'asteroid')->count()],
                ['name' => 'Cometas', 'value' => $approaches->where('objectType', 'comet')->count()],
            ],
            'bySource' => [
                ['name' => 'NeoWs', 'value' => $approaches->where('source', 'neows')->count()],
                ['name' => 'JPL CAD', 'value' => $approaches->where('source', 'cad')->count()],
            ],
            'closest' => $approaches
                ->filter(fn (UnifiedApproachData $item) => $item->lunarDistance !== null)
                ->sortBy('lunarDistance')
                ->take(6)
                ->map(fn (UnifiedApproachData $item) => ['name' => $item->name, 'lunarDistance' => $item->lunarDistance, 'distanceKm' => $item->nominalDistanceKm])
                ->values()
                ->all(),
            'fastest' => $approaches
                ->filter(fn (UnifiedApproachData $item) => $item->relativeVelocityKph !== null)
                ->sortByDesc('relativeVelocityKph')
                ->take(6)
                ->map(fn (UnifiedApproachData $item) => ['name' => $item->name, 'velocityKph' => $item->relativeVelocityKph])
                ->values()
                ->all(),
        ];
    }
}
