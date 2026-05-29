<?php

namespace App\Services\Jpl;

use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class HorizonsClient
{
    public function vectors(string $command, string $startTime, string $stopTime, string $stepSize, string $objectData = 'NO'): string
    {
        return $this->get($this->vectorQuery($command, $startTime, $stopTime, $stepSize, $objectData));
    }

    /**
     * Single attempt with no internal retry — lets callers implement their own backoff.
     */
    public function vectorsOnce(string $command, string $startTime, string $stopTime, string $stepSize, string $objectData = 'NO'): string
    {
        return $this->getSingleAttempt($this->vectorQuery($command, $startTime, $stopTime, $stepSize, $objectData));
    }

    /**
     * @param  array<string, string>  $query
     */
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

    /**
     * @param  array<string, string>  $query
     */
    private function getSingleAttempt(array $query): string
    {
        $path = '/horizons.api';

        try {
            $response = Http::baseUrl((string) config('services.jpl.horizons_base_url', 'https://ssd.jpl.nasa.gov/api'))
                ->timeout((int) config('services.jpl.timeout', 10))
                ->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('JPL Horizons API connection failed (single attempt).', ['path' => $path]);
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

    /**
     * @return array<string, string>
     */
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

    private function horizonsValue(string $value): string
    {
        return "'".str_replace("'", '', $value)."'";
    }
}
