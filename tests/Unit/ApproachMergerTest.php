<?php

namespace Tests\Unit;

use App\DTOs\Approaches\UnifiedApproachData;
use App\Services\Approaches\ApproachMerger;
use Tests\TestCase;

/**
 * Protege as regras de combinação de fontes do ApproachMerger.
 *
 * A regra crítica: em colisão (mesmo objeto+data vindo de NeoWs E CAD), o CAD vence, porque é a
 * solução orbital integrada do JPL (mesma referência do NASA Eyes). Isso mantém a distância usada
 * nos cortes fiel ao JPL, em vez da distância levemente distinta do NeoWs.
 */
class ApproachMergerTest extends TestCase
{
    private function neoWs(string $name, string $date, float $distanceKm): UnifiedApproachData
    {
        return UnifiedApproachData::fromNeoWs([
            'id'   => 'n-' . md5($name),
            'name' => $name,
            'primaryApproach' => [
                'dateTime'         => $date,
                'missDistanceKm'   => $distanceKm,
                'velocityKmPerHour' => 50000,
            ],
        ]);
    }

    private function cad(string $name, string $date, float $distanceKm): UnifiedApproachData
    {
        return UnifiedApproachData::fromCad([
            'fullName'     => $name,
            'designation'  => trim($name, '() '),
            'objectType'   => 'asteroid',
            'calendarDate' => $date,
            'distanceKm'   => $distanceKm,
            'relativeVelocityKmS' => 13.0,
        ]);
    }

    public function test_em_colisao_entre_fontes_o_cad_vence_e_define_a_distancia(): void
    {
        // Mesmo objeto+data: NeoWs diz 7.0M km (abaixo de um corte hipotético), CAD diz 10.4M km (acima).
        $neoWs = collect([$this->neoWs('(2015 LM24)', '2026-06-25 13:35', 7_000_000.0)]);
        $cad   = collect([$this->cad('(2015 LM24)', '2026-06-25 13:35', 10_400_000.0)]);

        $merged = (new ApproachMerger())->merge($neoWs, $cad, 'date');

        $this->assertCount(1, $merged, 'O objeto duplicado deveria ter sido deduplicado para uma única entrada.');
        $this->assertSame('cad', $merged->first()->source, 'Em colisão NeoWs×CAD, o CAD deve prevalecer.');
        $this->assertSame(10_400_000.0, $merged->first()->nominalDistanceKm, 'A distância deve ser a do CAD (JPL), não a do NeoWs.');
    }

    public function test_objeto_so_no_neows_permanece_com_dados_do_neows(): void
    {
        $neoWs = collect([$this->neoWs('(2026 ZZ1)', '2026-06-25 10:00', 3_000_000.0)]);
        $cad   = collect([]);

        $merged = (new ApproachMerger())->merge($neoWs, $cad, 'date');

        $this->assertCount(1, $merged);
        $this->assertSame('neows', $merged->first()->source);
        $this->assertSame(3_000_000.0, $merged->first()->nominalDistanceKm);
    }

    public function test_objetos_distintos_de_ambas_as_fontes_sao_mantidos(): void
    {
        $neoWs = collect([$this->neoWs('(2026 AA1)', '2026-06-25 10:00', 1_000_000.0)]);
        $cad   = collect([$this->cad('(2026 BB2)', '2026-06-26 10:00', 2_000_000.0)]);

        $merged = (new ApproachMerger())->merge($neoWs, $cad, 'date');

        $this->assertCount(2, $merged, 'Objetos diferentes não devem ser deduplicados entre si.');
    }

    public function test_dentro_da_mesma_fonte_mantem_a_primeira_ocorrencia(): void
    {
        // Duas entradas NeoWs do mesmo objeto+data: a primeira (1.0M) deve permanecer.
        $neoWs = collect([
            $this->neoWs('(2026 CC3)', '2026-06-25 10:00', 1_000_000.0),
            $this->neoWs('(2026 CC3)', '2026-06-25 10:00', 9_000_000.0),
        ]);

        $merged = (new ApproachMerger())->merge($neoWs, collect([]), 'date');

        $this->assertCount(1, $merged);
        $this->assertSame(1_000_000.0, $merged->first()->nominalDistanceKm);
    }
}
