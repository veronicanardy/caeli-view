<?php

namespace Tests\Unit;

use App\DTOs\Nasa\Apod\ApodData;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class ApodDataTest extends TestCase
{
    public function test_it_transforms_apod_image_response(): void
    {
        $apod = ApodData::fromArray(NasaResponses::apodImage());

        $this->assertSame('2026-05-21', $apod->date);
        $this->assertSame('A Spiral Galaxy from NASA', $apod->title);
        $this->assertTrue($apod->isImage());
        $this->assertFalse($apod->isVideo());
        $this->assertSame('https://apod.nasa.gov/apod/image/2605/example.jpg', $apod->displayUrl());
    }

    public function test_it_transforms_apod_video_response_without_embedding_it(): void
    {
        $apod = ApodData::fromArray(NasaResponses::apodVideo());

        $this->assertTrue($apod->isVideo());
        $this->assertFalse($apod->isImage());
        $this->assertSame('https://www.youtube.com/embed/example', $apod->videoUrl());
        $this->assertSame('https://img.youtube.com/vi/example/hqdefault.jpg', $apod->displayUrl());
    }

    public function test_it_uses_regular_image_url_when_hd_url_is_absent(): void
    {
        $apod = ApodData::fromArray(NasaResponses::apodImageWithoutHdUrl());

        $this->assertTrue($apod->isImage());
        $this->assertNull($apod->hdUrl);
        $this->assertSame('https://apod.nasa.gov/apod/image/2605/example1024.jpg', $apod->displayUrl());
    }
}
