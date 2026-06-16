<?php

namespace Tests\Unit;

use App\Services\Jpl\Horizons\HorizonsObjectIdentity;
use App\Support\Asteroids\FamousAsteroids;
use Tests\TestCase;

/**
 * Testa o mapeamento puro de FamousAsteroids: identidade dos famosos → payload Horizons e
 * approach sintético do shape ClosestNowObject. Sem rede.
 */
class FamousAsteroidsTest extends TestCase
{
    public function test_lista_tem_os_cinco_famosos_com_numero_de_catalogo(): void
    {
        $famous = FamousAsteroids::all();
        $this->assertCount(5, $famous);

        $numbers = array_column($famous, 'number');
        $this->assertEqualsCanonicalizing(['1', '4', '433', '101955', '25143'], $numbers);
    }

    public function test_id_sintetico_usa_o_prefixo_known(): void
    {
        $this->assertSame('known:433', FamousAsteroids::idFor('433'));
    }

    public function test_approach_sintetico_mapeia_identidade_sem_inventar_aproximacao(): void
    {
        $ceres = collect(FamousAsteroids::all())->firstWhere('number', '1');
        $approach = FamousAsteroids::syntheticApproach($ceres);

        $this->assertSame('known:1', $approach['id']);
        $this->assertSame('Ceres', $approach['name']);
        $this->assertSame('1', $approach['permanentNumber']);
        $this->assertSame($ceres['diameterMeters'], $approach['diameterMeters']);

        // Sem evento de aproximação: o card já trata estes nulos.
        $this->assertNull($approach['approachDate']);
        $this->assertNull($approach['nominalDistanceKm']);
        $this->assertFalse($approach['hazardFlag']);
    }

    public function test_payload_horizons_resolve_o_comando_exato_pelo_numero(): void
    {
        $eros = collect(FamousAsteroids::all())->firstWhere('number', '433');
        $payload = FamousAsteroids::horizonsPayload($eros);

        // O payload carrega permanentNumber, que HorizonsObjectIdentity injeta na identidade
        // normalizada e HorizonsCommandBuilder transforma no comando exato "433;".
        $identity = (new HorizonsObjectIdentity())->buildCommandCandidatesWithIdentity($payload);
        $commands = $identity['commands'];

        $this->assertContains('433;', $commands);
        // O comando exato pelo número tem precedência (primeiro da lista).
        $this->assertSame('433;', $commands[0]);
    }

    public function test_payload_horizons_nao_tem_approach_time(): void
    {
        $bennu = collect(FamousAsteroids::all())->firstWhere('number', '101955');
        $payload = FamousAsteroids::horizonsPayload($bennu);

        // Sem aproximação: o trajectoryAroundNow trata approachTime ausente como null.
        $this->assertArrayNotHasKey('approachTime', $payload);
    }
}
