<?php

namespace Tests\Fixtures;

final class NasaResponses
{
    public static function neoWsFeed(): array
    {
        return [
            'near_earth_objects' => [
                '2026-05-20' => [
                    self::asteroid('1001', 'Asteroid One', false, '2026-05-20', 45000, 1200000, 0.2, 0.4),
                    self::asteroid('1002', 'Asteroid Two', true, '2026-05-20', 62000, 800000, 0.8, 1.2),
                ],
                '2026-05-21' => [
                    self::asteroid('1003', 'Asteroid Three', false, '2026-05-21', 30000, 2000000, 0.1, 0.2),
                ],
            ],
        ];
    }

    public static function asteroidLookup(): array
    {
        return self::asteroid('1002', 'Asteroid Two', true, '2026-05-20', 62000, 800000, 0.8, 1.2);
    }

    public static function epicImages(): array
    {
        return [
            [
                'identifier' => '20260521000000',
                'image' => 'epic_1b_20260521000000',
                'caption' => 'This image was taken by NASA EPIC.',
                'date' => '2026-05-21 00:00:00',
                'centroid_coordinates' => ['lat' => 1.2, 'lon' => -45.1],
                'dscovr_j2000_position' => ['x' => 1, 'y' => 2, 'z' => 3],
            ],
        ];
    }

    public static function apodImage(): array
    {
        return [
            'date' => '2026-05-21',
            'title' => 'A Spiral Galaxy from NASA',
            'explanation' => 'A real astronomy image from NASA APOD.',
            'media_type' => 'image',
            'url' => 'https://apod.nasa.gov/apod/image/2605/example1024.jpg',
            'hdurl' => 'https://apod.nasa.gov/apod/image/2605/example.jpg',
            'copyright' => 'NASA',
        ];
    }

    public static function apodVideo(): array
    {
        return [
            'date' => '2026-05-20',
            'title' => 'A NASA Astronomy Video',
            'explanation' => 'A real astronomy video from NASA APOD.',
            'media_type' => 'video',
            'url' => 'https://www.youtube.com/embed/example',
            'thumbnail_url' => 'https://img.youtube.com/vi/example/hqdefault.jpg',
        ];
    }

    public static function apodImageWithoutHdUrl(): array
    {
        return [
            'date' => '2026-05-19',
            'title' => 'A NASA Image Without HD URL',
            'explanation' => 'A real APOD image without an HD URL.',
            'media_type' => 'image',
            'url' => 'https://apod.nasa.gov/apod/image/2605/example1024.jpg',
        ];
    }

    private static function asteroid(
        string $id,
        string $name,
        bool $hazardous,
        string $date,
        float $velocity,
        float $distance,
        float $minDiameter,
        float $maxDiameter,
    ): array {
        return [
            'id' => $id,
            'name' => $name,
            'nasa_jpl_url' => "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr={$id}",
            'estimated_diameter' => [
                'kilometers' => [
                    'estimated_diameter_min' => $minDiameter,
                    'estimated_diameter_max' => $maxDiameter,
                ],
            ],
            'is_potentially_hazardous_asteroid' => $hazardous,
            'close_approach_data' => [
                [
                    'close_approach_date' => $date,
                    'close_approach_date_full' => "{$date} 12:00",
                    'relative_velocity' => [
                        'kilometers_per_hour' => (string) $velocity,
                    ],
                    'miss_distance' => [
                        'kilometers' => (string) $distance,
                        'lunar' => '3.2',
                    ],
                    'orbiting_body' => 'Earth',
                ],
            ],
        ];
    }
}
