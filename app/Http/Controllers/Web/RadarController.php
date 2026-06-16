<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\JplApiException;
use App\Http\Requests\RadarAsteroidModelRequest;
use App\Http\Requests\RadarClosestNowRequest;
use App\Http\Requests\RadarIndexRequest;
use App\Http\Requests\RadarTrajectoryRequest;
use App\Http\Requests\SmallBodyLookupRequest;
use App\Services\Approaches\AsteroidModelResolverService;
use App\Services\Approaches\ClosestNowSelector;
use App\Services\Approaches\FamousAsteroidsSelector;
use App\Services\Approaches\RadarService;
use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Services\Jpl\Sbdb\SmallBodyService;
use App\Support\DistancePresenter;
use App\Support\SunDirectionCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class RadarController
{
    public function __construct(
        private readonly RadarService $radar,
        private readonly AsteroidModelResolverService $asteroidModels,
        private readonly HorizonsTrajectoryService $horizons,
        private readonly ClosestNowSelector $closestNow,
        private readonly FamousAsteroidsSelector $famous,
        private readonly SmallBodyService $smallBodies,
    ) {
    }

    /**
     * Responsabilidade: renderiza a página do radar orbital 3D com direção solar
     * calculada no servidor para iluminação correta desde o primeiro frame.
     */
    public function index(RadarIndexRequest $request): Response
    {
        $defaults = $this->radar->defaultFilters();
        $filters  = $request->filters($defaults);

        $initialSunDirection = SunDirectionCalculator::eclipticDirectionAt(
            CarbonImmutable::now('UTC'),
        );

        return Inertia::render('Radar/Index', [
            'filters'             => $filters,
            'initialSunDirection' => $initialSunDirection,
        ]);
    }

    /**
     * Responsabilidade: retorna os N objetos mais próximos da Terra agora,
     * com trajetória completa do Horizons.
     */
    public function closestNow(RadarClosestNowRequest $request): JsonResponse
    {
        $defaults = $this->radar->defaultFilters();

        $anchorMin    = (string) ($request->input('date_min') ?? $defaults['date_min']);
        $anchorMax    = (string) ($request->input('date_max') ?? $defaults['date_max']);
        $limit        = (int) ($request->input('limit', 5));
        $mode         = (string) ($request->input('mode', 'nearest'));
        $forceRefresh = (bool) ($request->input('force_refresh', false));

        // Alarga ±3 dias no modo nearest para capturar objetos cujo pico foi
        // ontem mas ainda estão entre os mais próximos agora.
        if ($mode === 'nearest') {
            $dateMin = CarbonImmutable::parse($anchorMin, 'UTC')->subDays(3)->toDateString();
            $dateMax = CarbonImmutable::parse($anchorMax, 'UTC')->addDays(3)->toDateString();
        } else {
            $dateMin = $anchorMin;
            $dateMax = $anchorMax;
        }

        Log::info('[closestNow] request', compact('anchorMin', 'anchorMax', 'dateMin', 'dateMax', 'limit', 'mode'));

        try {
            $payload = $this->closestNow->select($dateMin, $dateMax, $limit, $mode, $anchorMin, $forceRefresh);
        } catch (\Throwable $e) {
            Log::error('[closestNow] falha ao selecionar objetos', ['error' => $e->getMessage()]);

            $payload = $this->emptyClosestNowPayload($mode, $dateMin, $dateMax, $limit);
        }

        return response()->json($payload)->header('Cache-Control', 'no-store');
    }

    /**
     * Responsabilidade: retorna os asteroides famosos (Ceres, Vesta, Eros, Bennu, Itokawa) com
     * posição e trilha curta de movimento do JPL Horizons, no mesmo shape do closest-now.
     *
     * Lista fixa (não passa pelo feed de aproximações): o único parâmetro aceito é force_refresh.
     */
    public function famous(RadarClosestNowRequest $request): JsonResponse
    {
        $forceRefresh = (bool) ($request->input('force_refresh', false));

        try {
            $payload = $this->famous->select($forceRefresh);
        } catch (\Throwable $e) {
            Log::error('[famous] falha ao resolver asteroides famosos', ['error' => $e->getMessage()]);

            $payload = $this->emptyClosestNowPayload('famous', '', '', 5);
        }

        return response()->json($payload)
            ->header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=1800');
    }

    /**
     * Responsabilidade: retorna vetores de trajetória do JPL Horizons (eclíptico J2000, km, Terra como origem de medição).
     * Âncoras: 'approach' (centrada no pico) ou 'now' (centrada no instante atual).
     */
    public function trajectory(RadarTrajectoryRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $anchor  = (string) ($payload['anchor'] ?? 'approach');

        if ($anchor === 'now') {
            $window = $this->trajectoryWindowFor((int) ($payload['history_days'] ?? 365));

            return response()->json($this->horizons->trajectoryAroundNow($payload, $window))
                ->header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=1800');
        }

        return response()->json($this->horizons->trajectory($payload))
            ->header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    }

    /**
     * Responsabilidade: resolve o modelo 3D mais adequado para um asteroide
     * com base em nome, designação e parâmetros físicos.
     */
    public function asteroidModel(RadarAsteroidModelRequest $request): JsonResponse
    {
        $ttl = (int) config('services.asteroid_models.cache_ttl', 604800);

        return response()->json($this->asteroidModels->resolve($request->validated()))
            ->header('Cache-Control', "public, max-age={$ttl}, stale-while-revalidate=86400");
    }

    /**
     * Responsabilidade: retorna o detalhe físico/orbital de um small-body (JPL SBDB) como JSON,
     * para enriquecer o card dos asteroides famosos do radar sem recarregar a página.
     *
     * Reusa o mesmo SmallBodyService da página de viajantes; o front mostra a base na hora e
     * preenche o resto quando esta resposta chega (carregamento progressivo, sem bloquear).
     */
    public function smallBody(SmallBodyLookupRequest $request): JsonResponse
    {
        try {
            $data = $this->smallBodies->lookup($request->identifier());
        } catch (JplApiException $exception) {
            return response()->json(
                ['error' => $exception->getUserMessage()],
                $exception->getStatusCode(),
            );
        }

        return response()->json($data['smallBody'])
            ->header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
    }

    private function trajectoryWindowFor(int $historyDays): array
    {
        $days = max(7, min($historyDays, 720));

        return match (true) {
            $days <= 45  => ['startOffsetHours' => -($days * 24), 'stopOffsetHours' => 0, 'stepSize' => '6 hours'],
            $days <= 365 => ['startOffsetHours' => -($days * 24), 'stopOffsetHours' => 0, 'stepSize' => '1 day'],
            default      => ['startOffsetHours' => -($days * 24), 'stopOffsetHours' => 0, 'stepSize' => '3 days'],
        };
    }

    private function emptyClosestNowPayload(string $mode, string $dateMin, string $dateMax, int $limit): array
    {
        return [
            'mode'                => 'closest_now',
            'selectionMode'       => $mode,
            'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
            'window'              => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
            'requestedLimit'      => $limit,
            'candidatesEvaluated' => 0,
            'objects'             => [],
            'lunarReference'      => [
                'distanceKm'           => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label'                => 'Distância média Terra-Lua',
                'description'          => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
            ],
        ];
    }
}
