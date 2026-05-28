<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class ApodPageTest extends TestCase
{
    public function test_apod_page_loads_with_image_data(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(NasaResponses::apodImage()),
        ]);

        $this->getJson('/apod/data?date=2026-05-21')
            ->assertOk()
            ->assertJsonPath('apod.title', 'A Spiral Galaxy from NASA')
            ->assertJsonPath('apod.isImage', true)
            ->assertJsonPath('apod.isVideo', false);
    }

    public function test_apod_page_loads_with_video_data(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(NasaResponses::apodVideo()),
        ]);

        $this->getJson('/apod/data?date=2026-05-20')
            ->assertOk()
            ->assertJsonPath('apod.isVideo', true)
            ->assertJsonPath('apod.videoUrl', 'https://www.youtube.com/embed/example');
    }

    public function test_apod_rejects_dates_before_first_publication(): void
    {
        $this->from('/apod')
            ->get('/apod?date=1995-06-15')
            ->assertRedirect('/apod')
            ->assertSessionHasErrors('date');

        Http::assertNothingSent();
    }

    public function test_apod_uses_cache_for_repeated_date_searches(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(NasaResponses::apodImage()),
        ]);

        $this->getJson('/apod/data?date=2026-05-21')->assertOk();
        $this->getJson('/apod/data?date=2026-05-21')->assertOk();

        Http::assertSentCount(1);
    }

    public function test_apod_rate_limit_error_is_presented_without_breaking_page(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(['error' => 'rate limit'], 429),
        ]);

        $this->getJson('/apod/data?date=2026-05-21')
            ->assertOk()
            ->assertJsonPath('apod', null)
            ->assertJsonPath('error', 'A NASA limitou temporariamente as consultas. Aguarde um pouco antes de tentar novamente.');
    }
}
