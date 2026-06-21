<?php

namespace Tests\Unit;

use App\Services\Approaches\FamousAsteroidsSelector;
use App\Services\Jpl\Horizons\HorizonsObjectIdentity;
use App\Support\Asteroids\FamousComets;
use Tests\TestCase;

/**
 * Testa o mapeamento puro de FamousComets: identidade dos cometas → payload Horizons (comando
 * DES=...;CAP), approach sintético e id sintético. Sem rede.
 */
class FamousCometsTest extends TestCase
{
    public function test_lista_tem_os_cometas_famosos_com_designacao(): void
    {
        $comets = FamousComets::all();
        $this->assertCount(3, $comets);

        $designations = array_column($comets, 'designation');
        $this->assertEqualsCanonicalizing(['1P', '2P', '67P'], $designations);
    }

    public function test_id_sintetico_usa_o_prefixo_comet(): void
    {
        $this->assertSame('comet:1P', FamousComets::idFor('1P'));
    }

    public function test_approach_sintetico_marca_objeto_como_cometa_sem_inventar_aproximacao(): void
    {
        $halley = collect(FamousComets::all())->firstWhere('designation', '1P');
        $approach = FamousComets::syntheticApproach($halley);

        $this->assertSame('comet:1P', $approach['id']);
        $this->assertSame('Halley', $approach['name']);
        $this->assertSame('comet', $approach['objectType']);

        // Sem evento de aproximação: o card já trata estes nulos.
        $this->assertNull($approach['approachDate']);
        $this->assertNull($approach['nominalDistanceKm']);
        $this->assertFalse($approach['hazardFlag']);
    }

    public function test_payload_horizons_prioriza_o_comando_de_cometa_des_cap(): void
    {
        $halley = collect(FamousComets::all())->firstWhere('designation', '1P');
        $payload = FamousComets::horizonsPayload($halley);

        // O comando explícito de cometa (DES=1P;CAP) deve ser o PRIMEIRO candidato, à frente de
        // qualquer comando que o normalizador de asteroides montaria a partir do nome.
        $commands = (new HorizonsObjectIdentity())->buildCommandCandidates($payload);

        $this->assertSame('DES=1P;CAP', $commands[0]);
    }

    public function test_payload_horizons_de_cometa_com_designacao_provisoria(): void
    {
        // Cometa de designação provisória (com barra e espaço, ex.: um C/AAAA Xn): o comando explícito
        // DES=...;CAP deve passar intacto, sem o normalizador de asteroides interferir. Montado à mão
        // porque hoje todos os famosos têm designação numerada (1P/2P/67P).
        $comet = ['designation' => 'C/2020 F3', 'name' => 'Provisório', 'horizonsCommand' => 'DES=C/2020 F3;CAP', 'diameterMeters' => 5_000];
        $payload = FamousComets::horizonsPayload($comet);

        $commands = (new HorizonsObjectIdentity())->buildCommandCandidates($payload);

        $this->assertSame('DES=C/2020 F3;CAP', $commands[0]);
    }

    public function test_payload_horizons_nao_tem_approach_time(): void
    {
        $encke = collect(FamousComets::all())->firstWhere('designation', '2P');
        $payload = FamousComets::horizonsPayload($encke);

        $this->assertArrayNotHasKey('approachTime', $payload);
    }

    public function test_ordena_famosos_por_distancia_atual_crescente(): void
    {
        $selector = $this->app->make(FamousAsteroidsSelector::class);

        $sorted = $selector->sortByCurrentDistance([
            ['approach' => ['id' => 'longe'], 'currentDistanceKm' => 9_000_000.0],
            ['approach' => ['id' => 'perto'], 'currentDistanceKm' => 300_000.0],
            ['approach' => ['id' => 'medio'], 'currentDistanceKm' => 1_500_000.0],
        ]);

        $ids = array_map(static fn (array $o): string => $o['approach']['id'], $sorted);
        $this->assertSame(['perto', 'medio', 'longe'], $ids);
    }

    public function test_famosos_sem_distancia_vao_para_o_fim_preservando_a_ordem(): void
    {
        $selector = $this->app->make(FamousAsteroidsSelector::class);

        // 'sem_a' e 'sem_b' não têm distância (Horizons falhou): devem ir para o fim, na ordem
        // de entrada, atrás de quem tem distância real.
        $sorted = $selector->sortByCurrentDistance([
            ['approach' => ['id' => 'sem_a'], 'currentDistanceKm' => null],
            ['approach' => ['id' => 'com'],   'currentDistanceKm' => 500_000.0],
            ['approach' => ['id' => 'sem_b'], 'currentDistanceKm' => null],
        ]);

        $ids = array_map(static fn (array $o): string => $o['approach']['id'], $sorted);
        $this->assertSame(['com', 'sem_a', 'sem_b'], $ids);
    }
}
