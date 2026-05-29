<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Calcula a longitude eclíptica geocêntrica do Sol em um dado instante UTC.
 *
 * Baseado no algoritmo de baixa precisão de Meeus, "Astronomical Algorithms" (capítulo 25).
 * Precisão: cerca de 0,01° — mais que suficiente para um indicador visual de direção no radar.
 *
 * O eixo angular do radar é o mesmo referencial eclíptico XY que o Horizons usa para vetores.
 * Portanto, esta longitude mapeia diretamente para a direção em que o Sol aparece no canvas:
 * componente X = cos(λ), componente Y = sin(λ).
 */
final class SunDirectionCalculator
{
    /**
     * Retorna a direção do Sol no plano eclíptico para o instante informado.
     *
     * @return array{
     *   longitudeDeg: float,
     *   x: float,
     *   y: float,
     *   timestamp: string,
     * }
     */
    public static function eclipticDirectionAt(CarbonImmutable $instant): array
    {
        $jd  = self::julianDay($instant);
        $T   = ($jd - 2451545.0) / 36525.0;

        // Longitude média do Sol e anomalia média (graus, J2000.0)
        $L0 = self::normalizeDeg(280.46646 + 36000.76983 * $T + 0.0003032 * $T * $T);
        $M  = self::normalizeDeg(357.52911 + 35999.05029 * $T - 0.0001537 * $T * $T);

        $Mrad = deg2rad($M);

        // Equação do centro: corrige a órbita elíptica em relação à circular
        $C = (1.914602 - 0.004817 * $T - 0.000014 * $T * $T) * sin($Mrad)
            + (0.019993 - 0.000101 * $T) * sin(2 * $Mrad)
            + 0.000289 * sin(3 * $Mrad);

        $trueLongitude = self::normalizeDeg($L0 + $C);
        $lambdaRad     = deg2rad($trueLongitude);

        return [
            'longitudeDeg' => $trueLongitude,
            'x'            => cos($lambdaRad),
            'y'            => sin($lambdaRad),
            'timestamp'    => $instant->toIso8601String(),
        ];
    }

    /**
     * Converte um instante UTC para Dia Juliano (JD).
     * A parte fracionária do dia carrega a hora com precisão de segundo.
     */
    private static function julianDay(CarbonImmutable $instant): float
    {
        $instantUtc = $instant->utc();
        $year       = (int) $instantUtc->year;
        $month      = (int) $instantUtc->month;
        $day        = $instantUtc->day
            + ($instantUtc->hour + ($instantUtc->minute + $instantUtc->second / 60.0) / 60.0) / 24.0;

        // Janeiro e fevereiro são tratados como meses 13 e 14 do ano anterior (convenção astronômica)
        if ($month <= 2) {
            $year  -= 1;
            $month += 12;
        }

        $A = (int) floor($year / 100);
        $B = 2 - $A + (int) floor($A / 4);

        return floor(365.25 * ($year + 4716))
            + floor(30.6001 * ($month + 1))
            + $day + $B - 1524.5;
    }

    /**
     * Normaliza um ângulo em graus para o intervalo [0°, 360°).
     */
    private static function normalizeDeg(float $deg): float
    {
        $value = fmod($deg, 360.0);

        return $value < 0 ? $value + 360.0 : $value;
    }
}
