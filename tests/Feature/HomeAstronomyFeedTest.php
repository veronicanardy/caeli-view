<?php

namespace Tests\Feature;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class HomeAstronomyFeedTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Config::set('features.home_observatory_feed', true);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_home_astronomy_feed_returns_highlight_and_next_approach(): void
    {
        CarbonImmutable::setTestNow('2026-05-20 09:00:00');

        Http::fake([
            'api.nasa.gov/planetary/apod*' => Http::response(NasaResponses::apodImage()),
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
        ]);

        $this->getJson('/home/astronomy-feed')
            ->assertOk()
            ->assertJsonPath('apod.title', 'A Spiral Galaxy from NASA')
            ->assertJsonPath('nextApproach.name', 'Asteroid One');
    }

    public function test_home_astronomy_feed_falls_back_when_sources_fail(): void
    {
        Http::fake([
            'api.nasa.gov/*' => Http::response(['error' => 'busy'], 500),
            'ssd-api.jpl.nasa.gov/*' => Http::response(['error' => 'busy'], 500),
        ]);

        $this->getJson('/home/astronomy-feed')
            ->assertOk()
            ->assertJsonPath('apod', null)
            ->assertJsonPath('apodError', 'NASA APOD indisponível agora.')
            ->assertJsonPath('nextApproach', null);
    }
}
