<?php

namespace App\Services\Nasa;

use App\DTOs\Nasa\Epic\EpicImageData;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class EpicService
{
    private const HOME_COLLECTION = 'natural';

    public function __construct(private readonly NasaHttpClient $client)
    {
    }

    public function imagesByDate(string $date): array
    {
        $collection = self::HOME_COLLECTION;
        $key = sprintf('nasa:epic:%s:%s', $collection, $date);
        $ttl = (int) config('services.nasa.epic_cache_ttl', 86400);

        // Serve dado vencido imediatamente enquanto revalida em background
        return Cache::flexible($key, [$ttl, $ttl + 3600], function () use ($collection, $date) {
            $endpoint = "/EPIC/api/{$collection}/date/{$date}";
            $response = $this->client->get($endpoint);

            Log::info('NASA EPIC date query completed.', [
                'endpoint' => $endpoint,
                'date' => $date,
                'collection' => $collection,
                'image_count' => is_array($response) ? count($response) : 0,
            ]);

            $images = collect($response)
                ->filter(fn (mixed $image) => is_array($image))
                ->map(fn (array $image) => EpicImageData::fromArray($image)->toArray($collection))
                ->filter(fn (array $image) => is_string($image['imageUrl']) && str_starts_with($image['imageUrl'], 'https://epic.gsfc.nasa.gov/'))
                ->values()
                ->all();

            return [
                'date' => $date,
                'images' => $images,
                'source' => 'NASA EPIC',
            ];
        });
    }

    public function homeEarthImage(): array
    {
        $key = 'nasa:epic:home-earth-image';
        $cached = Cache::get($key);

        if (is_array($cached)) {
            return $cached;
        }

        $collection = self::HOME_COLLECTION;
        $endpoint = "/EPIC/api/{$collection}";
        $response = $this->client->get($endpoint);

        if (! array_is_list($response)) {
            Log::warning('NASA EPIC latest query returned unexpected JSON.', [
                'endpoint' => $endpoint,
                'collection' => $collection,
            ]);

            return $this->fallbackEarthImage();
        }

        Log::info('NASA EPIC latest query completed.', [
            'endpoint' => $endpoint,
            'collection' => $collection,
            'image_count' => count($response),
        ]);

        $image = collect($response)
            ->filter(fn (mixed $image) => is_array($image))
            ->map(fn (array $image) => EpicImageData::fromArray($image)->toArray($collection))
            ->filter(fn (array $image) => is_string($image['imageUrl']) && str_starts_with($image['imageUrl'], 'https://epic.gsfc.nasa.gov/'))
            ->sortByDesc(fn (array $image) => $image['date'] ?? '')
            ->first();

        if (! is_array($image)) {
            Log::notice('NASA EPIC latest query returned no usable images.', [
                'endpoint' => $endpoint,
                'collection' => $collection,
                'image_count' => count($response),
            ]);

            return $this->fallbackEarthImage();
        }

        $earthImage = [
            'url' => $image['imageUrl'],
            'imageUrl' => $image['imageUrl'],
            'alt' => $image['caption'] ?: 'Imagem real da Terra em disco completo capturada pela missão NASA EPIC.',
            'caption' => $image['caption'],
            'credit' => 'Imagem: NASA/EPIC',
            'source' => 'EPIC',
            'date' => $image['date'],
        ];

        Cache::put($key, $earthImage, (int) config('services.nasa.epic_cache_ttl', 86400));

        return $earthImage;
    }

    public function fallbackEarthImage(): array
    {
        return [
            'url' => null,
            'imageUrl' => null,
            'alt' => 'Representação visual estilizada da Terra em disco completo.',
            'caption' => 'Visual atmosférico em CSS enquanto a imagem EPIC não está disponível.',
            'credit' => 'Visual: atmosfera CSS',
            'source' => 'fallback',
            'date' => null,
        ];
    }
}
