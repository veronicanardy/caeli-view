<?php

namespace App\Services\Approaches;

use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Support\SunDirectionCalculator;
use App\Support\Spacecraft\FamousSpacecraft;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;
use Illuminate\Support\Facades\Log;

/**
 * Resolve a POSIÇÃO ATUAL das naves famosas (Voyager 1/2, Pioneer 10, New Horizons, Juno) no JPL
 * Horizons, entregando para cada uma um vetor HELIOCÊNTRICO em UA (eclíptico J2000), pronto para o
 * frontend usar na régua da cena. As naves não entram no feed /radar/famous: vivem na cena como os
 * planetas. Este selector alimenta o endpoint próprio /radar/spacecraft.
 *
 * Por que vetor heliocêntrico pronto: o Horizons mede a posição geocêntrica (km, Terra na origem). A
 * conversão para heliocêntrico é `geocêntrico/KM_PER_AU + posição_da_Terra`. Para uma nave a dezenas
 * de UA, a posição da Terra (~1 UA) é desprezível (<1% em 150 UA), então usamos a aproximação simples
 * `Terra ≈ -direção_do_Sol` (vetor unitário × 1 UA). Direção e região ficam exatas; a fração de UA do
 * offset da Terra é ruído numa nave tão distante.
 *
 * Fallback: quando o Horizons falha para uma nave, ela simplesmente NÃO entra no payload (available
 * ausente). O frontend cai no vetor fixo local (knownSpacecraft.ts), então a nave nunca some.
 *
 * Espelha a montagem em lote de FamousAsteroidsSelector (respeitando o rate-limit do JPL), sem o
 * pipeline de candidatos: a lista é fixa e pequena.
 *
 * @see FamousSpacecraft           Fonte de verdade da identidade das naves
 * @see HorizonsTrajectoryService  Provedor da posição vetorial real
 */
final class SpacecraftPositionSelector
{
    /** UA em km (mesma constante do frontend, physicalConstants.ts). */
    private const KM_PER_AU = 149_597_870.7;

    /**
     * Janela curta de movimento geocêntrico: 6h de passado até 6h de futuro, passo de 6h. Naves
     * distantes mal se movem nesse intervalo; só precisamos de pontos suficientes para o serviço
     * extrair a posição "agora" (currentPoint). Janela mínima viável (retrier exige ≥2 pontos).
     */
    private const HORIZONS_WINDOW = [
        'startOffsetHours' => -6,
        'stopOffsetHours'  => 6,
        'stepSize'         => '6 hours',
    ];

    /** Lote paralelo pequeno: o JPL faz rate-limit por IP (HTTP 503 com muitas simultâneas). */
    private const BATCH_SIZE = 2;

    /** Pausa entre lotes para não estourar o rate-limit do Horizons. */
    private const BATCH_PAUSE_MICROSECONDS = 400_000;

    /** TTL do payload resolvido. Alinhado ao sucesso do trajectoryAroundNow (30 min). */
    private const RESULT_CACHE_TTL_SECONDS = 1800;

    /** Versão do formato da resposta. Incrementar ao mudar o shape. */
    private const CACHE_VERSION = 'spacecraft-v1';

    public function __construct(
        private readonly HorizonsTrajectoryService $horizons,
    ) {
    }

    /**
     * Payload das posições das naves, cacheado. force_refresh ignora o cache.
     *
     * @return array<string, mixed>
     */
    public function select(bool $forceRefresh = false): array
    {
        $cacheKey = 'spacecraft-positions:'.self::CACHE_VERSION;

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
        $now = CarbonImmutable::now('UTC');
        $earthHelio = $this->earthHelioAU($now);
        $trajectories = $this->fetchTrajectoriesParallel($forceRefresh);

        $objects = [];
        foreach (FamousSpacecraft::all() as $craft) {
            $id = FamousSpacecraft::idFor($craft['horizonsId']);
            $helio = $this->helioFromTrajectory($trajectories[$id] ?? null, $earthHelio);

            // Sem posição ao vivo: a nave não entra no payload. O front usa o vetor fixo local.
            if ($helio === null) {
                continue;
            }

            $objects[] = [
                'horizonsId' => $craft['horizonsId'],
                'id'         => $id,
                'name'       => $craft['name'],
                'helioAU'    => $helio,
            ];
        }

        Log::info('[SpacecraftPosition] resolvido', [
            'total'        => count(FamousSpacecraft::all()),
            'com_horizons' => count($objects),
        ]);

        return [
            'generatedAt' => $now->toIso8601String(),
            'objects'     => $objects,
        ];
    }

    /**
     * Consulta o Horizons para as naves em lotes paralelos pequenos, com pausa entre lotes.
     *
     * @return array<string, array<string, mixed>>  Indexado pelo id sintético da nave.
     */
    private function fetchTrajectoriesParallel(bool $forceRefresh): array
    {
        $tasks = [];
        foreach (FamousSpacecraft::all() as $craft) {
            $payload = FamousSpacecraft::horizonsPayload($craft);
            $id = FamousSpacecraft::idFor($craft['horizonsId']);
            $tasks[$id] = fn () => $this->horizons->trajectoryAroundNow($payload, self::HORIZONS_WINDOW, $forceRefresh);
        }

        if ($tasks === []) {
            return [];
        }

        $results = [];
        foreach (array_chunk($tasks, self::BATCH_SIZE, preserve_keys: true) as $index => $batch) {
            if ($index > 0) {
                usleep(self::BATCH_PAUSE_MICROSECONDS);
            }
            $results = array_merge($results, Concurrency::run($batch));
        }

        return $results;
    }

    /**
     * Converte o currentPoint geocêntrico (km) de uma trajetória em vetor heliocêntrico (UA), ou null
     * quando a trajetória não está disponível.
     *
     * @param  array<string, mixed>|null  $trajectory
     * @param  array{x: float, y: float, z: float}  $earthHelio
     * @return array{x: float, y: float, z: float}|null
     */
    private function helioFromTrajectory(?array $trajectory, array $earthHelio): ?array
    {
        if (! is_array($trajectory) || ($trajectory['status'] ?? null) !== 'available') {
            return null;
        }

        $point = $trajectory['currentPoint'] ?? null;
        if (! is_array($point) || ! is_numeric($point['x'] ?? null) || ! is_numeric($point['y'] ?? null)) {
            return null;
        }

        return [
            'x' => $earthHelio['x'] + ((float) $point['x']) / self::KM_PER_AU,
            'y' => $earthHelio['y'] + ((float) $point['y']) / self::KM_PER_AU,
            'z' => $earthHelio['z'] + ((float) ($point['z'] ?? 0)) / self::KM_PER_AU,
        ];
    }

    /**
     * Posição heliocêntrica aproximada da Terra (UA, eclíptico J2000) no instante: a Terra fica a ~1 UA
     * na direção OPOSTA ao Sol. `SunDirectionCalculator` dá a direção Terra→Sol no plano eclíptico, então
     * Terra ≈ -(sunX, sunY, 0). Aproximação honesta para o uso aqui (offset desprezível a dezenas de UA).
     *
     * @return array{x: float, y: float, z: float}
     */
    private function earthHelioAU(CarbonImmutable $now): array
    {
        $sun = SunDirectionCalculator::eclipticDirectionAt($now);

        return [
            'x' => -((float) $sun['x']),
            'y' => -((float) $sun['y']),
            'z' => 0.0,
        ];
    }
}
