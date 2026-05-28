<?php

namespace App\Services\Approaches;

use App\DTOs\Approaches\UnifiedApproachData;
use App\Services\Jpl\HorizonsTrajectoryService;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;

/**
 * Selects the objects that are actually the closest to Earth *right now*, derived from JPL Horizons
 * vectors instead of CAD/NeoWs miss_distance (which is the distance at a fixed approach time, not now).
 *
 * Pipeline:
 *   1. Use CAD/NeoWs (via ApproachObservatoryService) to discover candidates in a date window.
 *   2. Rank candidates: top-N by miss_distance + union with every PHA in the window.
 *   3. Hit Horizons VECTORS for each candidate with a window centered on now() — pulls real
 *      x/y/z and current distance.
 *   4. Re-sort by the Horizons-derived current distance.
 *   5. Return the top-K with the full trajectory (past/current/future) attached.
 */
final class ClosestNowSelector
{
    private const TOP_CANDIDATES = 15;
    private const TOP_RESULT_LIMIT = 5;

    /**
     * Window to feed Horizons. -30d past / +90d future (~120 days), 2-day step. ~60 points per
     * object. This is the sweet spot for showing real trajectory CURVATURE: near-Earth objects
     * barely bend over days (~1°) or even ~50 days (~10°), but across ~120 days a typical NEO
     * traces a clearly curved arc (e.g. 2026 KL2 bends ~48° over this window). 120 days is still a
     * small fraction of a typical NEO orbit (~2.8 yr / ~1000 days), so the scene stays a
     * "near-Earth radar", not a full heliocentric orbit. A 2-day step keeps it to ~60 points ×
     * 5 objects = ~300 samples (lighter than before), and the spline smooths the coarser step.
     */
    private const HORIZONS_WINDOW = [
        'startOffsetHours' => -720,   // -30 days
        'stopOffsetHours' => 2160,    // +90 days
        'stepSize' => '2 days',
    ];

    /**
     * Cache TTL for the resolved selection — short enough that "closest now" stays fresh,
     * long enough to coalesce frontend reloads.
     */
    private const RESULT_CACHE_TTL_SECONDS = 900; // 15 min

    public function __construct(
        private readonly ApproachObservatoryService $observatory,
        private readonly HorizonsTrajectoryService $horizons,
    ) {
    }

    /**
     * @param  string  $dateMin  ISO date (Y-m-d), inclusive
     * @param  string  $dateMax  ISO date (Y-m-d), inclusive
     * @param  int     $limit    How many to return after re-sorting (default 5)
     */
    public function select(string $dateMin, string $dateMax, int $limit = self::TOP_RESULT_LIMIT): array
    {
        $limit = max(1, min($limit, 10));

        // Include the Horizons window in the cache key so changing the window (e.g. widening it for
        // more trajectory curvature) invalidates stale results immediately instead of waiting out
        // the TTL.
        $windowSignature = implode(',', self::HORIZONS_WINDOW);
        $cacheKey = 'closest-now:'.md5($dateMin.'|'.$dateMax.'|'.$limit.'|'.$windowSignature);

        return Cache::flexible(
            $cacheKey,
            [self::RESULT_CACHE_TTL_SECONDS, self::RESULT_CACHE_TTL_SECONDS + 900],
            fn (): array => $this->resolve($dateMin, $dateMax, $limit),
        );
    }

    private function resolve(string $dateMin, string $dateMax, int $limit): array
    {
        // 1. Discover candidates from CAD + NeoWs (this already de-dupes and filters by dist_max).
        $data = $this->observatory->observe([
            'date_min' => $dateMin,
            'date_max' => $dateMax,
            'type' => 'all',
            'dist_max' => '0.2',
            'sort' => 'dist',
            'distance_unit' => 'km',
        ]);

        $approaches = is_array($data['approaches'] ?? null) ? $data['approaches'] : [];

        if ($approaches === []) {
            return $this->emptyResult($dateMin, $dateMax, 'Nenhum candidato encontrado no período.');
        }

        // 2. Rank candidates: top-N by miss_distance + every PHA in the window.
        $candidates = $this->pickCandidates($approaches);

        if ($candidates === []) {
            return $this->emptyResult($dateMin, $dateMax, 'Nenhum candidato com dados suficientes para projeção.');
        }

        // 3. Fetch Horizons trajectories for every candidate, in parallel.
        $trajectories = $this->fetchTrajectoriesParallel($candidates);

        // 4. Build per-object result with current distance and re-sort.
        $objects = [];
        foreach ($candidates as $approach) {
            $id = (string) ($approach['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $trajectory = $trajectories[$id] ?? null;
            $currentKm = $this->extractCurrentDistance($trajectory, $approach);

            $objects[] = [
                'approach' => $approach,
                'trajectory' => $trajectory,
                'currentDistanceKm' => $currentKm,
                'currentDistanceLD' => $currentKm !== null
                    ? $currentKm / DistancePresenter::LUNAR_DISTANCE_KM
                    : null,
                'hasRealCurrentDistance' => $this->trajectoryIsAvailable($trajectory),
            ];
        }

        // Sort by real current distance when we have it; objects without real distance go to the bottom.
        usort($objects, function (array $a, array $b): int {
            $aKm = $a['hasRealCurrentDistance'] ? $a['currentDistanceKm'] : null;
            $bKm = $b['hasRealCurrentDistance'] ? $b['currentDistanceKm'] : null;

            if ($aKm === null && $bKm === null) {
                $aFallback = (float) ($a['approach']['nominalDistanceKm'] ?? INF);
                $bFallback = (float) ($b['approach']['nominalDistanceKm'] ?? INF);
                return $aFallback <=> $bFallback;
            }
            if ($aKm === null) return 1;
            if ($bKm === null) return -1;
            return $aKm <=> $bKm;
        });

        $top = array_slice($objects, 0, $limit);

        return [
            'mode' => 'closest_now',
            'generatedAt' => CarbonImmutable::now('UTC')->toIso8601String(),
            'window' => [
                'dateMin' => $dateMin,
                'dateMax' => $dateMax,
            ],
            'requestedLimit' => $limit,
            'candidatesEvaluated' => count($candidates),
            'objects' => $top,
            'lunarReference' => [
                'distanceKm' => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label' => 'Distância média Terra-Lua',
                'description' => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
            ],
        ];
    }

    /**
     * Picks the top-N approaches by miss_distance and unions with every PHA in the window.
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @return array<int, array<string, mixed>>
     */
    private function pickCandidates(array $approaches): array
    {
        $withDistance = array_filter(
            $approaches,
            static fn (array $a): bool => is_numeric($a['nominalDistanceKm'] ?? null),
        );

        usort(
            $withDistance,
            static fn (array $a, array $b): int => ((float) $a['nominalDistanceKm']) <=> ((float) $b['nominalDistanceKm']),
        );

        $topByDistance = array_slice($withDistance, 0, self::TOP_CANDIDATES);

        // Union with every PHA (hazardFlag) in the full window, even if outside top-N by distance.
        $byId = [];
        foreach ($topByDistance as $approach) {
            $id = (string) ($approach['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $byId[$id] = $approach;
        }

        foreach ($approaches as $approach) {
            if (! (bool) ($approach['hazardFlag'] ?? false)) {
                continue;
            }
            $id = (string) ($approach['id'] ?? '');
            if ($id === '' || isset($byId[$id])) {
                continue;
            }
            $byId[$id] = $approach;
        }

        return array_values($byId);
    }

    /**
     * Fires Horizons fetches in parallel and returns a map keyed by approach id.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array<string, array<string, mixed>>
     */
    private function fetchTrajectoriesParallel(array $candidates): array
    {
        $tasks = [];
        foreach ($candidates as $approach) {
            $id = (string) ($approach['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $payload = $this->approachToHorizonsPayload($approach);
            $tasks[$id] = fn () => $this->horizons->trajectoryAroundNow($payload, self::HORIZONS_WINDOW);
        }

        if ($tasks === []) {
            return [];
        }

        return Concurrency::run($tasks);
    }

    /**
     * Reshape a unified approach into the payload shape HorizonsTrajectoryService expects.
     */
    private function approachToHorizonsPayload(array $approach): array
    {
        return [
            'id' => (string) ($approach['id'] ?? ''),
            'name' => (string) ($approach['name'] ?? ''),
            'displayName' => (string) ($approach['displayName'] ?? $approach['name'] ?? ''),
            'rawName' => (string) ($approach['rawName'] ?? $approach['name'] ?? ''),
            'designation' => (string) ($approach['provisionalDesignation'] ?? $approach['designation'] ?? ''),
            'detailIdentifier' => (string) ($approach['detailIdentifier'] ?? ''),
            'spkId' => (string) ($approach['spkId'] ?? ''),
            'approachTime' => (string) ($approach['approachDate'] ?? ''),
            'nominalDistanceKm' => $approach['nominalDistanceKm'] ?? null,
            'source' => (string) ($approach['source'] ?? ''),
            'sourceLabel' => (string) ($approach['sourceLabel'] ?? ''),
        ];
    }

    private function trajectoryIsAvailable(?array $trajectory): bool
    {
        return is_array($trajectory) && ($trajectory['status'] ?? null) === 'available';
    }

    private function extractCurrentDistance(?array $trajectory, array $approach): ?float
    {
        if ($this->trajectoryIsAvailable($trajectory)) {
            $value = $trajectory['currentDistanceKm'] ?? null;
            if (is_numeric($value)) {
                return (float) $value;
            }
        }

        // Fallback: nominal distance at approach time (CAD/NeoWs).
        $fallback = $approach['nominalDistanceKm'] ?? null;
        return is_numeric($fallback) ? (float) $fallback : null;
    }

    private function emptyResult(string $dateMin, string $dateMax, string $note): array
    {
        return [
            'mode' => 'closest_now',
            'generatedAt' => CarbonImmutable::now('UTC')->toIso8601String(),
            'window' => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
            'requestedLimit' => self::TOP_RESULT_LIMIT,
            'candidatesEvaluated' => 0,
            'objects' => [],
            'note' => $note,
            'lunarReference' => [
                'distanceKm' => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label' => 'Distância média Terra-Lua',
                'description' => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
            ],
        ];
    }
}
