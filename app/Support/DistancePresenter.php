<?php

namespace App\Support;

/**
 * Converte distâncias em quilômetros para múltiplas unidades e gera textos de contexto visual.
 *
 * Usada em todo o sistema para garantir que distâncias sejam apresentadas de forma consistente
 * ao usuário final: a Lua é a referência visual central, e as faixas de proximidade determinam
 * o texto e o tom da comparação exibida nos cards e no mapa.
 */
final class DistancePresenter
{
    /** Distância média Terra-Lua em km — referência visual principal do sistema */
    public const LUNAR_DISTANCE_KM = 384_400.0;

    private const KM_TO_MILES = 0.621371;

    /**
     * Converte uma distância em km para o payload completo de apresentação.
     * Retorna `null` em todos os campos numéricos quando a distância não está disponível,
     * mantendo o shape consistente para o frontend independentemente dos dados.
     */
    public static function fromKilometers(?float $kilometers): array
    {
        if ($kilometers === null) {
            return [
                'kilometers'         => null,
                'miles'              => null,
                'lunarDistance'      => null,
                'lunarReferenceKm'   => self::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => null,
                'proximityBand'      => 'unknown',
                'headline'           => 'Distância ainda não informada',
                'comparison'         => 'Sem dado suficiente para comparar com a Lua.',
            ];
        }

        $lunarDistance = $kilometers / self::LUNAR_DISTANCE_KM;
        $band          = self::proximityBand($lunarDistance);

        return [
            'kilometers'           => $kilometers,
            'miles'                => $kilometers * self::KM_TO_MILES,
            'lunarDistance'        => $lunarDistance,
            'lunarReferenceKm'     => self::LUNAR_DISTANCE_KM,
            // Diâmetro médio da Terra: 12.742 km
            'earthDiametersApprox' => $kilometers / 12_742.0,
            'proximityBand'        => $band,
            'headline'             => self::headline($band),
            'comparison'           => self::comparison($lunarDistance, $band),
        ];
    }

    /**
     * Classifica a distância em uma das três faixas de proximidade em relação à Lua.
     * As faixas determinam o tom do texto de comparação e a cor no mapa.
     */
    private static function proximityBand(float $lunarDistance): string
    {
        if ($lunarDistance < 1.0) {
            return 'inside_moon';   // Passou dentro da órbita média da Lua
        }

        if ($lunarDistance <= 1.5) {
            return 'near_moon';     // Passou na faixa próxima da Lua (até 1,5 LD)
        }

        return 'beyond_moon';       // Passou além da órbita média da Lua
    }

    /**
     * Título curto exibido no card de distância, baseado na faixa de proximidade.
     */
    private static function headline(string $band): string
    {
        return match ($band) {
            'inside_moon' => 'Passou dentro da órbita média da Lua',
            'near_moon'   => 'Passou próximo da faixa da Lua',
            'beyond_moon' => 'Passou além da órbita média da Lua',
            default       => 'Distância ainda não informada',
        };
    }

    /**
     * Texto de comparação em linguagem natural para o usuário, com o valor arredondado em 1 decimal.
     */
    private static function comparison(float $lunarDistance, string $band): string
    {
        $rounded = number_format($lunarDistance, 1, ',', '.');

        return match ($band) {
            'inside_moon' => "Equivale a {$rounded} vez da distância média Terra-Lua.",
            default       => "Equivale a {$rounded} distâncias lunares médias.",
        };
    }
}
