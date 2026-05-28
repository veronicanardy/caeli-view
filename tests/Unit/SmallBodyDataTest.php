<?php

namespace Tests\Unit;

use App\DTOs\Jpl\SmallBodyData;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

class SmallBodyDataTest extends TestCase
{
    public function test_it_maps_sbdb_response_into_small_body_data(): void
    {
        $smallBody = SmallBodyData::fromSbdbResponse(JplResponses::sbdbSmallBody());

        $this->assertSame('Halley', $smallBody->primaryName());
        $this->assertSame('1000012', $smallBody->spkId);
        $this->assertSame('comet', $smallBody->objectType);
        $this->assertSame(5.5, $smallBody->physicalParameter('H')?->value);
        $this->assertSame(0.967, $smallBody->orbitalElement('e')?->value);
        $this->assertCount(1, $smallBody->closeApproaches);
    }

    public function test_it_handles_missing_physical_and_orbital_data(): void
    {
        $smallBody = SmallBodyData::fromSbdbResponse(JplResponses::sbdbWithoutPhysicalData());

        $this->assertSame([], $smallBody->physicalParameters);
        $this->assertSame([], $smallBody->orbitalElements);
        $this->assertNull($smallBody->physicalParameter('diameter'));
    }
}
