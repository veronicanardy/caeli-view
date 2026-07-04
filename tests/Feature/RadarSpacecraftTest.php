<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

/**
 * Testa o endpoint /radar/spacecraft: a posição atual das naves famosas (Voyager 1/2, Pioneer 10/11,
 * New Horizons, Juno, James Webb, Parker Solar Probe, Europa Clipper) resolvida no JPL Horizons como
 * vetor geocêntrico exato + heliocêntrico aproximado, em UA. As naves vivem na cena como os planetas;
 * quando o Horizons falha para uma nave, ela some do payload (o front cai no vetor fixo local).
 */
class RadarSpacecraftTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_retorna_as_naves_com_posicao_heliocentrica_do_horizons(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/spacecraft')->assertOk();

        $objects = $response->json('objects');
        $this->assertCount(9, $objects, 'Voyager 1/2, Pioneer 10/11, New Horizons, Juno, James Webb, Parker, Europa Clipper.');

        $ids = array_map(fn ($o) => $o['id'], $objects);
        $this->assertEqualsCanonicalizing(
            [
                'spacecraft:-31', 'spacecraft:-32', 'spacecraft:-23', 'spacecraft:-24',
                'spacecraft:-98', 'spacecraft:-61', 'spacecraft:-170', 'spacecraft:-96',
                'spacecraft:-159',
            ],
            $ids,
        );

        foreach ($objects as $obj) {
            // geoAU é o vetor geocêntrico EXATO do Horizons; helioAU o heliocêntrico aproximado.
            // Ambos vetores numéricos {x, y, z} em UA, prontos para a régua da cena.
            $this->assertIsNumeric($obj['geoAU']['x']);
            $this->assertIsNumeric($obj['geoAU']['y']);
            $this->assertIsNumeric($obj['geoAU']['z']);
            $this->assertIsNumeric($obj['helioAU']['x']);
            $this->assertIsNumeric($obj['helioAU']['y']);
            $this->assertIsNumeric($obj['helioAU']['z']);
        }
    }

    public function test_resolve_cada_nave_pelo_id_do_horizons(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/spacecraft')->assertOk();

        // Naves usam o id de nave do Horizons (SPK negativo) como COMMAND, URL-encoded: COMMAND='-31'
        // vira COMMAND=%27-31%27. O HorizonsObjectIdentity o prioriza via horizonsCommand explícito.
        foreach (['-31', '-32', '-23', '-24', '-98', '-61', '-170', '-96', '-159'] as $horizonsId) {
            Http::assertSent(fn (Request $request) => str_contains(
                (string) $request->url(),
                'COMMAND=%27'.$horizonsId.'%27',
            ));
        }
    }

    public function test_nave_sem_horizons_some_do_payload(): void
    {
        Http::fake([
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('No ephemeris for target.'),
        ]);

        $response = $this->getJson('/radar/spacecraft')->assertOk();

        // Sem posição ao vivo, nenhuma nave entra no payload: o front cai no vetor fixo local.
        $this->assertCount(0, $response->json('objects'));
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

        $this->getJson('/radar/spacecraft')->assertOk();
        $countAposFirst = $horizonsCount;

        $this->getJson('/radar/spacecraft')->assertOk();

        $this->assertSame(
            $countAposFirst,
            $horizonsCount,
            'A segunda requisição deveria ter usado o cache, mas chamou o Horizons novamente.',
        );
    }
}
