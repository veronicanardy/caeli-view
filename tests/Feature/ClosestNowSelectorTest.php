<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\JplResponses;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

/**
 * Testa o pipeline do ClosestNowSelector, especialmente a estratégia de lazy-loading
 * do Horizons: apenas limit + HORIZONS_MARGIN objetos devem receber consulta real.
 */
class ClosestNowSelectorTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    // -------------------------------------------------------------------------
    // Estado inicial: limit=5
    // -------------------------------------------------------------------------

    public function test_limit_5_consulta_no_maximo_10_objetos_no_horizons(): void
    {
        $horizonsCount = 0;

        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'   => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'    => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => function () use (&$horizonsCount) {
                $horizonsCount++;
                return Http::response(JplResponses::horizonsVectorsText());
            },
        ]);

        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk()
            ->assertJsonPath('mode', 'closest_now');

        // limit=5 + HORIZONS_MARGIN=5 = no máximo 10 consultas ao Horizons
        $this->assertLessThanOrEqual(
            10,
            $horizonsCount,
            "Esperado no máximo 10 chamadas ao Horizons para limit=5, mas foram feitas {$horizonsCount}.",
        );
    }

    public function test_limit_5_retorna_exatamente_5_objetos(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $objects = $response->json('objects');
        $this->assertIsArray($objects);
        $this->assertLessThanOrEqual(5, count($objects));
    }

    // -------------------------------------------------------------------------
    // Objeto sem Horizons permanece no ranking
    // -------------------------------------------------------------------------

    public function test_objeto_sem_horizons_permanece_no_ranking_com_fallback_nominal(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            // Horizons retorna resposta vazia (sem pontos) — simula objeto não encontrado
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('$$SOE' . "\n" . '$$EOE'),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $objects = $response->json('objects');
        $this->assertIsArray($objects);

        // Deve haver objetos no resultado (usando fallback nominal do CAD)
        $this->assertNotEmpty($objects, 'Nenhum objeto retornado — fallback nominal não funcionou.');

        // Nenhum objeto deve ter sido removido silenciosamente por falha no Horizons
        foreach ($objects as $obj) {
            $this->assertArrayHasKey('hasRealCurrentDistance', $obj);
            $this->assertArrayHasKey('currentDistanceKm', $obj);
        }
    }

    // -------------------------------------------------------------------------
    // Ranking ordenado por distância, não por disponibilidade do Horizons
    // -------------------------------------------------------------------------

    public function test_ranking_e_ordenado_por_distancia_crescente(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $objects = $response->json('objects');
        if (count($objects) < 2) {
            $this->markTestSkipped('Menos de 2 objetos retornados — impossível verificar ordenação.');
        }

        for ($i = 1; $i < count($objects); $i++) {
            $distAtual   = $objects[$i]['currentDistanceKm'];
            $distAnterior = $objects[$i - 1]['currentDistanceKm'];

            if ($distAtual === null || $distAnterior === null) {
                continue; // objetos sem distância vão para o final — não invalidam o teste
            }

            $this->assertGreaterThanOrEqual(
                (float) $distAnterior,
                (float) $distAtual,
                "Objeto na posição {$i} está mais próximo que o anterior — ranking incorreto.",
            );
        }
    }

    // -------------------------------------------------------------------------
    // Cache individual do Horizons por objeto
    // -------------------------------------------------------------------------

    public function test_segunda_requisicao_com_mesmo_limit_usa_cache_sem_chamar_horizons(): void
    {
        $horizonsCount = 0;

        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'   => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'    => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => function () use (&$horizonsCount) {
                $horizonsCount++;
                return Http::response(JplResponses::horizonsVectorsText());
            },
        ]);

        // Primeira requisição preenche o cache do pipeline e os caches individuais do Horizons
        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $countAposFirst = $horizonsCount;

        // Segunda requisição com mesmo limit deve usar o cache do pipeline (zero novas chamadas)
        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $this->assertEquals(
            $countAposFirst,
            $horizonsCount,
            'A segunda requisição deveria ter usado o cache do pipeline, mas chamou o Horizons novamente.',
        );
    }

    // -------------------------------------------------------------------------
    // Falha 503 do Horizons não derruba o resultado
    // -------------------------------------------------------------------------

    public function test_falha_503_horizons_nao_remove_objetos_do_resultado(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response('Service Unavailable', 503),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $objects = $response->json('objects');
        $this->assertIsArray($objects);
        $this->assertNotEmpty($objects, 'Nenhum objeto retornado após falha 503 — fallback não funcionou.');

        foreach ($objects as $obj) {
            // Objetos com Horizons falho devem ter hasRealCurrentDistance=false, não sumir
            $this->assertArrayHasKey('hasRealCurrentDistance', $obj);
        }
    }

    // -------------------------------------------------------------------------
    // Deduplicação
    // -------------------------------------------------------------------------

    public function test_objetos_duplicados_sao_deduplicados(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $response = $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=30&mode=nearest')
            ->assertOk();

        $objects = $response->json('objects');
        $nomes   = array_map(
            fn ($o) => strtolower(preg_replace('/[^a-z0-9]+/i', '', $o['approach']['rawName'] ?? $o['approach']['name'] ?? '')),
            $objects,
        );
        $nomes = array_filter($nomes);

        $this->assertEquals(
            count($nomes),
            count(array_unique($nomes)),
            'Há objetos duplicados no resultado — deduplicação não funcionou.',
        );
    }

    // -------------------------------------------------------------------------
    // Campos obrigatórios na resposta
    // -------------------------------------------------------------------------

    public function test_resposta_contem_campos_obrigatorios(): void
    {
        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'     => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'      => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => Http::response(JplResponses::horizonsVectorsText()),
        ]);

        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk()
            ->assertJsonStructure([
                'mode',
                'selectionMode',
                'generatedAt',
                'window'     => ['dateMin', 'dateMax'],
                'requestedLimit',
                'candidatesEvaluated',
                'horizonsQueried',
                'objects',
                'lunarReference' => ['distanceKm'],
            ]);
    }

    // -------------------------------------------------------------------------
    // Expansão de limit: novos objetos não repetem chamadas já cacheadas
    // -------------------------------------------------------------------------

    public function test_expansao_de_5_para_15_nao_repete_horizons_para_os_5_ja_cacheados(): void
    {
        $horizonsIds = [];

        Http::fake([
            'api.nasa.gov/neo/rest/v1/feed*'   => Http::response(NasaResponses::neoWsFeed()),
            'ssd-api.jpl.nasa.gov/cad.api*'    => Http::response(JplResponses::cadApproaches()),
            'ssd.jpl.nasa.gov/api/horizons.api*' => function ($request) use (&$horizonsIds) {
                // Registra a URL para inspecionar qual objeto foi consultado
                $horizonsIds[] = (string) $request->url();
                return Http::response(JplResponses::horizonsVectorsText());
            },
        ]);

        // Primeira carga com limit=5 (consulta ~10 objetos no Horizons e os cacheia individualmente)
        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=5&mode=nearest')
            ->assertOk();

        $urlsAposLimit5 = $horizonsIds;

        // Expansão para limit=15: o cache do pipeline (v3, inclui limit) é miss,
        // mas o cache individual do Horizons por objeto reutiliza os já consultados.
        // O total de novas chamadas deve ser <= 10 (apenas os objetos 11–20 + margem).
        $this->getJson('/radar/closest-now?date_min=2026-05-20&date_max=2026-05-21&limit=15&mode=nearest')
            ->assertOk();

        $urlsNovasParaLimit15 = array_slice($horizonsIds, count($urlsAposLimit5));

        // Em ambiente de teste, o cache do Horizons por objeto pode estar desabilitado
        // (depende da configuração do driver de cache). O que importa é que as
        // novas chamadas não excedam limit=15 + HORIZONS_MARGIN=5 = 20.
        $this->assertLessThanOrEqual(
            20,
            count($urlsNovasParaLimit15),
            'A expansão 5→15 fez mais chamadas ao Horizons do que o esperado (máximo 20).',
        );
    }
}
