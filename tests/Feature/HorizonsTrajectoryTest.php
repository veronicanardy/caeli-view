<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Request;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

class HorizonsTrajectoryTest extends TestCase
{
    public function test_it_returns_horizons_trajectory_for_focused_object(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/trajectory?'.http_build_query([
            'id' => 'neows:1002',
            'name' => 'Anteros',
            'displayName' => 'Anteros',
            'rawName' => '1943 Anteros (1973 EC)',
            'designation' => '1973 EC',
            'detailIdentifier' => '1973 EC',
            'approachTime' => '2026-05-20 12:00',
        ]))
            ->assertOk()
            ->assertJsonPath('status', 'available')
            ->assertJsonPath('source', 'JPL Horizons')
            ->assertJsonCount(5, 'points')
            ->assertJsonPath('points.2.distanceLunar', fn (float $value) => $value > 2.0);

        Http::assertSent(fn (Request $request) => str_contains((string) $request->url(), "COMMAND=%271943%3B%27")
            && str_contains((string) $request->url(), 'format=text')
            && str_contains((string) $request->url(), 'CENTER=%27500%40399%27'));
    }

    public function test_it_returns_unavailable_when_horizons_has_no_vector_table(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('No ephemeris for target.'),
        ]);

        $this->getJson('/radar/trajectory?'.http_build_query([
            'id' => 'neows:1003',
            'name' => '2026 KN2',
            'rawName' => '(2026 KN2)',
            'designation' => '2026 KN2',
            'detailIdentifier' => '2026 KN2',
            'approachTime' => '2026-05-20 12:00',
        ]))
            ->assertOk()
            ->assertJsonPath('status', 'unavailable')
            ->assertJsonCount(0, 'points');
    }

    public function test_it_tries_next_normalized_command_when_http_200_has_no_ephemeris(): void
    {
        Http::fake(function (Request $request) {
            $url = (string) $request->url();

            if (str_contains($url, 'COMMAND=%271943%3B%27')) {
                return Http::response('Multiple major-bodies match this request.');
            }

            return Http::response(JplResponses::horizonsVectorsText());
        });

        $this->getJson('/radar/trajectory?'.http_build_query([
            'id' => 'neows:anteros',
            'name' => 'Anteros',
            'displayName' => 'Anteros',
            'rawName' => '1943 Anteros (1973 EC)',
            'designation' => '1973 EC',
            'detailIdentifier' => '1973 EC',
            'approachTime' => '2026-05-20 12:00',
        ]))
            ->assertOk()
            ->assertJsonPath('status', 'available');

        Http::assertSent(fn (Request $request) => str_contains((string) $request->url(), 'COMMAND=%271943%3B%27'));
        Http::assertSent(fn (Request $request) => str_contains((string) $request->url(), 'COMMAND=%27DES%3D1973%20EC%3B%27'));
    }
}
