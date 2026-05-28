<?php

namespace Tests\Unit;

use App\Services\Jpl\HorizonsTrajectoryService;
use ReflectionMethod;
use Tests\Fixtures\JplResponses;
use Tests\TestCase;

/**
 * Covers the Horizons text parsers (vector table + osculating-elements header) via reflection.
 *
 * Today these are private methods on HorizonsTrajectoryService; Etapa 7 of the refactor pulls them
 * into a dedicated HorizonsTextParser class. Until then, reflection is the honest way to cover the
 * parsing surface in isolation — keeping the refactor of HorizonsTrajectoryService safe.
 */
class HorizonsParserTest extends TestCase
{
    private function invoke(string $method, mixed ...$args): mixed
    {
        $service = $this->app->make(HorizonsTrajectoryService::class);
        $reflection = new ReflectionMethod(HorizonsTrajectoryService::class, $method);
        $reflection->setAccessible(true);

        return $reflection->invoke($service, ...$args);
    }

    public function test_has_ephemeris_detects_both_sentinels(): void
    {
        $this->assertTrue($this->invoke('hasEphemeris', JplResponses::horizonsVectorsText()));
    }

    public function test_has_ephemeris_returns_false_when_either_sentinel_is_missing(): void
    {
        $this->assertFalse($this->invoke('hasEphemeris', '$$SOE only, no closing sentinel'));
        $this->assertFalse($this->invoke('hasEphemeris', 'no opening sentinel $$EOE'));
        $this->assertFalse($this->invoke('hasEphemeris', ''));
    }

    public function test_parse_vector_points_extracts_position_velocity_and_range(): void
    {
        $points = $this->invoke('parseVectorPoints', JplResponses::horizonsVectorsText());

        $this->assertIsArray($points);
        $this->assertCount(5, $points);

        $middle = $points[2];
        $this->assertSame(800000.0, $middle['x']);
        $this->assertSame(0.0, $middle['y']);
        $this->assertSame(4000.0, $middle['z']);
        $this->assertSame(800010.0, $middle['rangeKm']);
        $this->assertSame(0.0, $middle['rangeRateKmS']);
        // distanceLunar must be derived consistently from distanceKm / lunar distance constant.
        $this->assertEqualsWithDelta($middle['distanceKm'] / 384_400.0, $middle['distanceLunar'], 1e-9);
        // Timestamp must be normalised to ISO-8601.
        $this->assertStringContainsString('2026-05-20T12:00:00', $middle['timestamp']);
    }

    public function test_parse_vector_points_falls_back_to_euclidean_norm_when_range_column_is_missing(): void
    {
        $text = <<<'TEXT'
$$SOE
2460000.000000000, A.D. 2026-May-19 12:00:00.0000, 3.0, 4.0, 0.0
$$EOE
TEXT;
        $points = $this->invoke('parseVectorPoints', $text);

        $this->assertCount(1, $points);
        $this->assertSame(5.0, $points[0]['distanceKm']);
        $this->assertNull($points[0]['rangeKm']);
        $this->assertNull($points[0]['vx']);
    }

    public function test_parse_vector_points_skips_malformed_rows(): void
    {
        $text = <<<'TEXT'
$$SOE
2460000.000000000, A.D. 2026-May-19 12:00:00.0000, 100.0, 200.0, 50.0
incomplete, row, with, only, four
2460001.000000000, A.D. 2026-May-20 00:00:00.0000, not_a_number, foo, bar
2460002.000000000, A.D. 2026-May-20 12:00:00.0000, 400.0, 500.0, 60.0
$$EOE
TEXT;
        $points = $this->invoke('parseVectorPoints', $text);

        $this->assertCount(2, $points, 'Malformed rows must be dropped silently.');
        $this->assertSame(100.0, $points[0]['x']);
        $this->assertSame(400.0, $points[1]['x']);
    }

    public function test_parse_vector_points_returns_empty_array_when_sentinels_missing(): void
    {
        $this->assertSame([], $this->invoke('parseVectorPoints', 'no sentinels here'));
    }

    public function test_parse_orbital_elements_reads_full_header(): void
    {
        $elements = $this->invoke('parseOrbitalElements', JplResponses::horizonsVectorsWithElementsText());

        $this->assertIsArray($elements);
        $this->assertEqualsWithDelta(0.1911807, $elements['ec'], 1e-9);
        $this->assertEqualsWithDelta(0.7461292, $elements['qrAu'], 1e-9);
        $this->assertEqualsWithDelta(3.331426, $elements['inDeg'], 1e-9);
        $this->assertEqualsWithDelta(204.06, $elements['omDeg'], 1e-9);
        $this->assertEqualsWithDelta(126.39482, $elements['wDeg'], 1e-9);
        $this->assertEqualsWithDelta(2461206.39521, $elements['tpJd'], 1e-9);
        $this->assertEqualsWithDelta(2461184.5, $elements['epochJd'], 1e-9);
    }

    public function test_parse_orbital_elements_returns_null_when_shape_defining_fields_missing(): void
    {
        // No EC/QR/IN — must refuse rather than return partial data.
        $headerMissingShape = <<<'TEXT'
 EPOCH=  2461184.5
  OM= 204.06 W=  126.39482
$$SOE
junk
$$EOE
TEXT;
        $this->assertNull($this->invoke('parseOrbitalElements', $headerMissingShape));
    }

    public function test_parse_orbital_elements_defaults_optional_angles_to_zero(): void
    {
        // EC/QR/IN present but OM/W/TP absent — parser must default angles to 0 (orbit shape is
        // still drawable, but the helper that propagates Kepler will refuse without tpJd).
        $minimal = <<<'TEXT'
  EC= .1 QR= 1.0 IN= 5.0
$$SOE
junk
$$EOE
TEXT;
        $elements = $this->invoke('parseOrbitalElements', $minimal);

        $this->assertIsArray($elements);
        $this->assertSame(0.0, $elements['omDeg']);
        $this->assertSame(0.0, $elements['wDeg']);
        $this->assertSame(0.0, $elements['tpJd']);
        $this->assertSame(0.0, $elements['epochJd']);
    }

    public function test_parse_orbital_elements_accepts_leading_dot_decimals(): void
    {
        // Horizons sometimes prints ".503" instead of "0.503" — the regex must match either.
        $compact = <<<'TEXT'
 EC= .503 QR= .993 IN= 2.529
$$SOE
junk
$$EOE
TEXT;
        $elements = $this->invoke('parseOrbitalElements', $compact);

        $this->assertNotNull($elements);
        $this->assertEqualsWithDelta(0.503, $elements['ec'], 1e-9);
        $this->assertEqualsWithDelta(0.993, $elements['qrAu'], 1e-9);
    }
}
