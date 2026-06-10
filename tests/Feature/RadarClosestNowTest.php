<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class RadarClosestNowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    // -------------------------------------------------------------------------
    // Validação de parâmetros
    // -------------------------------------------------------------------------

    public function test_rejects_invalid_limit(): void
    {
        $this->getJson('/radar/closest-now?limit=99')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['limit']);

        Http::assertNothingSent();
    }

    public function test_rejects_invalid_mode(): void
    {
        $this->getJson('/radar/closest-now?mode=random')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['mode']);

        Http::assertNothingSent();
    }

    public function test_rejects_invalid_date_format(): void
    {
        $this->getJson('/radar/closest-now?date_min=20-05-2026')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_min']);

        Http::assertNothingSent();
    }

    // -------------------------------------------------------------------------
    // Modo upcoming
    // -------------------------------------------------------------------------

    public function test_upcoming_mode_returns_objects_sorted_by_proximity_to_now(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=upcoming')
            ->assertOk()
            ->assertJsonPath('selectionMode', 'upcoming')
            ->assertJsonPath('mode', 'closest_now');

        $this->assertIsArray($response->json('objects'));
    }

    public function test_upcoming_mode_contract_matches_nearest(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        // Ambos os modos devem obedecer ao mesmo contrato JSON de campos obrigatórios
        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=upcoming')
            ->assertOk()
            ->assertJsonStructure([
                'mode',
                'selectionMode',
                'generatedAt',
                'window'     => ['dateMin', 'dateMax'],
                'requestedLimit',
                'candidatesEvaluated',
                'objects',
                'lunarReference' => ['distanceKm'],
            ]);
    }

    public function test_upcoming_mode_respects_limit(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=2&mode=upcoming')
            ->assertOk();

        $this->assertLessThanOrEqual(2, count($response->json('objects')));
    }

    // -------------------------------------------------------------------------
    // force_refresh ignora cache
    // -------------------------------------------------------------------------

    public function test_force_refresh_returns_ok_and_clears_pipeline_cache(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $url = '/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest';

        // Primeira chamada preenche o cache do pipeline
        $this->getJson($url)->assertOk();

        // force_refresh deve limpar o cache e retornar resultado válido sem explodir
        $this->getJson($url . '&force_refresh=1')
            ->assertOk()
            ->assertJsonPath('mode', 'closest_now')
            ->assertJsonStructure(['objects', 'generatedAt', 'window']);
    }

    // -------------------------------------------------------------------------
    // Fallback nominal quando Horizons falha por objeto individual
    // -------------------------------------------------------------------------

    public function test_objects_use_nominal_distance_fallback_when_horizons_fails_per_object(): void
    {
        // CAD e NeoWs retornam candidatos válidos, mas o Horizons rejeita todos.
        // O pipeline deve usar nominalDistanceKm como fallback e sinalizar hasRealCurrentDistance=false.
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'      => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'        => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*'   => Http::response('No ephemeris for target.', 200),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk()
            ->assertJsonPath('mode', 'closest_now');

        $objects = $response->json('objects');
        $this->assertNotEmpty($objects, 'Deve retornar objetos mesmo sem Horizons, usando fallback nominal.');

        foreach ($objects as $object) {
            // Horizons falhou: hasRealCurrentDistance deve ser false
            $this->assertFalse($object['hasRealCurrentDistance'], 'hasRealCurrentDistance deve ser false quando Horizons não responde.');
            // Mas currentDistanceKm ainda deve existir, populado pela distância nominal do CAD/NeoWs
            $this->assertNotNull($object['currentDistanceKm'], 'currentDistanceKm deve usar fallback nominal quando Horizons falha.');
        }
    }

    // -------------------------------------------------------------------------
    // Fallback quando CAD e NeoWs falham simultaneamente
    // -------------------------------------------------------------------------

    public function test_returns_empty_objects_when_both_sources_fail(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'  => Http::response(['error' => 'busy'], 503),
            'ssd-api.jpl.nasa.gov/cad.api*'   => Http::response(['error' => 'busy'], 503),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('', 503),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5')
            ->assertOk();

        $this->assertEmpty($response->json('objects'));
    }
}
