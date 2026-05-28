<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

class SmallBodiesPageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function test_small_bodies_index_loads_with_cad_data(): void
    {
        Http::fake([
            'ssd-api.jpl.nasa.gov/*' => Http::response(JplResponses::cadApproaches()),
        ]);

        $this->get('/viajantes?date_min=2028-06-01&date_max=2028-08-15&type=all&dist_max=0.2')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SmallBodies/Index')
                ->has('approaches', 3)
                ->where('summary.total', 3)
                ->where('summary.comets', 1)
                ->where('filters.dist_max', '0.2')
            );
    }

    public function test_invalid_filters_are_rejected_before_calling_jpl(): void
    {
        $this->from('/viajantes')
            ->get('/viajantes?date_min=2028-01-01&date_max=2028-06-01&type=unknown&dist_max=999')
            ->assertRedirect('/viajantes')
            ->assertSessionHasErrors(['type', 'date_max', 'dist_max']);

        Http::assertNothingSent();
    }

    public function test_small_body_detail_loads_with_sbdb_data(): void
    {
        Http::fake([
            'ssd-api.jpl.nasa.gov/*' => Http::response(JplResponses::sbdbSmallBody()),
        ]);

        $this->get('/radar/objetos/1P')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SmallBodies/Show')
                ->where('smallBody.primaryName', 'Halley')
                ->where('smallBody.objectType', 'comet')
                ->has('smallBody.orbitalElements', 5)
                ->has('smallBody.closeApproaches', 1)
            );
    }

    public function test_object_not_found_is_shown_as_friendly_error(): void
    {
        Http::fake([
            'ssd-api.jpl.nasa.gov/*' => Http::response(JplResponses::sbdbNotFound()),
        ]);

        $this->get('/viajantes/ZZZ123')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SmallBodies/Show')
                ->where('smallBody', null)
                ->where('error', 'Não encontramos esse viajante no Small-Body Database. Ele pode ter outra designação no JPL.')
            );
    }

    public function test_jpl_server_error_does_not_break_index(): void
    {
        Http::fake([
            'ssd-api.jpl.nasa.gov/*' => Http::response(['error' => 'busy'], 500),
        ]);

        $this->get('/viajantes?date_min=2028-06-01&date_max=2028-06-15')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SmallBodies/Index')
                ->where('approaches', [])
                ->where('error', 'O JPL parece indisponível agora. A observação pode ser retomada em alguns instantes.')
            );
    }

    public function test_cad_response_is_cached_by_filters(): void
    {
        Http::fake([
            'ssd-api.jpl.nasa.gov/*' => Http::response(JplResponses::cadApproaches()),
        ]);

        $url = '/viajantes?date_min=2028-06-01&date_max=2028-06-15&dist_max=0.2&type=all';

        $this->get($url)->assertOk();
        $this->get($url)->assertOk();

        Http::assertSentCount(1);
    }

    public function test_identifier_validation_rejects_unsafe_values(): void
    {
        $this->get('/viajantes/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
            ->assertSessionHasErrors('identifier');

        Http::assertNothingSent();
    }
}
