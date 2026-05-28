<?php

namespace App\Services\Nasa;

use App\Exceptions\NasaApiException;
use App\Exceptions\NasaRateLimitException;
use App\Exceptions\NasaUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class NasaHttpClient
{
    public function get(string $path, array $query = []): array
    {
        $apiKey = config('services.nasa.api_key');

        if (blank($apiKey)) {
            throw new NasaApiException('NASA API key is not configured.', 500, 'Configure a NASA_API_KEY no arquivo .env para consultar dados reais da NASA.');
        }

        try {
            $retryTimes = (int) config('services.nasa.retry_times', 2);
            $retrySleepMs = (int) config('services.nasa.retry_sleep_ms', 250);

            $response = Http::baseUrl(config('services.nasa.base_url'))
                ->acceptJson()
                ->timeout((int) config('services.nasa.timeout', 8))
                ->retry($retryTimes, $retrySleepMs, throw: false)
                ->get($path, array_merge($query, ['api_key' => $apiKey]));
        } catch (ConnectionException) {
            Log::warning('NASA API connection failed.', ['path' => $path]);
            throw new NasaUnavailableException();
        }

        return $this->decode($response, $path);
    }

    private function decode(Response $response, string $path): array
    {
        if ($response->status() === 429) {
            Log::notice('NASA API rate limit reached.', ['path' => $path]);
            throw new NasaRateLimitException();
        }

        if ($response->serverError()) {
            Log::warning('NASA API server error.', ['path' => $path, 'status' => $response->status()]);
            throw new NasaUnavailableException();
        }

        if ($response->failed()) {
            Log::warning('NASA API request failed.', ['path' => $path, 'status' => $response->status()]);
            throw new NasaApiException();
        }

        $json = $response->json();

        if (! is_array($json)) {
            Log::warning('NASA API returned invalid JSON.', ['path' => $path, 'status' => $response->status()]);
            throw new NasaApiException('NASA API invalid JSON.');
        }

        return $json;
    }
}
