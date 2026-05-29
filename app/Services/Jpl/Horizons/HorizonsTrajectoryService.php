<?php

namespace App\Services\Jpl\Horizons;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Orquestra consultas de trajetória e posição de objetos próximos à Terra via API JPL Horizons.
 *
 * Responsabilidades deste service:
 *   - Decidir janelas temporais e parâmetros de passo para cada tipo de consulta.
 *   - Gerenciar chaves e TTLs de cache (positivo e negativo).
 *   - Calcular estados de movimento e segmentar pontos em passado/futuro.
 *   - Delegar resolução de identidade a HorizonsObjectIdentity.
 *   - Delegar fetch com retry/fallback a HorizonsEphemerisRetrier.
 *   - Delegar montagem de payload a HorizonsResultFactory.
 */
final class HorizonsTrajectoryService
{
    /** Versões de cache por tipo de consulta — incrementar ao mudar o formato da resposta. */
    private const TRAJECTORY_CACHE_VERSION = 'command-v4';
    private const POSITION_CACHE_VERSION = 'reftime-v3';
    private const NOW_TRAJECTORY_CACHE_VERSION = 'now-traj-v2-elements';

    /** Arredondamento de tempo para cache compartilhado entre objetos no mesmo tick. */
    private const CURRENT_MODE_BUCKET_MINUTES = 15;
    private const NOW_TRAJECTORY_BUCKET_MINUTES = 30;

    /** TTLs de cache para respostas bem-sucedidas (segundos). */
    private const CURRENT_MODE_SUCCESS_TTL_SECONDS = 900;   // 15 min
    private const NOW_TRAJECTORY_SUCCESS_TTL_SECONDS = 1800; // 30 min

    /** TTL de cache negativo (falha): mais curto em local para facilitar debug. */
    private const NEGATIVE_TTL_LOCAL_SECONDS = 120;
    private const NEGATIVE_TTL_DEFAULT_SECONDS = 600;

    public function __construct(
        private readonly HorizonsEphemerisRetrier $retrier,
        private readonly HorizonsObjectIdentity $identity,
        private readonly HorizonsResultFactory $factory,
    ) {
    }

    // =========================================================================
    // API pública
    // =========================================================================

    /**
     * Trajetória de um único objeto, com janela de ±2 dias em torno da aproximação máxima.
     *
     * O resultado é cacheado indefinidamente (TTL configurável em services.jpl.horizons_cache_ttl)
     * porque a trajetória de uma aproximação passada não muda.
     *
     * @param  array<string, mixed>  $object
     */
    public function trajectory(array $object): array
    {
        $approachTime = $this->parseTime($object['approachTime'] ?? null);
        if ($approachTime === null) {
            $objectId = $this->identity->resolveId($object);

            return $this->factory->unavailableTrajectory(
                $object,
                $objectId,
                'Trajetória atual indisponível para este objeto; exibindo apenas a aproximação registrada.',
            );
        }

        $objectId = $this->identity->resolveId($object);
        $key = 'horizons_trajectory_'.md5(
            $objectId.'|'.$approachTime->toIso8601String().'|earth|72h|1h|'.self::TRAJECTORY_CACHE_VERSION
        );
        $ttl = (int) config('services.jpl.horizons_cache_ttl', 86400);

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        $result = $this->buildTrajectoryResult($object, $objectId, $approachTime);

        if (($result['status'] ?? null) === 'available') {
            Cache::put($key, $result, $ttl);
        }

        return $result;
    }

    /**
     * Posição de cada aproximação em um horário de referência, em lote.
     *
     * Modos:
     *   - 'current': usa o instante compartilhado (agora, arredondado em 15 min) para todos.
     *   - 'closest_approach': usa o horário de máxima aproximação de cada objeto.
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @return array<string, array<string, mixed>>
     */
    public function positionsAtReferenceTimeBatch(array $approaches, string $mode = 'current', ?CarbonImmutable $referenceTime = null): array
    {
        $mode = in_array($mode, ['current', 'closest_approach'], true) ? $mode : 'current';
        $sharedReferenceTime = $mode === 'current'
            ? $this->bucketTime($referenceTime ?? CarbonImmutable::now('UTC'), self::CURRENT_MODE_BUCKET_MINUTES)
            : null;

        $results = [];

        foreach ($approaches as $approach) {
            $id = (string) ($approach['id'] ?? $this->identity->resolveId($approach));
            $results[$id] = $this->positionAtReferenceTime($approach, $mode, $sharedReferenceTime);
        }

        return $results;
    }

    /**
     * Trajetória ancorada no instante atual (UTC), segmentada em passado/presente/futuro.
     *
     * Usada pelo radar "5 mais próximos agora": mostra onde cada objeto está AGORA
     * e a curva que traça nas horas ao redor, derivada de efemérides reais.
     *
     * @param  array<string, mixed>  $object
     * @param  array{startOffsetHours: int, stopOffsetHours: int, stepSize: string}  $window
     *         Ex.: ['startOffsetHours' => -24, 'stopOffsetHours' => 72, 'stepSize' => '1 hours']
     */
    public function trajectoryAroundNow(array $object, array $window): array
    {
        $startOffset = (int) ($window['startOffsetHours'] ?? -24);
        $stopOffset = (int) ($window['stopOffsetHours'] ?? 72);
        $stepSize = (string) ($window['stepSize'] ?? '1 hours');

        $now = $this->bucketTime(CarbonImmutable::now('UTC'), self::NOW_TRAJECTORY_BUCKET_MINUTES);
        $objectId = $this->identity->resolveId($object);

        $key = 'horizons_now_traj_'.md5(implode('|', [
            $objectId,
            $now->toIso8601String(),
            (string) $startOffset,
            (string) $stopOffset,
            $stepSize,
            self::NOW_TRAJECTORY_CACHE_VERSION,
        ]));

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        $windowStart = $startOffset >= 0 ? $now->addHours($startOffset) : $now->subHours(abs($startOffset));
        $windowEnd = $stopOffset >= 0 ? $now->addHours($stopOffset) : $now->subHours(abs($stopOffset));

        ['commands' => $commands, 'identity' => $identity] = $this->identity->buildCommandCandidatesWithIdentity($object);
        $designation = $this->identity->resolveDesignation($object, $identity);

        $fetch = $this->retrier->fetch(
            $commands,
            $windowStart->format('Y-M-d H:i'),
            $windowEnd->format('Y-M-d H:i'),
            $stepSize,
            $designation,
        );
        $points = $fetch->pointsToArray();
        $approachTime = $this->parseTime($object['approachTime'] ?? null);

        if ($points === null || count($points) < 2) {
            $reason = $fetch->failureReason ?? 'no_ephemeris';
            Log::info('[Horizons now-trajectory] fallback para simbólico', [
                'objectId' => $objectId,
                'reason' => $reason,
            ]);
            $result = $this->factory->unavailableTrajectory(
                $object,
                $objectId,
                'Trajetória indisponível para este objeto no momento.',
                $reason,
                $approachTime,
            );
            Cache::put($key, $result, $this->negativeCacheTtl());

            return $result;
        }

        $currentPoint = $this->closestPointTo($points, $now);
        $segmented = $this->segmentPointsAroundNow($points, $now);
        $approachPoint = $approachTime !== null ? $this->closestPointTo($points, $approachTime) : null;

        $result = $this->factory->availableNowTrajectory(
            $object,
            $objectId,
            $now,
            $approachTime,
            $points,
            $segmented['past'],
            $segmented['future'],
            $currentPoint,
            $fetch->elementsToArray(),
            $this->motionState($now, $approachTime ?? $now, $currentPoint, $approachPoint),
        );

        Cache::put($key, $result, self::NOW_TRAJECTORY_SUCCESS_TTL_SECONDS);

        return $result;
    }

    // =========================================================================
    // Lógica interna de orquestração
    // =========================================================================

    /**
     * Posição de um único objeto no horário de referência determinado pelo modo.
     *
     * Janela estreita (±15 min, passo 3 min) mantém o uso de quota baixo
     * enquanto garante um ponto próximo o suficiente do instante solicitado.
     *
     * @param  array<string, mixed>  $object
     */
    private function positionAtReferenceTime(array $object, string $mode, ?CarbonImmutable $sharedReferenceTime): array
    {
        $id = (string) ($object['id'] ?? $this->identity->resolveId($object));
        $approachTime = $this->parseTime($object['approachTime'] ?? null);

        $referenceTime = $mode === 'current' ? $sharedReferenceTime : $approachTime;

        if ($referenceTime === null) {
            $reason = $mode === 'current'
                ? 'Horário de referência indisponível para projeção Horizons.'
                : 'Horário de aproximação indisponível para projeção Horizons.';

            return $this->factory->symbolicPosition($id, $object, $reason, 'no_reference_time', $approachTime);
        }

        $objectId = $this->identity->resolveId($object);
        $key = 'horizons_reftime_pos_'.md5(implode('|', [
            $objectId,
            $mode,
            $referenceTime->toIso8601String(),
            self::POSITION_CACHE_VERSION,
        ]));

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        ['commands' => $commands, 'identity' => $identity] = $this->identity->buildCommandCandidatesWithIdentity($object);
        $designation = $this->identity->resolveDesignation($object, $identity);

        $fetch = $this->retrier->fetch(
            $commands,
            $referenceTime->subMinutes(15)->format('Y-M-d H:i'),
            $referenceTime->addMinutes(15)->format('Y-M-d H:i'),
            '3 minutes',
            $designation,
        );
        $points = $fetch->pointsToArray();

        if ($points === null || count($points) === 0) {
            $reason = $fetch->failureReason ?? 'no_ephemeris';
            Log::info('[Horizons positions] fallback para simbólico', [
                'objectId' => $objectId,
                'mode' => $mode,
                'reason' => $reason,
            ]);
            $result = $this->factory->symbolicPosition(
                $id,
                $object,
                $this->factory->noteForFailure($reason, $mode),
                $reason,
                $approachTime,
            );
            Cache::put($key, $result, $this->negativeCacheTtl());

            return $result;
        }

        $chosen = $this->closestPointTo($points, $referenceTime);
        if ($chosen === null) {
            Log::info('[Horizons positions] nenhum ponto próximo do horário de referência', [
                'objectId' => $objectId,
                'mode' => $mode,
            ]);
            $result = $this->factory->symbolicPosition(
                $id,
                $object,
                'Sem ponto Horizons próximo do horário de referência. Representação simbólica baseada na distância.',
                'no_point_near_reference',
                $approachTime,
            );
            Cache::put($key, $result, $this->negativeCacheTtl());

            return $result;
        }

        $result = $this->factory->availablePosition($id, $object, $chosen, $mode, $referenceTime, $approachTime);
        Cache::put($key, $result, $this->successCacheTtl($mode));

        return $result;
    }

    /**
     * Monta o resultado completo de trajetória ±2 dias.
     *
     * Ajusta a janela temporal caso o instante atual esteja fora dela,
     * garantindo que o radar sempre tenha um ponto de referência próximo de agora.
     *
     * @param  array<string, mixed>  $object
     */
    private function buildTrajectoryResult(array $object, string $objectId, CarbonImmutable $approachTime): array
    {
        $now = CarbonImmutable::now('UTC');
        $windowStart = $approachTime->subDays(2);
        $windowEnd = $approachTime->addDays(2);

        // Expande a janela para incluir o instante atual quando ele está fora do intervalo.
        if ($now->lessThan($windowStart)) {
            $windowStart = $now->subHours(6);
        }
        if ($now->greaterThan($windowEnd)) {
            $windowEnd = $now->addHours(6);
        }

        ['commands' => $commands, 'identity' => $identity] = $this->identity->buildCommandCandidatesWithIdentity($object);
        $designation = $this->identity->resolveDesignation($object, $identity);

        $fetch = $this->retrier->fetch(
            $commands,
            $windowStart->format('Y-M-d H:i'),
            $windowEnd->format('Y-M-d H:i'),
            '1 hours',
            $designation,
        );
        $points = $fetch->pointsToArray();

        if ($points === null || count($points) < 3) {
            $reason = $fetch->failureReason ?? 'no_ephemeris';

            return $this->factory->unavailableTrajectory(
                $object,
                $objectId,
                'Trajetória atual indisponível para este objeto; exibindo apenas a aproximação registrada.',
                $reason,
                $approachTime,
            );
        }

        $referencePoint = $this->closestPointTo($points, $now);
        $closestPoint = $this->closestPointTo($points, $approachTime);

        return $this->factory->availableTrajectory(
            $object,
            $objectId,
            $approachTime,
            $points,
            $referencePoint,
            $closestPoint,
            $this->motionState($now, $approachTime, $referencePoint, $closestPoint),
        );
    }

    // =========================================================================
    // Utilitários de ponto e tempo
    // =========================================================================

    /**
     * Divide a lista de pontos em passado (timestamp ≤ agora) e futuro (timestamp > agora),
     * ambos em ordem cronológica para que renderers possam desenhar polylines diretamente.
     *
     * @param  array<int, array<string, mixed>>  $points
     * @return array{past: array<int, array<string, mixed>>, future: array<int, array<string, mixed>>}
     */
    private function segmentPointsAroundNow(array $points, CarbonImmutable $now): array
    {
        $past = [];
        $future = [];
        $nowEpoch = $now->getTimestamp();

        foreach ($points as $point) {
            try {
                $stamp = CarbonImmutable::parse((string) ($point['timestamp'] ?? ''), 'UTC')->getTimestamp();
            } catch (\Throwable) {
                continue;
            }

            if ($stamp <= $nowEpoch) {
                $past[] = $point;
            } else {
                $future[] = $point;
            }
        }

        return ['past' => $past, 'future' => $future];
    }

    /**
     * Retorna o ponto da lista com o timestamp mais próximo do instante solicitado.
     *
     * @param  array<int, array<string, mixed>>  $points
     * @return array<string, mixed>|null
     */
    private function closestPointTo(array $points, CarbonImmutable $time): ?array
    {
        $closest = null;
        $closestDelta = PHP_INT_MAX;

        foreach ($points as $point) {
            try {
                $delta = abs(CarbonImmutable::parse(
                    (string) ($point['timestamp'] ?? ''), 'UTC'
                )->diffInSeconds($time, false));
            } catch (\Throwable) {
                continue;
            }

            if ($delta < $closestDelta) {
                $closest = $point;
                $closestDelta = $delta;
            }
        }

        return $closest;
    }

    /**
     * Classifica o estado de movimento do objeto em relação à Terra.
     *
     * Ordem de precedência:
     *   1. Está dentro de 30 min da máxima aproximação → 'near_closest'
     *   2. rangeRateKmS disponível → sinal negativo = aproximando, positivo = afastando
     *   3. Comparação de distância com o ponto de máxima aproximação
     *   4. Indefinido → 'unknown'
     *
     * @param  array<string, mixed>|null  $referencePoint
     * @param  array<string, mixed>|null  $closestPoint
     */
    private function motionState(
        CarbonImmutable $currentTime,
        CarbonImmutable $approachTime,
        ?array $referencePoint,
        ?array $closestPoint,
    ): string {
        if ($referencePoint === null) {
            return 'unknown';
        }

        if (abs($currentTime->diffInMinutes($approachTime, false)) <= 30) {
            return 'near_closest';
        }

        $rangeRate = $referencePoint['rangeRateKmS'] ?? null;
        if (is_numeric($rangeRate)) {
            if ((float) $rangeRate < -0.001) {
                return 'approaching';
            }
            if ((float) $rangeRate > 0.001) {
                return 'receding';
            }

            return 'near_closest';
        }

        if ($closestPoint !== null) {
            $currentDistance = $referencePoint['distanceKm'] ?? null;
            $closestDistance = $closestPoint['distanceKm'] ?? null;
            if (is_numeric($currentDistance) && is_numeric($closestDistance)) {
                if ($currentTime->lessThan($approachTime)) {
                    return 'approaching';
                }
                if ((float) $currentDistance > (float) $closestDistance && $currentTime->greaterThan($approachTime)) {
                    return 'receding';
                }
            }
        }

        return 'unknown';
    }

    // =========================================================================
    // Utilitários de cache
    // =========================================================================

    private function successCacheTtl(string $mode): int
    {
        if ($mode === 'current') {
            return self::CURRENT_MODE_SUCCESS_TTL_SECONDS;
        }

        return (int) config('services.jpl.horizons_cache_ttl', 86400);
    }

    private function negativeCacheTtl(): int
    {
        return app()->environment('local')
            ? self::NEGATIVE_TTL_LOCAL_SECONDS
            : self::NEGATIVE_TTL_DEFAULT_SECONDS;
    }

    /**
     * Arredonda o horário para baixo no bucket de minutos especificado,
     * fazendo com que todos os objetos consultados no mesmo intervalo compartilhem a mesma chave de cache.
     */
    private function bucketTime(CarbonImmutable $time, int $bucketMinutes): CarbonImmutable
    {
        $bucketMinutes = max(1, $bucketMinutes);
        $bucketed = floor($time->minute / $bucketMinutes) * $bucketMinutes;

        return $time->setTime((int) $time->hour, (int) $bucketed, 0);
    }

    // =========================================================================
    // Utilitários de parsing
    // =========================================================================

    private function parseTime(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($value, 'UTC');
        } catch (\Throwable) {
            return null;
        }
    }
}
