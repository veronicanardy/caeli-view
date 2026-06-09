<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RadarPageTest extends TestCase
{
    public function test_radar_page_renders_with_default_filters(): void
    {
        $this->get('/radar')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Radar/Index')
                ->has('filters')
                ->has('initialSunDirection')
            );
    }

    public function test_radar_rejects_overly_large_date_range_and_invalid_distance_before_external_calls(): void
    {
        $this->from('/radar')
            ->get('/radar?date_min=2026-05-01&date_max=2026-07-10&dist_max=999')
            ->assertRedirect('/radar')
            ->assertSessionHasErrors(['date_max', 'dist_max']);

        Http::assertNothingSent();
    }
}
