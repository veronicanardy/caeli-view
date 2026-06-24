<?php

namespace Tests\Unit;

use App\Support\Approaches\UpcomingDisplayCut;
use Tests\TestCase;

/**
 * Responsabilidade: garantir que o corte de exibição do modo "Próximas aproximações"
 * trate cometas com limite mais generoso que asteroides, mantendo o critério do JPL/Eyes
 * para asteroides e o benefício da dúvida para objetos sem distância conhecida.
 */
class UpcomingDisplayCutTest extends TestCase
{
    private const AU_KM = UpcomingDisplayCut::ASTRONOMICAL_UNIT_KM;

    public function test_asteroide_usa_corte_de_close_approach_do_jpl(): void
    {
        $this->assertSame(
            UpcomingDisplayCut::ASTEROID_DIST_AU * self::AU_KM,
            UpcomingDisplayCut::limitKmFor('asteroid'),
        );
    }

    public function test_cometa_usa_corte_mais_generoso_que_asteroide(): void
    {
        $this->assertGreaterThan(
            UpcomingDisplayCut::limitKmFor('asteroid'),
            UpcomingDisplayCut::limitKmFor('comet'),
        );
    }

    public function test_tipo_desconhecido_cai_no_corte_conservador_de_asteroide(): void
    {
        $this->assertSame(
            UpcomingDisplayCut::limitKmFor('asteroid'),
            UpcomingDisplayCut::limitKmFor(null),
        );
        $this->assertSame(
            UpcomingDisplayCut::limitKmFor('asteroid'),
            UpcomingDisplayCut::limitKmFor('other'),
        );
    }

    public function test_cometa_a_0_167_ua_passa_mas_seria_cortado_como_asteroide(): void
    {
        // 169P/NEAT em 2026: aproximação real a ~0,167 UA.
        $distanciaKm = 0.167 * self::AU_KM;

        $this->assertTrue(UpcomingDisplayCut::passes('comet', $distanciaKm));
        $this->assertFalse(UpcomingDisplayCut::passes('asteroid', $distanciaKm));
    }

    public function test_cometa_muito_distante_e_cortado(): void
    {
        // 11P/Tempel-Swift-LINEAR em 2026: ~0,401 UA, além do limite de cometa.
        $distanciaKm = 0.401 * self::AU_KM;

        $this->assertFalse(UpcomingDisplayCut::passes('comet', $distanciaKm));
    }

    public function test_objeto_sem_distancia_conhecida_entra(): void
    {
        $this->assertTrue(UpcomingDisplayCut::passes('asteroid', null));
        $this->assertTrue(UpcomingDisplayCut::passes('comet', 'sem-valor'));
    }
}
