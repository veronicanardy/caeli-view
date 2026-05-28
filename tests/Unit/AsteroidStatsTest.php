<?php

namespace Tests\Unit;

use App\DTOs\Nasa\NeoWs\AsteroidData;
use App\Support\AsteroidStats;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class AsteroidStatsTest extends TestCase
{
    public function test_it_calculates_dashboard_summary_cards(): void
    {
        $asteroids = collect(NasaResponses::neoWsFeed()['near_earth_objects'])
            ->flatMap(fn (array $items) => $items)
            ->map(fn (array $item) => AsteroidData::fromArray($item));

        $stats = AsteroidStats::fromCollection($asteroids);

        $this->assertSame(3, $stats['total']);
        $this->assertSame(1, $stats['hazardous']);
        $this->assertSame(1.0, $stats['largestDiameterKm']);
        $this->assertSame(62000.0, $stats['fastestVelocityKmH']);
        $this->assertSame(800000.0, $stats['closestDistanceKm']);
        $this->assertCount(2, $stats['byDay']);
    }
}
