<?php

namespace App\Support;

final class DistancePresenter
{
    public const LUNAR_DISTANCE_KM = 384_400.0;
    private const KM_TO_MILES = 0.621371;

    public static function fromKilometers(?float $kilometers): array
    {
        if ($kilometers === null) {
            return [
                'kilometers' => null,
                'miles' => null,
                'lunarDistance' => null,
                'lunarReferenceKm' => self::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => null,
                'proximityBand' => 'unknown',
                'headline' => 'Distância ainda não informada',
                'comparison' => 'Sem dado suficiente para comparar com a Lua.',
            ];
        }

        $lunarDistance = $kilometers / self::LUNAR_DISTANCE_KM;
        $band = self::proximityBand($lunarDistance);

        return [
            'kilometers' => $kilometers,
            'miles' => $kilometers * self::KM_TO_MILES,
            'lunarDistance' => $lunarDistance,
            'lunarReferenceKm' => self::LUNAR_DISTANCE_KM,
            'earthDiametersApprox' => $kilometers / 12_742.0,
            'proximityBand' => $band,
            'headline' => self::headline($band),
            'comparison' => self::comparison($lunarDistance, $band),
        ];
    }

    private static function proximityBand(float $lunarDistance): string
    {
        if ($lunarDistance < 1.0) {
            return 'inside_moon';
        }

        if ($lunarDistance <= 1.5) {
            return 'near_moon';
        }

        return 'beyond_moon';
    }

    private static function headline(string $band): string
    {
        return match ($band) {
            'inside_moon' => 'Passou dentro da órbita média da Lua',
            'near_moon' => 'Passou próximo da faixa da Lua',
            'beyond_moon' => 'Passou além da órbita média da Lua',
            default => 'Distância ainda não informada',
        };
    }

    private static function comparison(float $lunarDistance, string $band): string
    {
        $rounded = number_format($lunarDistance, 1, ',', '.');

        return match ($band) {
            'inside_moon' => "Equivale a {$rounded} vez da distância média Terra-Lua.",
            default => "Equivale a {$rounded} distâncias lunares médias.",
        };
    }
}
