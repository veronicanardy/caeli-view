<?php

namespace App\Services\Nasa;

use App\DTOs\Nasa\Apod\ApodData;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

final class ApodService
{
    public function __construct(private readonly NasaHttpClient $client)
    {
    }

    public function byDate(string $date): array
    {
        $key = sprintf('nasa:apod:%s', $date);

        return Cache::remember($key, (int) config('services.nasa.apod_cache_ttl', 86400), function () use ($date) {
            $response = $this->client->get('/planetary/apod', [
                'date' => $date,
                'thumbs' => true,
            ]);

            return ApodData::fromArray($response)->toArray();
        });
    }

    public function today(): array
    {
        return $this->byDate(CarbonImmutable::today()->toDateString());
    }

    public function defaultDate(): string
    {
        return CarbonImmutable::today()->toDateString();
    }
}
