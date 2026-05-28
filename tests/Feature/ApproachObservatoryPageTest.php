<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class ApproachObservatoryPageTest extends TestCase
{
    public function test_observatory_combines_neows_cad_and_epic_data(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(NasaResponses::neoWsFeed()),
            'api.nasa.gov/EPIC/api/natural*' => Http::response(NasaResponses::epicImages()),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
        ]);

        $this->getJson('/radar/data?date_min=2026-05-20&date_max=2026-05-21&type=all')
            ->assertOk()
            ->assertJsonCount(6, 'approaches')
            ->assertJsonPath('summary.fromNeoWs', 3)
            ->assertJsonPath('summary.fromCad', 3)
            ->assertJsonPath('summary.comets', 1)
            ->assertJsonPath('filters.dist_max', '0.2')
            ->assertJsonPath('filters.distance_unit', 'km')
            ->assertJsonPath('lunarReference.distanceKm', 384400)
            ->assertJsonPath('earthImage.source', 'EPIC');
    }

    public function test_observatory_keeps_jpl_data_when_neows_fails(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(['error' => 'busy'], 500),
            'api.nasa.gov/EPIC/api/natural*' => Http::response([]),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
        ]);

        $this->getJson('/radar/data?date_min=2026-05-20&date_max=2026-05-21&type=all')
            ->assertOk()
            ->assertJsonCount(3, 'approaches')
            ->assertJsonPath('summary.fromCad', 3)
            ->assertJsonPath('errorsBySource.neows', 'A NASA parece indisponível agora. Seus dados não foram perdidos; tente novamente em instantes.')
            ->assertJsonPath('earthImage.source', 'fallback');
    }

    public function test_observatory_positions_endpoint_returns_horizons_current_positions_when_available(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/positions?date_min=2026-05-20&date_max=2026-05-21&type=all&reference_mode=current')
            ->assertOk()
            ->assertJsonStructure([
                'positions',
                'referenceMode',
                'generatedAt',
            ])
            ->assertJsonPath('referenceMode', 'current');

        $positions = $response->json('positions');
        $this->assertNotEmpty($positions, 'positions should not be empty');

        foreach ($positions as $position) {
            $this->assertArrayHasKey('status', $position);
            $this->assertArrayHasKey('positionKind', $position);
            $this->assertArrayHasKey('closestApproachTime', $position);
            $this->assertArrayHasKey('closestApproachDistanceKm', $position);
            $this->assertArrayHasKey('closestApproachDistanceLD', $position);
            $this->assertArrayHasKey('distanceSource', $position);
            $this->assertArrayHasKey('positionSource', $position);
            $this->assertArrayHasKey('failureReason', $position);
            $this->assertContains($position['status'], ['available', 'unavailable']);
            $this->assertContains($position['positionKind'], ['horizons_current', 'symbolic_distance_only']);
        }
    }

    public function test_observatory_positions_supports_closest_approach_mode(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/positions?date_min=2026-05-20&date_max=2026-05-21&type=all&reference_mode=closest_approach')
            ->assertOk()
            ->assertJsonPath('referenceMode', 'closest_approach');
    }

    public function test_observatory_positions_falls_back_to_symbolic_when_horizons_has_no_ephemeris(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('No ephemeris for target.'),
        ]);

        $response = $this->getJson('/radar/positions?date_min=2026-05-20&date_max=2026-05-21&type=all')
            ->assertOk();

        $positions = $response->json('positions');
        $this->assertNotEmpty($positions);

        foreach ($positions as $position) {
            $this->assertSame('unavailable', $position['status']);
            $this->assertSame('symbolic_distance_only', $position['positionKind']);
            $this->assertNull($position['x']);
            $this->assertSame('unavailable', $position['positionSource']);
            $this->assertArrayHasKey('failureReason', $position);
            $this->assertSame('no_ephemeris', $position['failureReason']);
            $this->assertIsString($position['note']);
        }
    }

    public function test_observatory_positions_includes_sun_direction(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*' => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*' => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/positions?date_min=2026-05-20&date_max=2026-05-21&type=all&reference_mode=current')
            ->assertOk()
            ->assertJsonStructure([
                'sunDirection' => ['longitudeDeg', 'x', 'y', 'timestamp'],
            ]);

        $sun = $response->json('sunDirection');
        $this->assertIsFloat($sun['longitudeDeg']);
        $this->assertGreaterThanOrEqual(0, $sun['longitudeDeg']);
        $this->assertLessThan(360, $sun['longitudeDeg']);
        $this->assertEqualsWithDelta(1.0, $sun['x'] ** 2 + $sun['y'] ** 2, 1e-9);
    }

    public function test_observatory_rejects_overly_large_ranges_before_external_calls(): void
    {
        $this->from('/radar')
            ->get('/radar?date_min=2026-05-01&date_max=2026-07-10&dist_max=999')
            ->assertRedirect('/radar')
            ->assertSessionHasErrors(['date_max', 'dist_max']);

        Http::assertNothingSent();
    }
}
