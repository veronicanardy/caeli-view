<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

class RadarTrajectoryAndModelTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    // -------------------------------------------------------------------------
    // trajectory — anchor=now
    // -------------------------------------------------------------------------

    public function test_trajectory_anchor_now_returns_available_status(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/trajectory?' . http_build_query([
            'id'           => 'neows:1002',
            'name'         => 'Anteros',
            'displayName'  => 'Anteros',
            'rawName'      => '1943 Anteros (1973 EC)',
            'designation'  => '1973 EC',
            'approachTime' => '2026-05-20 12:00',
            'anchor'       => 'now',
            'history_days' => 30,
        ]))
            ->assertOk()
            ->assertJsonPath('status', 'available')
            ->assertJsonStructure(['status', 'points', 'currentDistanceKm']);
    }

    public function test_trajectory_anchor_now_with_history_days_720_uses_wide_step(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/trajectory?' . http_build_query([
            'id'           => 'neows:1002',
            'name'         => 'Anteros',
            'approachTime' => '2026-05-20 12:00',
            'anchor'       => 'now',
            'history_days' => 720,
        ]))
            ->assertOk()
            ->assertJsonPath('status', 'available');

        // O step "3 days" é usado para janelas >365 dias — confirma que a rota chegou ao Horizons
        Http::assertSentCount(1);
    }

    public function test_trajectory_anchor_now_rejects_history_days_below_minimum(): void
    {
        $this->getJson('/radar/trajectory?' . http_build_query([
            'id'           => 'neows:1002',
            'name'         => 'Anteros',
            'approachTime' => '2026-05-20 12:00',
            'anchor'       => 'now',
            'history_days' => 3,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['history_days']);

        Http::assertNothingSent();
    }

    public function test_trajectory_anchor_now_falls_back_gracefully_when_horizons_unavailable(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('No ephemeris for target.'),
        ]);

        $this->getJson('/radar/trajectory?' . http_build_query([
            'id'           => 'neows:9999',
            'name'         => 'Unknown Rock',
            'approachTime' => '2026-05-20 12:00',
            'anchor'       => 'now',
            'history_days' => 30,
        ]))
            ->assertOk()
            ->assertJsonPath('status', 'unavailable')
            ->assertJsonCount(0, 'points');
    }

    public function test_trajectory_requires_id_and_name_and_approach_time(): void
    {
        $this->getJson('/radar/trajectory')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['id', 'name', 'approachTime']);

        Http::assertNothingSent();
    }

    // -------------------------------------------------------------------------
    // asteroidModel — hierarquia N1/N2/N3/N5
    // -------------------------------------------------------------------------

    public function test_asteroid_model_returns_n2_for_catalogued_object_without_glb(): void
    {
        // Bennu está no catálogo mas sem modelUrl → N2
        $this->getJson('/radar/asteroid-model?' . http_build_query([
            'id'          => 'cad:101955',
            'name'        => '101955 Bennu',
            'displayName' => 'Bennu',
            'designation' => '101955',
            'spkId'       => '2101955',
        ]))
            ->assertOk()
            ->assertJsonPath('fidelityLevel', 'N2')
            ->assertJsonPath('modelKind', 'catalog_reference')
            ->assertJsonPath('status', 'fallback');
    }

    public function test_asteroid_model_returns_n3_for_object_with_diameter_and_orbit_identity(): void
    {
        $this->getJson('/radar/asteroid-model?' . http_build_query([
            'id'            => 'neows:1002',
            'name'          => 'Asteroid Two',
            'displayName'   => 'Asteroid Two',
            'designation'   => '2001 AB1',
            'diameterMeters' => 500,
        ]))
            ->assertOk()
            ->assertJsonPath('fidelityLevel', 'N3')
            ->assertJsonPath('modelKind', 'procedural')
            ->assertJsonPath('diameterMeters', 500.0);
    }

    public function test_asteroid_model_returns_n4_for_object_with_only_diameter_range(): void
    {
        $this->getJson('/radar/asteroid-model?' . http_build_query([
            'id'             => 'neows:1003',
            'name'           => 'Asteroid Three',
            'displayName'    => 'Asteroid Three',
            'diameterMinMeters' => 100,
            'diameterMaxMeters' => 300,
        ]))
            ->assertOk()
            ->assertJsonPath('fidelityLevel', 'N4')
            ->assertJsonPath('modelKind', 'procedural');
    }

    public function test_asteroid_model_returns_n5_when_no_physical_data(): void
    {
        $this->getJson('/radar/asteroid-model?' . http_build_query([
            'id'          => 'neows:9999',
            'name'        => 'Unknown Asteroid',
            'displayName' => 'Unknown Asteroid',
        ]))
            ->assertOk()
            ->assertJsonPath('fidelityLevel', 'N5')
            ->assertJsonPath('modelKind', 'size_placeholder')
            ->assertJsonPath('status', 'fallback');
    }

    public function test_asteroid_model_shape_seed_is_deterministic(): void
    {
        $params = http_build_query([
            'id'          => 'neows:7777',
            'name'        => 'Stable Asteroid',
            'displayName' => 'Stable Asteroid',
        ]);

        $first  = $this->getJson('/radar/asteroid-model?' . $params)->assertOk()->json('shapeSeed');
        Cache::flush();
        $second = $this->getJson('/radar/asteroid-model?' . $params)->assertOk()->json('shapeSeed');

        $this->assertSame($first, $second, 'shapeSeed deve ser determinístico para o mesmo objeto.');
    }

    public function test_asteroid_model_requires_id_and_name(): void
    {
        $this->getJson('/radar/asteroid-model')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['id', 'name']);
    }

    public function test_asteroid_model_response_has_required_contract_fields(): void
    {
        $this->getJson('/radar/asteroid-model?' . http_build_query([
            'id'          => 'neows:1001',
            'name'        => 'Asteroid One',
            'displayName' => 'Asteroid One',
        ]))
            ->assertOk()
            ->assertJsonStructure([
                'objectId',
                'objectName',
                'status',
                'fidelityLevel',
                'modelKind',
                'modelUrl',
                'sourceName',
                'confidence',
                'shapeSeed',
                'diameterMeters',
                'note',
            ]);
    }
}
