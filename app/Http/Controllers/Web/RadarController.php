<?php

namespace App\Http\Controllers\Web;

use App\Http\Requests\ApproachObservatoryRequest;
use App\Services\Approaches\AsteroidModelResolverService;
use App\Services\Approaches\RadarService;
use App\Services\Approaches\ClosestNowSelector;
use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Support\SunDirectionCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RadarController
{
    public function __construct(
        private readonly RadarService $observatory,
        private readonly AsteroidModelResolverService $asteroidModels,
        private readonly HorizonsTrajectoryService $horizons,
        private readonly ClosestNowSelector $closestNow,
    ) {
    }

    /**
     * Renderiza a página do radar orbital 3D.
     *
     * Envia a direção solar calculada pelo servidor para que a cena ilumine
     * corretamente desde o primeiro frame, antes do astronomy-engine resolver
     * seu import lazy no cliente.
     */
    public function index(ApproachObservatoryRequest $request): Response
    {
        $defaults = $this->observatory->defaultFilters();
        $filters = $request->filters($defaults);

        $initialSunDirection = SunDirectionCalculator::eclipticDirectionAt(
            CarbonImmutable::now('UTC'),
        );

        return Inertia::render('Radar/Index', [
            'filters'            => $filters,
            'initialSunDirection' => $initialSunDirection,
        ]);
    }

    /**
     * Retorna os N objetos mais próximos da Terra agora, com trajetória completa do Horizons.
     *
     * Parâmetros aceitos:
     *   - limit : 1–30 (padrão 5)
     *   - mode  : 'nearest' | 'upcoming' (padrão 'nearest')
     *   - date_min / date_max : janela de busca (padrão: filtros do observatório)
     *   - force_refresh : ignora cache e força nova busca
     */
    public function closestNow(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_min'      => ['nullable', 'date_format:Y-m-d'],
            'date_max'      => ['nullable', 'date_format:Y-m-d'],
            'limit'         => ['nullable', 'integer', 'min:1', 'max:30'],
            'mode'          => ['nullable', 'string', 'in:nearest,upcoming'],
            'force_refresh' => ['nullable', 'boolean'],
        ]);

        $defaults     = $this->observatory->defaultFilters();
        $anchorMin    = (string) ($validated['date_min'] ?? $defaults['date_min']);
        $anchorMax    = (string) ($validated['date_max'] ?? $defaults['date_max']);
        $limit        = (int) ($validated['limit'] ?? 5);
        $mode         = (string) ($validated['mode'] ?? 'nearest');
        $forceRefresh = (bool) ($validated['force_refresh'] ?? false);

        // Para 'nearest': alarga ±3 dias para capturar objetos cujo pico foi ontem
        // mas ainda estão entre os mais próximos agora. Para outros modos o selector
        // define a própria janela de candidatos.
        try {
            if ($mode === 'nearest') {
                $dateMin = CarbonImmutable::parse($anchorMin, 'UTC')->subDays(3)->toDateString();
                $dateMax = CarbonImmutable::parse($anchorMax, 'UTC')->addDays(3)->toDateString();
            } else {
                $dateMin = $anchorMin;
                $dateMax = $anchorMax;
            }
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

    /**
     * Retorna a trajetória geocêntrica de um objeto via JPL Horizons.
     *
     * Âncoras disponíveis:
     *   - 'approach' (padrão): trajetória centrada no momento de maior aproximação.
     *   - 'now': trajetória centrada no instante atual, com janela histórica configurável.
     */
    public function trajectory(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'id'               => ['required', 'string', 'max:160'],
            'name'             => ['required', 'string', 'max:180'],
            'displayName'      => ['nullable', 'string', 'max:180'],
            'rawName'          => ['nullable', 'string', 'max:220'],
            'designation'      => ['nullable', 'string', 'max:80'],
            'detailIdentifier' => ['nullable', 'string', 'max:120'],
            'spkId'            => ['nullable', 'string', 'max:80'],
            'approachTime'     => ['required', 'string', 'max:80'],
            'anchor'           => ['nullable', 'string', 'in:approach,now'],
            'history_days'     => ['nullable', 'integer', 'min:7', 'max:720'],
        ]);

        $anchor = (string) ($payload['anchor'] ?? 'approach');

        if ($anchor === 'now') {
            $historyDays = (int) ($payload['history_days'] ?? 365);

            return response()->json(
                $this->horizons->trajectoryAroundNow($payload, $this->trajectoryWindowFor($historyDays))
            )->header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=1800');
        }

        return response()->json($this->horizons->trajectory($payload))
            ->header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    }

    /**
     * Resolve o modelo 3D mais adequado para um asteroide com base em nome,
     * designação e parâmetros físicos.
     */
    public function asteroidModel(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'id'               => ['required', 'string', 'max:160'],
            'name'             => ['required', 'string', 'max:180'],
            'displayName'      => ['nullable', 'string', 'max:180'],
            'designation'      => ['nullable', 'string', 'max:80'],
            'detailIdentifier' => ['nullable', 'string', 'max:120'],
            'spkId'            => ['nullable', 'string', 'max:80'],
            'objectType'       => ['nullable', 'string', 'max:40'],
            'diameterMeters'   => ['nullable', 'numeric'],
            'diameterMinMeters' => ['nullable', 'numeric'],
            'diameterMaxMeters' => ['nullable', 'numeric'],
            'absoluteMagnitude' => ['nullable', 'numeric'],
        ]);

        $ttl = (int) config('services.asteroid_models.cache_ttl', 604800);

        return response()->json($this->asteroidModels->resolve($payload))
            ->header('Cache-Control', "public, max-age={$ttl}, stale-while-revalidate=86400");
    }

    /**
     * Define a janela temporal para trajetórias ancoradas em "agora".
     * Step menor para históricos curtos (mais detalhe); step maior para janelas longas
     * (menos pontos, resposta mais rápida do Horizons).
     *
     * @return array{startOffsetHours:int, stopOffsetHours:int, stepSize:string}
     */
    private function trajectoryWindowFor(int $historyDays): array
    {
        $days = max(7, min($historyDays, 720));

        if ($days <= 45) {
            return ['startOffsetHours' => -($days * 24), 'stopOffsetHours' => 0, 'stepSize' => '6 hours'];
        }

        if ($days <= 365) {
            return ['startOffsetHours' => -($days * 24), 'stopOffsetHours' => 0, 'stepSize' => '1 day'];
        }

        return ['startOffsetHours' => -($days * 24), 'stopOffsetHours' => 0, 'stepSize' => '3 days'];
    }
}
