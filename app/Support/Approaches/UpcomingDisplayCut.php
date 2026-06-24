<?php

namespace App\Support\Approaches;

/**
 * Decide o corte de distância de EXIBIÇÃO do modo "Próximas aproximações" por tipo de objeto.
 *
 * Asteroides e cometas não compartilham a mesma escala de proximidade: asteroides próximos da
 * Terra passam regularmente a frações de distância lunar, enquanto cometas raramente chegam perto.
 * Um corte único (o de asteroide) esconderia praticamente todo cometa em aproximação. Por isso o
 * cometa recebe um limite mais generoso, mantendo a lista honesta sem inflá-la.
 *
 * O valor é usado sobre a distância já corrigida pelo merger (JPL quando o objeto existe no CAD).
 */
final class UpcomingDisplayCut
{
    /** 1 UA em km. */
    public const ASTRONOMICAL_UNIT_KM = 149_597_870.7;

    /**
     * Corte para asteroides, em UA. Mesmo critério de close-approach do JPL/NASA Eyes:
     * 0,05 UA (~7,5 milhões de km, ~19,5 distâncias lunares).
     */
    public const ASTEROID_DIST_AU = 0.05;

    /**
     * Corte para cometas, em UA. Mais generoso porque cometas não passam tão perto:
     * 0,25 UA (~37 milhões de km, ~97 distâncias lunares). Inclui aproximações notáveis
     * como 169P/NEAT (0,167 UA) sem aceitar passagens muito distantes (ex: 0,4 UA).
     */
    public const COMET_DIST_AU = 0.25;

    /**
     * Retorna o corte de exibição em km para o tipo informado.
     * Qualquer tipo que não seja 'comet' usa o corte de asteroide (default conservador).
     */
    public static function limitKmFor(?string $objectType): float
    {
        $au = $objectType === 'comet' ? self::COMET_DIST_AU : self::ASTEROID_DIST_AU;

        return $au * self::ASTRONOMICAL_UNIT_KM;
    }

    /**
     * Decide se um objeto entra na lista de exibição do upcoming.
     * Objetos sem distância numérica conhecida ficam (benefício da dúvida).
     */
    public static function passes(?string $objectType, mixed $nominalDistanceKm): bool
    {
        if (! is_numeric($nominalDistanceKm)) {
            return true;
        }

        return (float) $nominalDistanceKm <= self::limitKmFor($objectType);
    }
}
