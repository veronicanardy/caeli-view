<?php

namespace App\Services\Jpl;

use App\DTOs\Jpl\Horizons\HorizonsVectorFetchResultData;
use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use App\Support\AsteroidIdentityNormalizer;
use App\Support\DistancePresenter;
use App\Support\HorizonsCommandBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Sleep;

final class HorizonsTrajectoryService
{
    private const TRAJECTORY_CACHE_VERSION = 'command-v4';
    private const POSITION_CACHE_VERSION = 'reftime-v3';
    private const NOW_TRAJECTORY_CACHE_VERSION = 'now-traj-v2-elements';

    /** Backoff delays (ms) between Horizons retry attempts after a transient failure. */
    private const TRANSIENT_RETRY_DELAYS_MS = [800, 2000];
    private const CURRENT_MODE_BUCKET_MINUTES = 15;
    private const NOW_TRAJECTORY_BUCKET_MINUTES = 30;
    private const CURRENT_MODE_SUCCESS_TTL_SECONDS = 900;            // 15 min
    private const NOW_TRAJECTORY_SUCCESS_TTL_SECONDS = 1800;         // 30 min
    private const NEGATIVE_TTL_LOCAL_SECONDS = 120;                  // 2 min in local
    private const NEGATIVE_TTL_DEFAULT_SECONDS = 600;                // 10 min elsewhere

    public function __construct(
        private readonly HorizonsClient $client,
        private readonly HorizonsTextParser $parser,
        private readonly SmallBodyService $smallBodies,
    ) {
    }

    /**
     * Trajectory of one focused object, with a window of ±2 days around the closest approach.
     */
    public function trajectory(array $object): array
    {
        $approachTime = $this->parseTime($object['approachTime'] ?? null);
        if ($approachTime === null) {
            return $this->unavailableTrajectory($object, 'Trajetória atual indisponível para este objeto; exibindo apenas a aproximação registrada.');
        }

        $objectId = $this->objectId($object);
        $key = 'horizons_trajectory_'.md5($objectId.'|'.$approachTime->toIso8601String().'|earth|72h|1h|'.self::TRAJECTORY_CACHE_VERSION);
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
     * Position of each approach at a chosen reference time.
     *
     * - 'current' uses a shared reference time (typically now()) for every object,
     *   rounded down to a 15-minute bucket for cache friendliness.
     * - 'closest_approach' uses each object's own closest-approach time.
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
            $id = (string) ($approach['id'] ?? $this->objectId($approach));
            $results[$id] = $this->positionAtReferenceTime($approach, $mode, $sharedReferenceTime);
        }

        return $results;
    }

    /**
     * Position of a single object at a reference time, decided by mode.
     */
    private function positionAtReferenceTime(array $object, string $mode, ?CarbonImmutable $sharedReferenceTime): array
    {
        $id = (string) ($object['id'] ?? $this->objectId($object));
        $approachTime = $this->parseTime($object['approachTime'] ?? null);

        $referenceTime = $mode === 'current'
            ? $sharedReferenceTime
            : $approachTime;

        if ($referenceTime === null) {
            $reason = $mode === 'current'
                ? 'Horário de referência indisponível para projeção Horizons.'
                : 'Horário de aproximação indisponível para projeção Horizons.';
            return $this->symbolicPositionResult($id, $object, $reason, 'no_reference_time', $approachTime);
        }

        $objectId = $this->objectId($object);
        $cacheKeyParts = [
            $objectId,
            $mode,
            $referenceTime->toIso8601String(),
            self::POSITION_CACHE_VERSION,
        ];
        $key = 'horizons_reftime_pos_'.md5(implode('|', $cacheKeyParts));

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        // Narrow window centered on the reference time. ±15min/3min step keeps quota usage low.
        $windowStart = $referenceTime->subMinutes(15);
        $windowEnd = $referenceTime->addMinutes(15);

        $fetch = $this->fetchVectorsWithDiagnostics(
            $object,
            $windowStart->format('Y-M-d H:i'),
            $windowEnd->format('Y-M-d H:i'),
            '3 minutes',
        );
        $points = $fetch->pointsToArray();

        if ($points === null || count($points) === 0) {
            $reason = $fetch->failureReason ?? 'no_ephemeris';
            $note = $this->noteForFailure($reason, $mode);
            $this->logFailure($objectId, $mode, $reason);

            $result = $this->symbolicPositionResult($id, $object, $note, $reason, $approachTime);
            Cache::put($key, $result, $this->negativeCacheTtl());

            return $result;
        }

        $chosen = $this->closestPointTo($points, $referenceTime);
        if ($chosen === null) {
            $this->logFailure($objectId, $mode, 'no_point_near_reference');
            $result = $this->symbolicPositionResult(
                $id,
                $object,
                'Sem ponto Horizons próximo do horário de referência. Representação simbólica baseada na distância.',
                'no_point_near_reference',
                $approachTime,
            );
            Cache::put($key, $result, $this->negativeCacheTtl());

            return $result;
        }

        $closestApproachDistanceKm = $mode === 'current'
            ? $this->floatOrNull($chosen['distanceKm'] ?? null)
            : $this->approachDistanceKm($object);
        $closestApproachDistanceLd = $closestApproachDistanceKm !== null
            ? $closestApproachDistanceKm / DistancePresenter::LUNAR_DISTANCE_KM
            : null;

        $result = [
            'id' => $id,
            'status' => 'available',
            'positionKind' => 'horizons_current',
            'x' => $this->floatOrNull($chosen['x'] ?? null),
            'y' => $this->floatOrNull($chosen['y'] ?? null),
            'z' => $this->floatOrNull($chosen['z'] ?? null),
            'vx' => $this->floatOrNull($chosen['vx'] ?? null),
            'vy' => $this->floatOrNull($chosen['vy'] ?? null),
            'vz' => $this->floatOrNull($chosen['vz'] ?? null),
            'currentPositionTime' => (string) ($chosen['timestamp'] ?? $referenceTime->toIso8601String()),
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'closestApproachDistanceKm' => $closestApproachDistanceKm,
            'closestApproachDistanceLD' => $closestApproachDistanceLd,
            'distanceSource' => $mode === 'current' && $closestApproachDistanceKm !== null
                ? 'JPL Horizons'
                : $this->distanceSourceFor($object, $closestApproachDistanceKm),
            'positionSource' => 'JPL Horizons',
            'failureReason' => null,
            'note' => null,
        ];

        Cache::put($key, $result, $this->successCacheTtl($mode));

        return $result;
    }

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

    private function noteForFailure(string $reason, string $mode): string
    {
        return match ($reason) {
            'timeout', 'http_error', 'rate_limit' => 'Horizons temporariamente indisponível para este objeto. Representação simbólica baseada na distância.',
            'invalid_target', 'no_command_candidates' => 'Sem identificador Horizons válido para este objeto. Representação simbólica baseada na distância.',
            'no_ephemeris' => 'Objeto sem efemérides publicadas no Horizons neste momento. Pode ser muito recente. Representação simbólica baseada na distância.',
            default => $mode === 'current'
                ? 'Sem efemérides Horizons disponíveis para o horário atual. Representação simbólica baseada na distância.'
                : 'Sem efemérides Horizons disponíveis para o instante da máxima aproximação. Representação simbólica baseada na distância.',
        };
    }

    /**
     * Maps the low-level failure reason to a UI-facing kind string the frontend uses
     * to select the right status label (rather than parsing note text).
     */
    private function failureKind(string $reason): string
    {
        return match ($reason) {
            'timeout', 'http_error', 'rate_limit' => 'horizons_transient',
            'no_ephemeris' => 'no_ephemeris',
            'invalid_target', 'no_command_candidates' => 'no_orbital_data',
            default => 'symbolic',
        };
    }

    private function logFailure(string $objectId, string $mode, string $reason): void
    {
        Log::info('[Horizons positions] fallback to symbolic', [
            'objectId' => $objectId,
            'mode' => $mode,
            'reason' => $reason,
        ]);
    }

    private function bucketTime(CarbonImmutable $time, int $bucketMinutes): CarbonImmutable
    {
        $bucketMinutes = max(1, $bucketMinutes);
        $bucketed = floor($time->minute / $bucketMinutes) * $bucketMinutes;

        return $time->setTime((int) $time->hour, (int) $bucketed, 0);
    }

    /**
     * Trajectory anchored to the current instant (UTC), segmented into past/current/future.
     *
     * Used by the "5 closest now" radar view: we want to see where each object is RIGHT NOW
     * and the curve it traces in the surrounding hours, derived from real ephemerides.
     *
     * @param  array<string, mixed>  $object
     * @param  array{startOffsetHours: int, stopOffsetHours: int, stepSize: string}  $window
     *         e.g. ['startOffsetHours' => -24, 'stopOffsetHours' => 72, 'stepSize' => '1 hours']
     */
    public function trajectoryAroundNow(array $object, array $window): array
    {
        $startOffset = (int) ($window['startOffsetHours'] ?? -24);
        $stopOffset = (int) ($window['stopOffsetHours'] ?? 72);
        $stepSize = (string) ($window['stepSize'] ?? '1 hours');

        $now = $this->bucketTime(CarbonImmutable::now('UTC'), self::NOW_TRAJECTORY_BUCKET_MINUTES);
        $objectId = $this->objectId($object);

        $cacheKeyParts = [
            $objectId,
            $now->toIso8601String(),
            (string) $startOffset,
            (string) $stopOffset,
            $stepSize,
            self::NOW_TRAJECTORY_CACHE_VERSION,
        ];
        $key = 'horizons_now_traj_'.md5(implode('|', $cacheKeyParts));

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        $windowStart = $startOffset >= 0
            ? $now->addHours($startOffset)
            : $now->subHours(abs($startOffset));
        $windowEnd = $stopOffset >= 0
            ? $now->addHours($stopOffset)
            : $now->subHours(abs($stopOffset));

        $fetch = $this->fetchVectorsWithDiagnostics(
            $object,
            $windowStart->format('Y-M-d H:i'),
            $windowEnd->format('Y-M-d H:i'),
            $stepSize,
        );
        $points = $fetch->pointsToArray();

        $approachTime = $this->parseTime($object['approachTime'] ?? null);

        if ($points === null || count($points) < 2) {
            $reason = $fetch->failureReason ?? 'no_ephemeris';
            $this->logFailure($objectId, 'now_trajectory', $reason);
            $result = $this->unavailableTrajectory(
                $object,
                'Trajetória indisponível para este objeto no momento.',
                $objectId,
                $approachTime,
                $reason,
            );
            Cache::put($key, $result, $this->negativeCacheTtl());

            return $result;
        }

        $currentPoint = $this->closestPointTo($points, $now);
        $segmented = $this->segmentPointsAroundNow($points, $now);

        $currentDistanceKm = $this->floatOrNull($currentPoint['distanceKm'] ?? null);
        $currentDistanceLd = $currentDistanceKm !== null
            ? $currentDistanceKm / DistancePresenter::LUNAR_DISTANCE_KM
            : null;

        $result = [
            'objectId' => $objectId,
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? $objectId),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '2D simplified',
            'anchor' => 'now',
            'anchorTime' => $now->toIso8601String(),
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'points' => $points,
            'pastPoints' => $segmented['past'],
            'futurePoints' => $segmented['future'],
            'currentPoint' => $currentPoint,
            'currentDistanceKm' => $currentDistanceKm,
            'currentDistanceLD' => $currentDistanceLd,
            'referencePoint' => $currentPoint,
            'motionState' => $this->motionState(
                $now,
                $approachTime ?? $now,
                $currentPoint,
                $approachTime !== null ? $this->closestPointTo($points, $approachTime) : null,
            ),
            // Osculating heliocentric orbital elements (from the Horizons header) so the frontend
            // can draw the object's full orbit around the Sun. Null when unavailable.
            'orbitalElements' => $fetch->elementsToArray(),
            'status' => 'available',
            'note' => 'Trajetória baseada em vetores JPL/Horizons.',
        ];

        Cache::put($key, $result, self::NOW_TRAJECTORY_SUCCESS_TTL_SECONDS);

        return $result;
    }

    /**
     * Splits the point list at `now` into past (timestamp ≤ now) and future (timestamp > now)
     * segments. Both lists stay chronologically ordered so renderers can draw polylines directly.
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
     * Builds the full ±2 day trajectory result. Extracted so it can be cached as a whole.
     */
    private function buildTrajectoryResult(array $object, string $objectId, CarbonImmutable $approachTime): array
    {
        $now = CarbonImmutable::now('UTC');
        $windowStart = $approachTime->subDays(2);
        $windowEnd = $approachTime->addDays(2);

        if ($now->lessThan($windowStart)) {
            $windowStart = $now->subHours(6);
        }
        if ($now->greaterThan($windowEnd)) {
            $windowEnd = $now->addHours(6);
        }

        $fetch = $this->fetchVectorsWithDiagnostics(
            $object,
            $windowStart->format('Y-M-d H:i'),
            $windowEnd->format('Y-M-d H:i'),
            '1 hours',
        );
        $points = $fetch->pointsToArray();

        if ($points === null || count($points) < 3) {
            $reason = $fetch->failureReason ?? 'no_ephemeris';
            return $this->unavailableTrajectory($object, 'Trajetória atual indisponível para este objeto; exibindo apenas a aproximação registrada.', $objectId, $approachTime, $reason);
        }

        $referencePoint = $this->closestPointTo($points, $now);
        $closestPoint = $this->closestPointTo($points, $approachTime);

        return [
            'objectId' => $objectId,
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? $objectId),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '2D simplified',
            'closestApproachTime' => $approachTime->toIso8601String(),
            'points' => $points,
            'referencePoint' => $referencePoint,
            'motionState' => $this->motionState($now, $approachTime, $referencePoint, $closestPoint),
            'status' => 'available',
            'note' => 'Trajetória baseada em efemérides JPL Horizons e projetada em 2D para visualização.',
        ];
    }

    /**
     * Same as fetchVectorsForObject, but also returns a failure reason when no points are produced,
     * plus the osculating orbital elements parsed from the response header.
     *
     * Pipeline for transient failures (503/timeout):
     *   1. Try each command candidate once.
     *   2. If all failed transiently, retry each with backoff (TRANSIENT_RETRY_DELAYS_MS).
     *   3. If still failing, look up the SPKID via SBDB and add it as an additional candidate.
     *   4. Try the SPKID candidate.
     *   5. Only then fall back to symbolic.
     */
    private function fetchVectorsWithDiagnostics(array $object, string $startTime, string $stopTime, string $stepSize): HorizonsVectorFetchResultData
    {
        $identity = AsteroidIdentityNormalizer::normalize((string) ($object['rawName'] ?? $object['name'] ?? ''));
        $commands = $this->commandCandidates($object, $identity);

        if ($commands === []) {
            return HorizonsVectorFetchResultData::unavailable('no_command_candidates');
        }

        // Phase 1: first pass through all candidates.
        $lastFailureReason = null;
        $hadTransientFailure = false;

        $result = $this->tryCommands($commands, $startTime, $stopTime, $stepSize, $lastFailureReason, $hadTransientFailure);
        if ($result !== null) {
            return $result;
        }

        // Phase 2: if every failure was transient (503/timeout), retry with backoff before giving up.
        if ($hadTransientFailure) {
            foreach (self::TRANSIENT_RETRY_DELAYS_MS as $delayMs) {
                Sleep::usleep($delayMs * 1000);
                $result = $this->tryCommands($commands, $startTime, $stopTime, $stepSize, $lastFailureReason, $hadTransientFailure);
                if ($result !== null) {
                    Log::info('Horizons succeeded after transient retry.', ['commands' => $commands, 'delay_ms' => $delayMs]);
                    return $result;
                }
            }

            // Phase 3: fetch SPKID from SBDB and add as an additional candidate.
            $designation = $this->designationFor($object, $identity);
            if ($designation !== null) {
                $spkId = $this->smallBodies->spkIdFor($designation);
                if ($spkId !== null && ! in_array($spkId, $commands, true) && ! in_array($spkId.';', $commands, true)) {
                    Log::info('Horizons fallback: trying SBDB SPKID after transient failure.', ['designation' => $designation, 'spkId' => $spkId]);
                    $result = $this->tryCommands([$spkId], $startTime, $stopTime, $stepSize, $lastFailureReason, $hadTransientFailure);
                    if ($result !== null) {
                        Log::info('Horizons succeeded via SBDB SPKID.', ['spkId' => $spkId]);
                        return $result;
                    }
                }
            }
        }

        return HorizonsVectorFetchResultData::unavailable($lastFailureReason ?? 'no_ephemeris');
    }

    /**
     * Attempts each command once using a single-shot HTTP call (no internal retry).
     * Updates $lastFailureReason and $hadTransientFailure by reference.
     * Returns a successful result or null.
     *
     * @param  array<int, string>  $commands
     */
    private function tryCommands(array $commands, string $startTime, string $stopTime, string $stepSize, ?string &$lastFailureReason, bool &$hadTransientFailure): ?HorizonsVectorFetchResultData
    {
        foreach ($commands as $command) {
            try {
                $content = $this->client->vectorsOnce($command, $startTime, $stopTime, $stepSize, 'NO');

                if (! $this->parser->hasEphemeris($content)) {
                    $lastFailureReason = 'no_ephemeris';
                    continue;
                }

                $points = $this->parser->parseVectorPoints($content);
                if (count($points) >= 1) {
                    return HorizonsVectorFetchResultData::available($points, $this->parser->parseOrbitalElements($content));
                }
                $lastFailureReason = 'parse_error';
            } catch (JplRateLimitException) {
                Log::info('Horizons candidate hit rate limit.', ['command' => $command]);
                $lastFailureReason = 'rate_limit';
                $hadTransientFailure = true;
            } catch (JplUnavailableException) {
                Log::info('Horizons candidate unavailable.', ['command' => $command]);
                $lastFailureReason = 'timeout';
                $hadTransientFailure = true;
            } catch (JplApiException $e) {
                Log::info('Horizons candidate failed.', ['command' => $command, 'message' => $e->getMessage()]);
                $lastFailureReason = 'http_error';
                $hadTransientFailure = true;
            }
        }

        return null;
    }

    private function designationFor(array $object, array $identity): ?string
    {
        $provisional = $identity['provisionalDesignation'] ?? null;
        if ($provisional !== null) {
            return $provisional;
        }
        $des = trim((string) ($object['designation'] ?? $object['detailIdentifier'] ?? ''));
        return $des !== '' ? $des : null;
    }

    private function commandCandidates(array $object, array $identity): array
    {
        return HorizonsCommandBuilder::build(
            $identity,
            $this->trustedSpkId($object['spkId'] ?? null),
            (string) ($object['detailIdentifier'] ?? ''),
            (string) ($object['designation'] ?? ''),
        );
    }

    private function trustedSpkId(mixed $value): ?string
    {
        $spkId = trim((string) $value);

        return preg_match('/^\d{4,}$/', $spkId) === 1 ? $spkId : null;
    }

    private function unavailableTrajectory(array $object, string $note, ?string $objectId = null, ?CarbonImmutable $approachTime = null, string $failureReason = 'no_ephemeris'): array
    {
        return [
            'objectId' => $objectId ?? $this->objectId($object),
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? 'Objeto monitorado'),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '2D simplified',
            'closestApproachTime' => $approachTime?->toIso8601String() ?? (string) ($object['approachTime'] ?? ''),
            'points' => [],
            'referencePoint' => null,
            'motionState' => 'unknown',
            'status' => 'unavailable',
            'horizonsFailureKind' => $this->failureKind($failureReason),
            'note' => $note,
        ];
    }

    private function symbolicPositionResult(string $id, array $object, string $note, string $failureReason, ?CarbonImmutable $approachTime = null): array
    {
        $approachTime ??= $this->parseTime($object['approachTime'] ?? null);
        $distanceKm = $this->approachDistanceKm($object);
        $distanceLd = $distanceKm !== null ? $distanceKm / DistancePresenter::LUNAR_DISTANCE_KM : null;

        return [
            'id' => $id,
            'status' => 'unavailable',
            'positionKind' => 'symbolic_distance_only',
            'x' => null,
            'y' => null,
            'z' => null,
            'vx' => null,
            'vy' => null,
            'vz' => null,
            'currentPositionTime' => null,
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'closestApproachDistanceKm' => $distanceKm,
            'closestApproachDistanceLD' => $distanceLd,
            'distanceSource' => $this->distanceSourceFor($object, $distanceKm),
            'positionSource' => 'unavailable',
            'failureReason' => $failureReason,
            'horizonsFailureKind' => $this->failureKind($failureReason),
            'note' => $note,
        ];
    }

    private function approachDistanceKm(array $object): ?float
    {
        $value = $object['nominalDistanceKm'] ?? $object['distanceKm'] ?? null;

        return is_numeric($value) ? (float) $value : null;
    }

    private function distanceSourceFor(array $object, ?float $distanceKm): string
    {
        if ($distanceKm === null) {
            return 'fallback';
        }

        $sourceLabel = strtolower((string) ($object['source'] ?? $object['sourceLabel'] ?? ''));

        if (str_contains($sourceLabel, 'cad')) {
            return 'CAD';
        }
        if (str_contains($sourceLabel, 'neows') || str_contains($sourceLabel, 'neo')) {
            return 'NeoWs';
        }

        return 'fallback';
    }

    private function objectId(array $object): string
    {
        return (string) ($object['id'] ?? $object['spkId'] ?? $object['detailIdentifier'] ?? $object['designation'] ?? md5(json_encode($object)));
    }

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

    private function closestPointTo(array $points, CarbonImmutable $time): ?array
    {
        $closest = null;
        $closestDelta = PHP_INT_MAX;

        foreach ($points as $point) {
            try {
                $delta = abs(CarbonImmutable::parse((string) ($point['timestamp'] ?? ''), 'UTC')->diffInSeconds($time, false));
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

    private function motionState(CarbonImmutable $currentTime, CarbonImmutable $approachTime, ?array $referencePoint, ?array $closestPoint): string
    {
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

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
