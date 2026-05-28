<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Computes the geocentric ecliptic longitude of the Sun at a given UTC instant.
 *
 * Based on the low-precision algorithm from Meeus, "Astronomical Algorithms" (chapter 25).
 * Accuracy: about 0.01°, comfortably enough for a visual direction indicator on the radar.
 *
 * The radar's angular axis is the same ecliptic XY frame Horizons returns vectors in. So this
 * longitude maps directly to the direction in which the user should look for the Sun on the
 * canvas — using cos(λ) for the X component and sin(λ) for Y.
 */
final class SunDirectionCalculator
{
    /**
     * @return array{
     *   longitudeDeg: float,
     *   x: float,
     *   y: float,
     *   timestamp: string,
     * }
     */
    public static function eclipticDirectionAt(CarbonImmutable $instant): array
    {
        $jd = self::julianDay($instant);
        $T = ($jd - 2451545.0) / 36525.0;

        $L0 = self::normalizeDeg(280.46646 + 36000.76983 * $T + 0.0003032 * $T * $T);
        $M = self::normalizeDeg(357.52911 + 35999.05029 * $T - 0.0001537 * $T * $T);
        $Mrad = deg2rad($M);

        $C = (1.914602 - 0.004817 * $T - 0.000014 * $T * $T) * sin($Mrad)
            + (0.019993 - 0.000101 * $T) * sin(2 * $Mrad)
            + 0.000289 * sin(3 * $Mrad);

        $trueLongitude = self::normalizeDeg($L0 + $C);
        $lambdaRad = deg2rad($trueLongitude);

        return [
            'longitudeDeg' => $trueLongitude,
            'x' => cos($lambdaRad),
            'y' => sin($lambdaRad),
            'timestamp' => $instant->toIso8601String(),
        ];
    }

    private static function julianDay(CarbonImmutable $instant): float
    {
        $instantUtc = $instant->utc();
        $year = (int) $instantUtc->year;
        $month = (int) $instantUtc->month;
        $day = $instantUtc->day
            + ($instantUtc->hour + ($instantUtc->minute + $instantUtc->second / 60.0) / 60.0) / 24.0;

        if ($month <= 2) {
            $year -= 1;
            $month += 12;
        }

        $A = (int) floor($year / 100);
        $B = 2 - $A + (int) floor($A / 4);

        return floor(365.25 * ($year + 4716))
            + floor(30.6001 * ($month + 1))
            + $day + $B - 1524.5;
    }

    private static function normalizeDeg(float $deg): float
    {
        $value = fmod($deg, 360.0);
        return $value < 0 ? $value + 360.0 : $value;
    }
}
