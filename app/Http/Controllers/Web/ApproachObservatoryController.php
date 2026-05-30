<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\NasaApiException;
use App\Http\Requests\ApproachObservatoryRequest;
use App\Services\Approaches\AsteroidModelResolverService;
use App\Services\Approaches\ApproachObservatoryService;
use App\Services\Approaches\ClosestNowSelector;
use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Services\Nasa\EpicService;
use App\Support\SunDirectionCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApproachObservatoryController
{
    public function __construct(
        private readonly ApproachObservatoryService $observatory,
        private readonly AsteroidModelResolverService $asteroidModels,
        private readonly EpicService $epic,
        private readonly HorizonsTrajectoryService $horizons,
        private readonly ClosestNowSelector $closestNow,
    ) {
    }

    public function index(ApproachObservatoryRequest $request): Response
    {
        $defaults = $this->observatory->defaultFilters();
        $filters = $request->filters($defaults);

        // Seed the 3D radar with a plausible Sun direction for the current instant. Without this the
        // scene would start with an arbitrary fallback vector and re-light the moment astronomy-engine
        // finishes lazy-loading — visibly wrong for the first second or two.
        $initialSunDirection = SunDirectionCalculator::eclipticDirectionAt(
            CarbonImmutable::now('UTC'),
        );

        return Inertia::render('ApproachObservatory/Index', [
            'filters' => $filters,
            'initialSunDirection' => $initialSunDirection,
        ]);
    }

    public function data(ApproachObservatoryRequest $request): JsonResponse
    {
        $filters = $request->filters($this->observatory->defaultFilters());
        $data = $this->observatory->observe($filters);

        try {
            $earthImage = $this->epic->homeEarthImage();
        } catch (NasaApiException) {
            $earthImage = $this->epic->fallbackEarthImage();
        }

        $ttl = (int) config('services.jpl.cad_cache_ttl', 21600);

        return response()->json([
            ...$data,
            'earthImage' => $earthImage,
        ])->header('Cache-Control', "public, max-age={$ttl}, stale-while-revalidate=3600");
    }

    public function positions(ApproachObservatoryRequest $request): JsonResponse
    {
        $filters = $request->filters($this->observatory->defaultFilters());
        $data = $this->observatory->observe($filters);
        $approaches = $data['approaches'] ?? [];

        $payload = array_map(static function (array $approach): array {
            return [
                'id' => $approach['id'] ?? null,
                'name' => $approach['name'] ?? null,
                'displayName' => $approach['displayName'] ?? $approach['name'] ?? null,
                'rawName' => $approach['rawName'] ?? $approach['name'] ?? null,
                'designation' => $approach['designation'] ?? null,
                'detailIdentifier' => $approach['detailIdentifier'] ?? null,
                'spkId' => $approach['spkId'] ?? null,
                'approachTime' => $approach['approachDate'] ?? null,
                'nominalDistanceKm' => $approach['nominalDistanceKm'] ?? null,
                'sourceLabel' => $approach['sourceLabel'] ?? null,
            ];
        }, $approaches);

        $requestedMode = (string) $request->query('reference_mode', '');
        $resolvedMode = $this->resolveReferenceMode($requestedMode, $filters);

        $positions = $this->horizons->positionsAtReferenceTimeBatch($payload, $resolvedMode);

        $sunDirection = SunDirectionCalculator::eclipticDirectionAt(
            $this->sunReferenceInstantFor($resolvedMode, $payload, $filters),
        );

        return response()->json([
            'positions' => $positions,
            'referenceMode' => $resolvedMode,
            'sunDirection' => $sunDirection,
            'generatedAt' => now()->toIso8601String(),
        ])->header('Cache-Control', 'public, max-age=900, stale-while-revalidate=900');
    }

    /**
     * Best single instant to anchor the Sun-direction indicator for the radar.
     * - `current`: just use now (UTC). Sun longitude moves ~1°/day, so the precise instant
     *   inside a 15-minute bucket doesn't matter for a visual cue.
     * - `closest_approach`: use the approach time of the object that comes closest on the day,
     *   so the indicator reflects the Sun's direction at the dominant event.
     */
    private function sunReferenceInstantFor(string $mode, array $payload, array $filters): CarbonImmutable
    {
        if ($mode === 'current') {
            return CarbonImmutable::now('UTC');
        }

        $closestTime = null;
        $closestDistance = INF;
        foreach ($payload as $approach) {
            $distance = $approach['nominalDistanceKm'] ?? null;
            $time = $approach['approachTime'] ?? null;
            if (! is_numeric($distance) || ! is_string($time) || $time === '') {
                continue;
            }
            if ((float) $distance < $closestDistance) {
                try {
                    $closestTime = CarbonImmutable::parse($time, 'UTC');
                    $closestDistance = (float) $distance;
                } catch (\Throwable) {
                    continue;
                }
            }
        }

        if ($closestTime !== null) {
            return $closestTime;
        }

        // Fallback: midday UTC of the selected date.
        $date = (string) ($filters['date_min'] ?? CarbonImmutable::now('UTC')->toDateString());
        try {
            return CarbonImmutable::parse($date.' 12:00:00', 'UTC');
        } catch (\Throwable) {
            return CarbonImmutable::now('UTC');
        }
    }

    private function resolveReferenceMode(string $requestedMode, array $filters): string
    {
        if (in_array($requestedMode, ['current', 'closest_approach'], true)) {
            return $requestedMode;
        }

        $today = now((string) config('app.timezone', 'UTC'))->toDateString();
        $selectedDate = (string) ($filters['date_min'] ?? '');

        return $selectedDate === $today ? 'current' : 'closest_approach';
    }

    /**
     * Retorna os N objetos mais próximos da Terra agora, com trajetória completa do Horizons.
     *
     * Parâmetros aceitos:
     *   - limit : 1–30 (padrão 5). Aumentar o limite aumenta candidatos avaliados e tempo de resposta.
     *   - mode  : 'nearest' | 'upcoming' | 'featured' | 'attention' (padrão 'nearest').
     *             Controla o critério de seleção e ordenação dos objetos retornados.
     */
    public function closestNow(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_min'      => ['nullable', 'date_format:Y-m-d'],
            'date_max'      => ['nullable', 'date_format:Y-m-d'],
            'limit'         => ['nullable', 'integer', 'min:1', 'max:30'],
            'mode'          => ['nullable', 'string', 'in:nearest,upcoming,attention'],
            'force_refresh' => ['nullable', 'boolean'],
        ]);

        $defaults = $this->observatory->defaultFilters();
        $anchorMin    = (string) ($validated['date_min'] ?? $defaults['date_min']);
        $anchorMax    = (string) ($validated['date_max'] ?? $defaults['date_max']);
        $limit        = (int) ($validated['limit'] ?? 5);
        $mode         = (string) ($validated['mode'] ?? 'nearest');
        $forceRefresh = (bool) ($validated['force_refresh'] ?? false);

        // "Closest right now" is not the same as "approaches that peak today". An object that had
        // its peak 2 days ago can still be one of the 5 closest to Earth right now, and so can one
        // that peaks tomorrow. We widen the candidate window symmetrically to catch both.
        try {
            $dateMin = CarbonImmutable::parse($anchorMin, 'UTC')->subDays(3)->toDateString();
            $dateMax = CarbonImmutable::parse($anchorMax, 'UTC')->addDays(3)->toDateString();
        } catch (\Throwable) {
            $dateMin = $anchorMin;
            $dateMax = $anchorMax;
        }

        \Illuminate\Support\Facades\Log::info('[closestNow] request', compact('anchorMin', 'anchorMax', 'dateMin', 'dateMax', 'limit', 'mode'));

        try {
            $payload = $this->closestNow->select($dateMin, $dateMax, $limit, $mode, $anchorMin, $forceRefresh);
        } catch (\Throwable) {
            $payload = [
                'mode'                => 'closest_now',
                'selectionMode'       => $mode,
                'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
                'window'              => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
                'requestedLimit'      => $limit,
                'candidatesEvaluated' => 0,
                'objects'             => [],
                'lunarReference'      => [
                    'distanceKm'           => 384400,
                    'earthDiametersApprox' => 30.0,
                    'label'                => 'Distância média Terra-Lua',
                    'description'          => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
                ],
            ];
        }

        return response()->json($payload)
            ->header('Cache-Control', 'no-store');
    }

    public function trajectory(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'id' => ['required', 'string', 'max:160'],
            'name' => ['required', 'string', 'max:180'],
            'displayName' => ['nullable', 'string', 'max:180'],
            'rawName' => ['nullable', 'string', 'max:220'],
            'designation' => ['nullable', 'string', 'max:80'],
            'detailIdentifier' => ['nullable', 'string', 'max:120'],
            'spkId' => ['nullable', 'string', 'max:80'],
            'approachTime' => ['required', 'string', 'max:80'],
        ]);

        return response()->json($this->horizons->trajectory($payload))
            ->header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    }

    public function asteroidModel(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'id' => ['required', 'string', 'max:160'],
            'name' => ['required', 'string', 'max:180'],
            'displayName' => ['nullable', 'string', 'max:180'],
            'designation' => ['nullable', 'string', 'max:80'],
            'detailIdentifier' => ['nullable', 'string', 'max:120'],
            'spkId' => ['nullable', 'string', 'max:80'],
            'objectType' => ['nullable', 'string', 'max:40'],
            'diameterMeters' => ['nullable', 'numeric'],
            'diameterMinMeters' => ['nullable', 'numeric'],
            'diameterMaxMeters' => ['nullable', 'numeric'],
            'absoluteMagnitude' => ['nullable', 'numeric'],
        ]);

        $ttl = (int) config('services.asteroid_models.cache_ttl', 604800);

        return response()->json($this->asteroidModels->resolve($payload))
            ->header('Cache-Control', "public, max-age={$ttl}, stale-while-revalidate=86400");
    }
}
