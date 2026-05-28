<?php

namespace App\Services\Jpl;

use App\DTOs\Jpl\Horizons\HorizonsOrbitalElementsData;
use App\DTOs\Jpl\Horizons\HorizonsVectorPointData;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;

final class HorizonsTextParser
{
    public function hasEphemeris(string $content): bool
    {
        return str_contains($content, '$$SOE') && str_contains($content, '$$EOE');
    }

    /**
     * @return array<int, HorizonsVectorPointData>
     */
    public function parseVectorPoints(string $result): array
    {
        if (! $this->hasEphemeris($result)) {
            return [];
        }

        $table = trim(str($result)->between('$$SOE', '$$EOE')->toString());
        $points = [];

        foreach (preg_split('/\R/', $table) ?: [] as $line) {
            $columns = array_map('trim', str_getcsv(trim($line)));
            if (count($columns) < 5) {
                continue;
            }

            $x = $this->floatOrNull($columns[2] ?? null);
            $y = $this->floatOrNull($columns[3] ?? null);
            $z = $this->floatOrNull($columns[4] ?? null);
            $vx = $this->floatOrNull($columns[5] ?? null);
            $vy = $this->floatOrNull($columns[6] ?? null);
            $vz = $this->floatOrNull($columns[7] ?? null);
            $rangeKm = $this->floatOrNull($columns[9] ?? null);
            $rangeRateKmS = $this->floatOrNull($columns[10] ?? null);
            if ($x === null || $y === null || $z === null) {
                continue;
            }

            $distanceKm = $rangeKm ?? sqrt($x ** 2 + $y ** 2 + $z ** 2);
            $points[] = new HorizonsVectorPointData(
                timestamp: $this->normalizeTimestamp($columns[1] ?? $columns[0] ?? null),
                x: $x,
                y: $y,
                z: $z,
                vx: $vx,
                vy: $vy,
                vz: $vz,
                rangeKm: $rangeKm,
                rangeRateKmS: $rangeRateKmS,
                distanceKm: $distanceKm,
                distanceLunar: $distanceKm / DistancePresenter::LUNAR_DISTANCE_KM,
            );
        }

        return $points;
    }

    /**
     * Parses the osculating orbital elements Horizons prints in the VECTORS header. These let the
     * frontend reconstruct the object's full heliocentric ellipse without any extra API call.
     */
    public function parseOrbitalElements(string $content): ?HorizonsOrbitalElementsData
    {
        $grab = static function (string $name) use ($content): ?float {
            if (preg_match('/\b'.preg_quote($name, '/').'=\s*([-+]?\.?\d[\d.eE+-]*)/', $content, $m) === 1) {
                return is_numeric($m[1]) ? (float) $m[1] : null;
            }

            return null;
        };

        $ec = $grab('EC');
        $qr = $grab('QR');
        $in = $grab('IN');
        $om = $grab('OM');
        $w = $grab('W');
        $tp = $grab('TP');
        $epoch = $grab('EPOCH');

        if ($ec === null || $qr === null || $in === null) {
            return null;
        }

        return new HorizonsOrbitalElementsData(
            ec: $ec,
            qrAu: $qr,
            inDeg: $in,
            omDeg: $om ?? 0.0,
            wDeg: $w ?? 0.0,
            tpJd: $tp ?? 0.0,
            epochJd: $epoch ?? 0.0,
        );
    }

    private function normalizeTimestamp(?string $value): string
    {
        $clean = trim((string) $value);
        $clean = preg_replace('/^A\.D\.\s*/', '', $clean) ?? $clean;

        try {
            return CarbonImmutable::parse($clean, 'UTC')->toIso8601String();
        } catch (\Throwable) {
            return $clean;
        }
    }

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
