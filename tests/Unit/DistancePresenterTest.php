<?php

namespace Tests\Unit;

use App\Support\DistancePresenter;
use Tests\TestCase;

class DistancePresenterTest extends TestCase
{
    public function test_it_converts_kilometers_to_lunar_distance_and_miles(): void
    {
        $distance = DistancePresenter::fromKilometers(384_400);

        $this->assertSame(1.0, $distance['lunarDistance']);
        $this->assertEqualsWithDelta(238_855.0124, $distance['miles'], 0.0001);
        $this->assertSame('near_moon', $distance['proximityBand']);
    }

    public function test_it_marks_objects_inside_the_moon_orbit(): void
    {
        $distance = DistancePresenter::fromKilometers(200_000);

        $this->assertSame('inside_moon', $distance['proximityBand']);
        $this->assertSame('Passou dentro da órbita média da Lua', $distance['headline']);
    }
}
