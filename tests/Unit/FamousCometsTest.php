<?php

namespace Tests\Unit;

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
        $this->assertCount(4, $comets);

        $designations = array_column($comets, 'designation');
        $this->assertEqualsCanonicalizing(['1P', '2P', '67P', 'C/2020 F3'], $designations);
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
        $neowise = collect(FamousComets::all())->firstWhere('designation', 'C/2020 F3');
        $payload = FamousComets::horizonsPayload($neowise);

        $commands = (new HorizonsObjectIdentity())->buildCommandCandidates($payload);

        $this->assertSame('DES=C/2020 F3;CAP', $commands[0]);
    }

    public function test_payload_horizons_nao_tem_approach_time(): void
    {
        $encke = collect(FamousComets::all())->firstWhere('designation', '2P');
        $payload = FamousComets::horizonsPayload($encke);

        $this->assertArrayNotHasKey('approachTime', $payload);
    }
}
