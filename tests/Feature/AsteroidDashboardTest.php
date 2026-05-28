<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class AsteroidDashboardTest extends TestCase
{
    public function test_asteroid_dashboard_loads_with_nasa_data(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(NasaResponses::neoWsFeed()),
        ]);

        $this->get('/asteroides?start_date=2026-05-20&end_date=2026-05-21')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Asteroids/Index')
                ->has('asteroids', 3)
                ->where('stats.total', 3)
            );
    }

    public function test_asteroid_filter_rejects_ranges_longer_than_seven_days(): void
    {
        $this->from('/asteroides')
            ->get('/asteroides?start_date=2026-05-01&end_date=2026-05-15')
            ->assertRedirect('/asteroides')
            ->assertSessionHasErrors('end_date');

        Http::assertNothingSent();
    }

    public function test_nasa_error_is_handled_without_breaking_page(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(['error' => 'busy'], 500),
        ]);

        $this->get('/asteroides?start_date=2026-05-20&end_date=2026-05-21')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Asteroids/Index')
                ->where('error', 'A NASA parece indisponível agora. Seus dados não foram perdidos; tente novamente em instantes.')
            );
    }
}
