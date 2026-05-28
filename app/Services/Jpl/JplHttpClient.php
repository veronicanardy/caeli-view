<?php

namespace App\Services\Jpl;

use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class JplHttpClient
{
    public function get(string $path, array $query = []): array
    {
        try {
            $retryTimes = (int) config('services.jpl.retry_times', 2);
            $retrySleepMs = (int) config('services.jpl.retry_sleep_ms', 300);

            $response = Http::baseUrl(config('services.jpl.base_url'))
                ->acceptJson()
                ->timeout((int) config('services.jpl.timeout', 10))
                ->retry($retryTimes, $retrySleepMs, throw: false)
                ->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('JPL API connection failed.', ['path' => $path]);
            throw new JplUnavailableException();
        }

        return $this->decode($response, $path);
    }

    private function decode(Response $response, string $path): array
    {
        if ($response->status() === 429) {
            Log::notice('JPL API rate limit reached.', ['path' => $path]);
            throw new JplRateLimitException();
        }

        if ($response->serverError()) {
            Log::warning('JPL API server error.', ['path' => $path, 'status' => $response->status()]);
            throw new JplUnavailableException();
        }

        if ($response->failed()) {
            Log::warning('JPL API request failed.', ['path' => $path, 'status' => $response->status()]);
            throw new JplApiException();
        }

        $json = $response->json();

        if (! is_array($json)) {
            Log::warning('JPL API returned invalid JSON.', ['path' => $path, 'status' => $response->status()]);
            throw new JplApiException('JPL API invalid JSON.');
        }

        return $json;
    }
}
