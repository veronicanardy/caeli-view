<?php

namespace App\Support;

use App\DTOs\Nasa\NeoWs\AsteroidData;
use Illuminate\Support\Collection;

final class AsteroidStats
{
    /**
     * @param Collection<int, AsteroidData> $asteroids
     */
    public static function fromCollection(Collection $asteroids): array
    {
        $diameters = $asteroids->map(fn (AsteroidData $asteroid) => $asteroid->averageDiameterKm())->filter();
        $velocities = $asteroids
            ->flatMap(fn (AsteroidData $asteroid) => $asteroid->closeApproaches)
            ->pluck('velocityKmPerHour')
            ->filter();
        $distances = $asteroids
            ->flatMap(fn (AsteroidData $asteroid) => $asteroid->closeApproaches)
            ->pluck('missDistanceKm')
            ->filter();

        return [
            'total' => $asteroids->count(),
            'hazardous' => $asteroids->where('potentiallyHazardous', true)->count(),
            'largestDiameterKm' => $diameters->max(),
            'fastestVelocityKmH' => $velocities->max(),
            'closestDistanceKm' => $distances->min(),
            'byDay' => self::byDay($asteroids),
            'hazardousBreakdown' => [
                ['name' => 'Potencialmente perigoso', 'value' => $asteroids->where('potentiallyHazardous', true)->count()],
                ['name' => 'Monitorado', 'value' => $asteroids->where('potentiallyHazardous', false)->count()],
            ],
            'topLargest' => $asteroids
                ->sortByDesc(fn (AsteroidData $asteroid) => $asteroid->averageDiameterKm() ?? 0)
                ->take(5)
                ->map(fn (AsteroidData $asteroid) => [
                    'name' => $asteroid->name,
                    'diameterKm' => $asteroid->averageDiameterKm(),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param Collection<int, AsteroidData> $asteroids
     */
    private static function byDay(Collection $asteroids): array
    {
        return $asteroids
            ->flatMap(fn (AsteroidData $asteroid) => $asteroid->closeApproaches)
            ->filter(fn ($approach) => $approach->date !== null)
            ->groupBy('date')
            ->map(fn (Collection $items, string $date) => ['date' => $date, 'total' => $items->count()])
            ->sortBy('date')
            ->values()
            ->all();
    }
}
