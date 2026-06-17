<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

/**
 * Testa o endpoint /radar/famous: os asteroides famosos (Ceres, Vesta, Eros, Bennu, Itokawa)
 * resolvidos com posição e trilha curta do JPL Horizons, no mesmo shape do closest-now.
 */
class RadarFamousTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_retorna_os_cinco_famosos_com_trajetoria_do_horizons(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/famous')
            ->assertOk()
            ->assertJsonPath('mode', 'closest_now')
            ->assertJsonPath('selectionMode', 'famous');

        $objects = $response->json('objects');
        $this->assertCount(5, $objects);

        $numbers = array_map(fn ($o) => $o['approach']['permanentNumber'], $objects);
        $this->assertEqualsCanonicalizing(['1', '4', '433', '101955', '25143'], $numbers);

        foreach ($objects as $obj) {
            $this->assertSame('available', $obj['trajectory']['status']);
            $this->assertNull($obj['approach']['approachDate']);
            $this->assertTrue($obj['hasRealCurrentDistance']);
        }
    }

    public function test_resolve_cada_famoso_pelo_numero_de_catalogo_exato(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/famous')->assertOk();

        // O HorizonsCommandBuilder monta o comando exato "NNN;" a partir do permanentNumber.
        // URL-encoded: COMMAND='433;' vira COMMAND=%27433%3B%27.
        foreach (['1', '4', '433', '101955', '25143'] as $number) {
            Http::assertSent(fn (Request $request) => str_contains(
                (string) $request->url(),
                'COMMAND=%27'.$number.'%3B%27',
            ));
        }
    }

    public function test_famoso_sem_horizons_entra_com_trajetoria_nula_e_nao_some(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('No ephemeris for target.'),
        ]);

        $response = $this->getJson('/radar/famous')->assertOk();

        $objects = $response->json('objects');
        $this->assertCount(5, $objects, 'Nenhum famoso pode sumir quando o Horizons falha.');

        foreach ($objects as $obj) {
            $this->assertNull($obj['trajectory']);
            $this->assertFalse($obj['hasRealCurrentDistance']);
            $this->assertNull($obj['currentDistanceKm']);
        }
    }

    public function test_segunda_requisicao_usa_cache_sem_chamar_horizons(): void
    {
        $horizonsCount = 0;

        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => function () use (&$horizonsCount) {
                $horizonsCount++;
                return Http::response(JplResponses::horizonsVectorsText());
            },
        ]);

        $this->getJson('/radar/famous')->assertOk();
        $countAposFirst = $horizonsCount;

        $this->getJson('/radar/famous')->assertOk();

        $this->assertSame(
            $countAposFirst,
            $horizonsCount,
            'A segunda requisição deveria ter usado o cache do payload, mas chamou o Horizons novamente.',
        );
    }

    public function test_force_refresh_recompoe_o_payload_e_mantem_os_cinco(): void
    {
        // force_refresh esquece o cache do PAYLOAD (e roda o selector de novo); o cache individual
        // do Horizons por objeto (NOW_TRAJECTORY_SUCCESS_TTL) é compartilhado e pode ser reusado,
        // então não exigimos novas chamadas HTTP — só que a resposta recomposta siga correta.
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/famous')->assertOk();

        $this->getJson('/radar/famous?force_refresh=1')
            ->assertOk()
            ->assertJsonPath('selectionMode', 'famous')
            ->assertJsonCount(5, 'objects');
    }
}
