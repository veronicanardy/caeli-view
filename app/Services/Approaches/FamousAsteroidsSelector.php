<?php

namespace App\Services\Approaches;

use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Support\Asteroids\FamousAsteroids;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;
use Illuminate\Support\Facades\Log;

/**
 * Resolve os asteroides famosos (Ceres, Vesta, Eros, Bennu, Itokawa) com posição e trilha curta
 * de movimento do JPL Horizons ao vivo, no mesmo shape do feed closest-now.
 *
 * Responsabilidade: para cada famoso, consultar o Horizons no instante atual (trajectoryAroundNow),
 * montar o ClosestNowObject (approach sintético + trajetória real) e devolver o payload pronto para
 * o front, cacheado. Espelha a parte de montagem de ClosestNowSelector, sem o pipeline de candidatos:
 * a lista é fixa e pequena (5).
 *
 * Por que separado do ClosestNowSelector: os famosos não passam pelo CAD/NeoWs (raramente se
 * aproximam), então não há descoberta nem ranking por distância. Só identidade fixa + Horizons.
 *
 * @see HorizonsTrajectoryService  Provedor da posição/trilha vetorial real
 * @see FamousAsteroids            Fonte de verdade da identidade dos 5
 */
final class FamousAsteroidsSelector
{
    /**
     * Janela de movimento geocêntrico: 72h de passado até agora, passo de 6h. Curta de propósito.
     * Esses corpos são distantes e não "se aproximam"; a trilha é só o movimento de poucos dias,
     * fisicamente pequena (sem a compressão log que esticava o radar antigo).
     */
    private const HORIZONS_WINDOW = [
        'startOffsetHours' => -72,
        'stopOffsetHours'  => 0,
        'stepSize'         => '6 hours',
    ];

    /**
     * Tamanho do lote paralelo ao Horizons. O JPL faz rate-limit por IP e devolve HTTP 503 quando
     * recebe muitas requisições simultâneas (na prática aceita ~2): disparar os 5 famosos de uma vez
     * fazia 2-3 caírem em 503 e irem para o fallback simbólico (Bennu, o último, era o que mais perdia).
     * Lotes de 2 com pausa entre eles (BATCH_PAUSE_MICROSECONDS) respeitam esse limite. Espelha o
     * padrão de ClosestNowSelector::fetchTrajectoriesParallel.
     */
    private const BATCH_SIZE = 2;

    /** Pausa entre lotes para não estourar o rate-limit do Horizons. 400ms, como no closest-now. */
    private const BATCH_PAUSE_MICROSECONDS = 400_000;

    /** TTL do payload resolvido. Alinhado ao sucesso do trajectoryAroundNow (30 min). */
    private const RESULT_CACHE_TTL_SECONDS = 1800;

    /** Versão do formato da resposta. Incrementar ao mudar o shape. */
    private const CACHE_VERSION = 'famous-v1';

    public function __construct(
        private readonly HorizonsTrajectoryService $horizons,
    ) {
    }

    /**
     * Payload dos famosos no mesmo contrato de ClosestNowSelector::select (mode 'closest_now',
     * selectionMode 'famous'). Cacheado; force_refresh ignora o cache.
     *
     * @return array<string, mixed>
     */
    public function select(bool $forceRefresh = false): array
    {
        $cacheKey = 'famous-asteroids:'.self::CACHE_VERSION;

        if ($forceRefresh) {
            Cache::forget($cacheKey);
            Cache::forget("illuminate:cache:flexible:created:{$cacheKey}");
        }

        return Cache::flexible(
            $cacheKey,
            [self::RESULT_CACHE_TTL_SECONDS, self::RESULT_CACHE_TTL_SECONDS + 900],
            fn (): array => $this->resolve($forceRefresh),
        );
    }

    /**
     * Executa as consultas ao Horizons em lote e monta o payload, sem cache.
     *
     * @return array<string, mixed>
     */
    private function resolve(bool $forceRefresh = false): array
    {
        $trajectories = $this->fetchTrajectoriesParallel($forceRefresh);
        $objects      = $this->buildObjects($trajectories);

        $available = count(array_filter(
            $objects,
            static fn (array $o): bool => $o['hasRealCurrentDistance'] === true,
        ));

        Log::info('[FamousAsteroids] resolvido', [
            'total'     => count($objects),
            'com_horizons' => $available,
        ]);

        return [
            'mode'                => 'closest_now',
            'selectionMode'       => 'famous',
            'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
            'window'              => ['dateMin' => '', 'dateMax' => ''],
            'requestedLimit'      => count(FamousAsteroids::all()),
            'candidatesEvaluated' => count(FamousAsteroids::all()),
            'objects'             => $objects,
            'lunarReference'      => [
                'distanceKm'           => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label'                => 'Distância média Terra-Lua',
                'description'          => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
            ],
        ];
    }

    /**
     * Consulta o Horizons para os 5 famosos em lotes paralelos pequenos (BATCH_SIZE), com pausa
     * entre lotes para respeitar o rate-limit do JPL. Mesmo padrão de
     * ClosestNowSelector::fetchTrajectoriesParallel.
     *
     * $forceRefresh chega até o cache interno de cada trajetória (trajectoryAroundNow), curando
     * valores envenenados que o cache externo do select() sozinho não alcança.
     *
     * @return array<string, array<string, mixed>>  Indexado pelo id sintético do famoso.
     */
    private function fetchTrajectoriesParallel(bool $forceRefresh = false): array
    {
        $tasks = [];

        foreach (FamousAsteroids::all() as $famous) {
            $payload = FamousAsteroids::horizonsPayload($famous);
            $id      = (string) $payload['id'];
            $tasks[$id] = fn () => $this->horizons->trajectoryAroundNow($payload, self::HORIZONS_WINDOW, $forceRefresh);
        }

        if ($tasks === []) {
            return [];
        }

        $results = [];
        $batches = array_chunk($tasks, self::BATCH_SIZE, preserve_keys: true);

        foreach ($batches as $index => $batch) {
            // Pausa ANTES de cada lote, exceto o primeiro: dá folga ao rate-limit do Horizons entre rajadas.
            if ($index > 0) {
                usleep(self::BATCH_PAUSE_MICROSECONDS);
            }

            $results = array_merge($results, Concurrency::run($batch));
        }

        return $results;
    }

    /**
     * Monta o ClosestNowObject de cada famoso: approach sintético + trajetória real (ou null em
     * caso de falha do Horizons). O fallback null garante que o famoso nunca suma da cena: o front
     * cai para a posição Kepler local nesse caso.
     *
     * @param  array<string, array<string, mixed>>  $trajectories
     * @return array<int, array<string, mixed>>
     */
    private function buildObjects(array $trajectories): array
    {
        $objects = [];

        foreach (FamousAsteroids::all() as $famous) {
            $id         = FamousAsteroids::idFor($famous['number']);
            $trajectory = $trajectories[$id] ?? null;
            $available  = is_array($trajectory) && ($trajectory['status'] ?? null) === 'available';

            $currentKm = $available && is_numeric($trajectory['currentDistanceKm'] ?? null)
                ? (float) $trajectory['currentDistanceKm']
                : null;

            $objects[] = [
                'approach'               => FamousAsteroids::syntheticApproach($famous),
                'trajectory'             => $available ? $trajectory : null,
                'currentDistanceKm'      => $currentKm,
                'currentDistanceLD'      => $currentKm !== null
                    ? $currentKm / DistancePresenter::LUNAR_DISTANCE_KM
                    : null,
                'hasRealCurrentDistance' => $available,
            ];
        }

        return $objects;
    }
}
