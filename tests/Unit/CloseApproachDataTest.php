<?php

namespace Tests\Unit;

use App\DTOs\Jpl\CloseApproachData;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

class CloseApproachDataTest extends TestCase
{
    public function test_it_maps_cad_array_records_using_returned_fields(): void
    {
        $response = JplResponses::cadApproaches();
        $approach = CloseApproachData::fromCadRecord($response['fields'], $response['data'][0], 'Earth');

        $this->assertSame('153814', $approach->designation);
        $this->assertSame('153814 (2001 WN5)', $approach->fullName);
        $this->assertSame(0.0016625, $approach->distanceAu);
        $this->assertSame(10.24, $approach->relativeVelocityKmS);
        $this->assertSame('Earth', $approach->approachBody);
    }

    public function test_it_identifies_comets_when_designation_or_fullname_indicates_it(): void
    {
        $response = JplResponses::cadApproaches();
        $approach = CloseApproachData::fromCadRecord($response['fields'], $response['data'][1], 'Earth');

        $this->assertSame('comet', $approach->objectType);
    }
}
