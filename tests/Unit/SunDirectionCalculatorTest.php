<?php

namespace Tests\Unit;

use App\Support\SunDirectionCalculator;
use Carbon\CarbonImmutable;
use Tests\TestCase;

/**
 * Scientific sanity checks for the geocentric Sun direction. The radar uses this vector as the
 * synchronous fallback for the directional light (before astronomy-engine resolves), so a bad
 * direction would light the wrong hemisphere on first paint.
 *
 * Reference values come from JPL Horizons (CENTER='500@399', REF_PLANE='ECLIPTIC', SUN body) at
 * the listed instants. Tolerances are loose enough to accommodate the Meeus low-precision
 * algorithm's ~0.01° error budget while still catching real regressions.
 */
class SunDirectionCalculatorTest extends TestCase
{
    public function test_it_returns_a_unit_vector_in_the_ecliptic_plane(): void
    {
        $now = CarbonImmutable::create(2026, 5, 28, 12, 0, 0, 'UTC');
        $result = SunDirectionCalculator::eclipticDirectionAt($now);

        $magnitude = sqrt($result['x'] ** 2 + $result['y'] ** 2);
        $this->assertEqualsWithDelta(1.0, $magnitude, 1e-9, 'Sun direction must be a unit vector.');
    }

    public function test_vernal_equinox_sun_longitude_is_near_zero(): void
    {
        // March equinox 2026 is around 14:46 UTC on the 20th. At that instant the Sun crosses
        // ecliptic longitude 0°, so the (x, y) direction should be very close to (1, 0).
        $equinox = CarbonImmutable::create(2026, 3, 20, 14, 46, 0, 'UTC');
        $result = SunDirectionCalculator::eclipticDirectionAt($equinox);

        // Longitude should be within ~0.5° of 0 or 360; check via x ~ 1.
        $this->assertGreaterThan(0.9999, $result['x']);
        $this->assertEqualsWithDelta(0.0, $result['y'], 0.01);
    }

    public function test_june_solstice_sun_longitude_is_near_90_degrees(): void
    {
        // June solstice 2026 is around 08:24 UTC on the 21st. At that instant ecliptic
        // longitude ≈ 90°, so direction is (~0, ~1).
        $solstice = CarbonImmutable::create(2026, 6, 21, 8, 24, 0, 'UTC');
        $result = SunDirectionCalculator::eclipticDirectionAt($solstice);

        $this->assertEqualsWithDelta(90.0, $result['longitudeDeg'], 0.1);
        $this->assertEqualsWithDelta(0.0, $result['x'], 0.01);
        $this->assertGreaterThan(0.9999, $result['y']);
    }

    public function test_longitude_advances_about_one_degree_per_day(): void
    {
        // The Sun's apparent ecliptic longitude advances ~0.9856°/day on average. Two arbitrary
        // days apart should differ by ~0.99° ± 0.05° (varies with Earth's orbital eccentricity).
        $day0 = CarbonImmutable::create(2026, 5, 28, 0, 0, 0, 'UTC');
        $day1 = $day0->addDay();

        $a = SunDirectionCalculator::eclipticDirectionAt($day0);
        $b = SunDirectionCalculator::eclipticDirectionAt($day1);

        $delta = $b['longitudeDeg'] - $a['longitudeDeg'];
        $this->assertEqualsWithDelta(0.9856, $delta, 0.05);
    }

    public function test_full_year_returns_to_starting_longitude(): void
    {
        // After one tropical year (~365.2422 days) the Sun returns to the same ecliptic longitude.
        // We check a calendar year (365 days) and allow ~1° slack for the missing 0.2422 days.
        $start = CarbonImmutable::create(2025, 5, 28, 12, 0, 0, 'UTC');
        $end = $start->addDays(365);

        $a = SunDirectionCalculator::eclipticDirectionAt($start);
        $b = SunDirectionCalculator::eclipticDirectionAt($end);

        // Allow wrap-around: the difference should be near 0° or 360°.
        $diff = abs($b['longitudeDeg'] - $a['longitudeDeg']);
        $wrappedDiff = min($diff, 360.0 - $diff);
        $this->assertLessThan(1.5, $wrappedDiff, '365-day delta should leave longitude within ~1° of start.');
    }
}
