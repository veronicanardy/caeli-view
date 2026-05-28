<?php

namespace App\Services\Jpl;

use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use App\Support\AsteroidIdentityNormalizer;
use App\Support\DistancePresenter;
use App\Support\HorizonsCommandBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class HorizonsTrajectoryService
{
    private const TRAJECTORY_CACHE_VERSION = 'command-v4';
    private const POSITION_CACHE_VERSION = 'reftime-v3';
    private const NOW_TRAJECTORY_CACHE_VERSION = 'now-traj-v2-elements';
    private const CURRENT_MODE_BUCKET_MINUTES = 15;
    private const NOW_TRAJECTORY_BUCKET_MINUTES = 30;
    private const CURRENT_MODE_SUCCESS_TTL_SECONDS = 900;            // 15 min
    private const NOW_TRAJECTORY_SUCCESS_TTL_SECONDS = 1800;         // 30 min
    private const NEGATIVE_TTL_LOCAL_SECONDS = 120;                  // 2 min in local
    private const NEGATIVE_TTL_DEFAULT_SECONDS = 600;                // 10 min elsewhere

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
        $points = $fetch['points'];

        if ($points === null || count($points) === 0) {
            $reason = $fetch['failureReason'] ?? 'no_ephemeris';
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
            'timeout' => 'Tempo esgotado ao consultar a JPL Horizons. Representação simbólica baseada na distância.',
            'http_error' => 'Falha de comunicação com a JPL Horizons nesta tentativa. Representação simbólica baseada na distância.',
            'rate_limit' => 'Limite de requisições da JPL Horizons atingido. Representação simbólica baseada na distância.',
            'invalid_target', 'no_command_candidates' => 'Sem identificador Horizons válido para este objeto. Representação simbólica baseada na distância.',
            default => $mode === 'current'
                ? 'Sem efemérides Horizons disponíveis nesta tentativa para o horário atual. Representação simbólica baseada na distância.'
                : 'Sem efemérides Horizons disponíveis nesta tentativa para o instante da máxima aproximação. Representação simbólica baseada na distância.',
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
        $points = $fetch['points'];

        $approachTime = $this->parseTime($object['approachTime'] ?? null);

        if ($points === null || count($points) < 2) {
            $reason = $fetch['failureReason'] ?? 'no_ephemeris';
            $this->logFailure($objectId, 'now_trajectory', $reason);
            $result = $this->unavailableTrajectory(
                $object,
                'Trajetória indisponível para este objeto no momento.',
                $objectId,
                $approachTime,
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
            'orbitalElements' => $fetch['elements'] ?? null,
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

        $points = $this->fetchVectorsForObject(
            $object,
            $windowStart->format('Y-M-d H:i'),
            $windowEnd->format('Y-M-d H:i'),
            '1 hours',
        );

        if ($points === null || count($points) < 3) {
            return $this->unavailableTrajectory($object, 'Trajetória atual indisponível para este objeto; exibindo apenas a aproximação registrada.', $objectId, $approachTime);
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
     * Tries each command candidate sequentially until one returns ephemerides.
     * Returns null if every candidate failed.
     *
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchVectorsForObject(array $object, string $startTime, string $stopTime, string $stepSize): ?array
    {
        return $this->fetchVectorsWithDiagnostics($object, $startTime, $stopTime, $stepSize)['points'];
    }

    /**
     * Same as fetchVectorsForObject, but also returns a failure reason when no points are produced,
     * plus the osculating orbital elements parsed from the response header (free — Horizons always
     * prints them in the VECTORS header, no extra request needed).
     *
     * @return array{points: array<int, array<string, mixed>>|null, failureReason: string|null, elements: array<string, float>|null}
     */
    private function fetchVectorsWithDiagnostics(array $object, string $startTime, string $stopTime, string $stepSize): array
    {
        $identity = AsteroidIdentityNormalizer::normalize((string) ($object['rawName'] ?? $object['name'] ?? ''));
        $commands = $this->commandCandidates($object, $identity);

        if ($commands === []) {
            return ['points' => null, 'failureReason' => 'no_command_candidates', 'elements' => null];
        }

        $lastFailureReason = null;

        foreach ($commands as $command) {
            try {
                $content = $this->get($this->vectorQuery(
                    $command,
                    $startTime,
                    $stopTime,
                    $stepSize,
                    'NO',
                ));

                if (! $this->hasEphemeris($content)) {
                    $lastFailureReason = 'no_ephemeris';
                    continue;
                }

                $points = $this->parseVectorPoints($content);
                if (count($points) >= 1) {
                    return ['points' => $points, 'failureReason' => null, 'elements' => $this->parseOrbitalElements($content)];
                }
                $lastFailureReason = 'parse_error';
            } catch (JplRateLimitException $exception) {
                Log::info('Horizons candidate hit rate limit.', ['command' => $command]);
                $lastFailureReason = 'rate_limit';
            } catch (JplUnavailableException $exception) {
                Log::info('Horizons candidate unavailable.', ['command' => $command]);
                $lastFailureReason = 'timeout';
            } catch (JplApiException $exception) {
                Log::info('Horizons candidate failed.', ['command' => $command, 'message' => $exception->getMessage()]);
                $lastFailureReason = 'http_error';
            }
        }

        return ['points' => null, 'failureReason' => $lastFailureReason ?? 'no_ephemeris', 'elements' => null];
    }

    /**
     * Parses the osculating orbital elements Horizons prints in the VECTORS header. These let the
     * frontend reconstruct the object's full heliocentric ellipse without any extra API call.
     *
     * Header looks like:
     *   EPOCH=  2461184.5 ! ...
     *    EC= .503...   QR= .993...   TP= 2461206.39...
     *    OM= 66.10...   W=  202.08...  IN= 2.529...
     *
     * @return array<string, float>|null  keys: ec, qrAu, tpJd, omDeg, wDeg, inDeg, epochJd
     */
    private function parseOrbitalElements(string $content): ?array
    {
        $grab = static function (string $name) use ($content): ?float {
            // Match "NAME= value" allowing leading-dot decimals and scientific notation.
            if (preg_match('/\b'.preg_quote($name, '/').'=\s*([-+]?\.?\d[\d.eE+-]*)/', $content, $m) === 1) {
                return is_numeric($m[1]) ? (float) $m[1] : null;
            }
            return null;
        };

        $ec = $grab('EC');
        $qr = $grab('QR');
        $in = $grab('IN');
        $om = $grab('OM');
        $w = $grab('W');
        $tp = $grab('TP');
        $epoch = $grab('EPOCH');

        // Require the shape-defining elements; the rest can default to 0 if absent.
        if ($ec === null || $qr === null || $in === null) {
            return null;
        }

        return [
            'ec' => $ec,
            'qrAu' => $qr,
            'inDeg' => $in,
            'omDeg' => $om ?? 0.0,
            'wDeg' => $w ?? 0.0,
            'tpJd' => $tp ?? 0.0,
            'epochJd' => $epoch ?? 0.0,
        ];
    }

    private function get(array $query): string
    {
        $path = '/horizons.api';

        try {
            $response = Http::baseUrl((string) config('services.jpl.horizons_base_url', 'https://ssd.jpl.nasa.gov/api'))
                ->timeout((int) config('services.jpl.timeout', 10))
                ->retry(
                    (int) config('services.jpl.retry_times', 2),
                    (int) config('services.jpl.retry_sleep_ms', 300),
                    throw: false,
                )
                ->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('JPL Horizons API connection failed.', ['path' => $path]);
            throw new JplUnavailableException();
        }

        return $this->decode($response, $path);
    }

    private function decode(Response $response, string $path): string
    {
        if ($response->status() === 429) {
            Log::notice('JPL Horizons API rate limit reached.', ['path' => $path]);
            throw new JplRateLimitException();
        }

        if ($response->serverError()) {
            Log::warning('JPL Horizons API server error.', ['path' => $path, 'status' => $response->status()]);
            throw new JplUnavailableException();
        }

        if ($response->failed()) {
            Log::warning('JPL Horizons API request failed.', ['path' => $path, 'status' => $response->status()]);
            throw new JplApiException();
        }

        return $response->body();
    }

    private function hasEphemeris(string $content): bool
    {
        return str_contains($content, '$$SOE') && str_contains($content, '$$EOE');
    }

    private function vectorQuery(string $command, string $startTime, string $stopTime, string $stepSize, string $objectData): array
    {
        return [
            'format' => 'text',
            'COMMAND' => $this->horizonsValue($command),
            'OBJ_DATA' => $this->horizonsValue($objectData),
            'MAKE_EPHEM' => $this->horizonsValue('YES'),
            'EPHEM_TYPE' => $this->horizonsValue('VECTORS'),
            'CENTER' => $this->horizonsValue('500@399'),
            'START_TIME' => $this->horizonsValue($startTime),
            'STOP_TIME' => $this->horizonsValue($stopTime),
            'STEP_SIZE' => $this->horizonsValue($stepSize),
            'VEC_TABLE' => $this->horizonsValue('3'),
            'CSV_FORMAT' => $this->horizonsValue('YES'),
            'VEC_LABELS' => $this->horizonsValue('NO'),
            'REF_PLANE' => $this->horizonsValue('ECLIPTIC'),
            'OUT_UNITS' => $this->horizonsValue('KM-S'),
        ];
    }

    private function parseVectorPoints(string $result): array
    {
        if (! str_contains($result, '$$SOE') || ! str_contains($result, '$$EOE')) {
            return [];
        }

        $table = trim(str($result)->between('$$SOE', '$$EOE')->toString());
        $points = [];

        foreach (preg_split('/\R/', $table) ?: [] as $line) {
            $columns = array_map('trim', str_getcsv(trim($line)));
            if (count($columns) < 5) {
                continue;
            }

            $x = $this->floatOrNull($columns[2] ?? null);
            $y = $this->floatOrNull($columns[3] ?? null);
            $z = $this->floatOrNull($columns[4] ?? null);
            $vx = $this->floatOrNull($columns[5] ?? null);
            $vy = $this->floatOrNull($columns[6] ?? null);
            $vz = $this->floatOrNull($columns[7] ?? null);
            $rangeKm = $this->floatOrNull($columns[9] ?? null);
            $rangeRateKmS = $this->floatOrNull($columns[10] ?? null);
            if ($x === null || $y === null || $z === null) {
                continue;
            }

            $distanceKm = $rangeKm ?? sqrt($x ** 2 + $y ** 2 + $z ** 2);
            $points[] = [
                'timestamp' => $this->normalizeTimestamp($columns[1] ?? $columns[0] ?? null),
                'x' => $x,
                'y' => $y,
                'z' => $z,
                'vx' => $vx,
                'vy' => $vy,
                'vz' => $vz,
                'rangeKm' => $rangeKm,
                'rangeRateKmS' => $rangeRateKmS,
                'distanceKm' => $distanceKm,
                'distanceLunar' => $distanceKm / DistancePresenter::LUNAR_DISTANCE_KM,
            ];
        }

        return $points;
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

    private function horizonsValue(string $value): string
    {
        return "'".str_replace("'", '', $value)."'";
    }

    private function trustedSpkId(mixed $value): ?string
    {
        $spkId = trim((string) $value);

        return preg_match('/^\d{4,}$/', $spkId) === 1 ? $spkId : null;
    }

    private function unavailableTrajectory(array $object, string $note, ?string $objectId = null, ?CarbonImmutable $approachTime = null): array
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

    private function normalizeTimestamp(?string $value): string
    {
        $clean = trim((string) $value);
        $clean = preg_replace('/^A\.D\.\s*/', '', $clean) ?? $clean;

        try {
            return CarbonImmutable::parse($clean, 'UTC')->toIso8601String();
        } catch (\Throwable) {
            return $clean;
        }
    }

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
