<?php

namespace Tests\Unit;

use App\DTOs\Nasa\Epic\EpicImageData;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class EpicImageDataTest extends TestCase
{
    public function test_it_transforms_epic_response_and_builds_image_url(): void
    {
        $image = EpicImageData::fromArray(NasaResponses::epicImages()[0]);

        $this->assertSame('20260521000000', $image->identifier);
        $this->assertSame(
            'https://epic.gsfc.nasa.gov/archive/natural/2026/05/21/png/epic_1b_20260521000000.png',
            $image->imageUrl()
        );
    }

    public function test_it_builds_enhanced_collection_url_and_does_not_duplicate_extension(): void
    {
        $image = EpicImageData::fromArray([
            'identifier' => '20260521000000',
            'image' => 'epic_RGB_20260521000000.png',
            'date' => '2026-05-21 00:00:00',
        ]);

        $this->assertSame(
            'https://epic.gsfc.nasa.gov/archive/enhanced/2026/05/21/png/epic_RGB_20260521000000.png',
            $image->imageUrlForCollection('enhanced')
        );
    }
}
