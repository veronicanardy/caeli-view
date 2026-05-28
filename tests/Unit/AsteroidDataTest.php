<?php

namespace Tests\Unit;

use App\DTOs\Nasa\NeoWs\AsteroidData;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class AsteroidDataTest extends TestCase
{
    public function test_it_transforms_neows_response_into_asteroid_data(): void
    {
        $asteroid = AsteroidData::fromArray(NasaResponses::asteroidLookup());

        $this->assertSame('1002', $asteroid->id);
        $this->assertSame('Asteroid Two', $asteroid->name);
        $this->assertTrue($asteroid->potentiallyHazardous);
        $this->assertSame(1.0, $asteroid->averageDiameterKm());
        $this->assertSame(62000.0, $asteroid->primaryApproach()?->velocityKmPerHour);
    }
}
