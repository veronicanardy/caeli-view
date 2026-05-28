<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class EpicGalleryTest extends TestCase
{
    public function test_epic_gallery_loads_with_images(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(NasaResponses::epicImages()),
        ]);

        $this->get('/epic?date=2026-05-21')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Epic/Index')
                ->has('images', 1)
                ->where('date', '2026-05-21')
            );
    }

    public function test_epic_invalid_future_date_returns_validation_error(): void
    {
        $this->from('/epic')
            ->get('/epic?date=2999-01-01')
            ->assertRedirect('/epic')
            ->assertSessionHasErrors('date');

        Http::assertNothingSent();
    }
}
