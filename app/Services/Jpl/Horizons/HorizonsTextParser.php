<?php

namespace App\Services\Jpl\Horizons;

use App\DTOs\Jpl\Horizons\HorizonsOrbitalElementsData;
use App\DTOs\Jpl\Horizons\HorizonsVectorPointData;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;

/**
 * Interpreta a saída em texto da API JPL Horizons.
 *
 * Responsabilidades:
 *   - Detectar a presença de dados de efeméride (sentinelas $$SOE/$$EOE).
 *   - Extrair pontos de vetor de estado do bloco de dados tabulares.
 *   - Extrair elementos orbitais osculadores do cabeçalho da resposta.
 */
final class HorizonsTextParser
{
    /**
     * Índices das colunas CSV dentro do bloco $$SOE..$$EOE.
     *
     * Formato Horizons VEC_TABLE=3, CSV_FORMAT=YES, VEC_LABELS=NO:
     *   col 0: Julian Date
     *   col 1: timestamp calendário ("A.D. YYYY-Mon-DD HH:MM:SS.ffff")
     *   col 2: X  (km)
     *   col 3: Y  (km)
     *   col 4: Z  (km)
     *   col 5: VX (km/s)
     *   col 6: VY (km/s)
     *   col 7: VZ (km/s)
     *   col 8: LT (light-time, min) — não utilizado
     *   col 9: RG (range, km)
     *   col 10: RR (range-rate, km/s)
     */
    private const COL_TIMESTAMP   = 1;
    private const COL_X           = 2;
    private const COL_Y           = 3;
    private const COL_Z           = 4;
    private const COL_VX          = 5;
    private const COL_VY          = 6;
    private const COL_VZ          = 7;
    private const COL_RANGE_KM    = 9;
    private const COL_RANGE_RATE  = 10;
    private const MIN_COLUMNS     = 5;

    /**
     * Verifica se a resposta contém um bloco de efemérides válido.
     *
     * A API Horizons delimita o bloco de dados com $$SOE (Start Of Ephemeris)
     * e $$EOE (End Of Ephemeris). Sem ambos, a resposta não é utilizável.
     */
    public function hasEphemeris(string $content): bool
    {
        return str_contains($content, '$$SOE') && str_contains($content, '$$EOE');
    }

    /**
     * Extrai a lista de pontos de vetor de estado do bloco $$SOE..$$EOE.
     *
     * Linhas com menos de MIN_COLUMNS campos ou com X/Y/Z não numéricos são ignoradas.
     * A distância é derivada de RG (range) quando disponível; caso contrário, usa a
     * norma euclidiana de (X, Y, Z).
     *
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
            if (count($columns) < self::MIN_COLUMNS) {
                continue;
            }

            $x = $this->floatOrNull($columns[self::COL_X] ?? null);
            $y = $this->floatOrNull($columns[self::COL_Y] ?? null);
            $z = $this->floatOrNull($columns[self::COL_Z] ?? null);

            if ($x === null || $y === null || $z === null) {
                continue;
            }

            $rangeKm      = $this->floatOrNull($columns[self::COL_RANGE_KM] ?? null);
            $rangeRateKmS = $this->floatOrNull($columns[self::COL_RANGE_RATE] ?? null);
            $euclideanKm  = sqrt($x ** 2 + $y ** 2 + $z ** 2);
            $distanceKm   = $rangeKm ?? $euclideanKm;

            // Sanity check: geocentric distance > 750 M km (≈ 5 AU) is physically impossible for
            // any inner-system object (Eros aphelion ≈ 1.78 AU + Earth ≈ 1 AU ≈ 418 M km max).
            // Log when this happens so we can inspect the raw Horizons response.
            if ($distanceKm > 750_000_000) {
                \Illuminate\Support\Facades\Log::warning('[HorizonsTextParser] distância geocêntrica suspeita', [
                    'distanceKm'  => $distanceKm,
                    'rangeKm'     => $rangeKm,
                    'euclideanKm' => $euclideanKm,
                    'x' => $x, 'y' => $y, 'z' => $z,
                    'raw_line'    => $line,
                ]);
            }

            $points[] = new HorizonsVectorPointData(
                timestamp:    $this->normalizeTimestamp($columns[self::COL_TIMESTAMP] ?? $columns[0] ?? null),
                x:            $x,
                y:            $y,
                z:            $z,
                vx:           $this->floatOrNull($columns[self::COL_VX] ?? null),
                vy:           $this->floatOrNull($columns[self::COL_VY] ?? null),
                vz:           $this->floatOrNull($columns[self::COL_VZ] ?? null),
                rangeKm:      $rangeKm,
                rangeRateKmS: $rangeRateKmS,
                distanceKm:   $distanceKm,
                distanceLunar: $distanceKm / DistancePresenter::LUNAR_DISTANCE_KM,
            );
        }

        return $points;
    }

    /**
     * Extrai os elementos orbitais osculadores heliocentricos do cabeçalho da resposta.
     *
     * O Horizons imprime esses campos antes do bloco $$SOE, permitindo ao frontend
     * reconstruir a elipse completa do objeto ao redor do Sol sem chamadas extras.
     *
     * Retorna null quando EC, QR ou IN estão ausentes, pois sem eles a forma da
     * órbita não pode ser determinada. OM, W, TP e EPOCH têm padrão 0.0.
     */
    public function parseOrbitalElements(string $content): ?HorizonsOrbitalElementsData
    {
        $ec    = $this->grabFloat('EC', $content);
        $qr    = $this->grabFloat('QR', $content);
        $in    = $this->grabFloat('IN', $content);
        $om    = $this->grabFloat('OM', $content);
        $w     = $this->grabFloat('W', $content);
        $tp    = $this->grabFloat('TP', $content);
        $epoch = $this->grabFloat('EPOCH', $content);

        if ($ec === null || $qr === null || $in === null) {
            return null;
        }

        return new HorizonsOrbitalElementsData(
            ec:      $ec,
            qrAu:    $qr,
            inDeg:   $in,
            omDeg:   $om ?? 0.0,
            wDeg:    $w  ?? 0.0,
            tpJd:    $tp ?? 0.0,
            epochJd: $epoch ?? 0.0,
        );
    }

    // =========================================================================
    // Helpers privados
    // =========================================================================

    /**
     * Extrai um valor float de um campo nomeado no formato "NOME= valor" do cabeçalho Horizons.
     *
     * Aceita decimais iniciados por ponto (ex.: ".503" em vez de "0.503"),
     * notação científica e sinal explícito.
     */
    private function grabFloat(string $name, string $content): ?float
    {
        if (preg_match('/\b'.preg_quote($name, '/').'=\s*([-+]?\.?\d[\d.eE+-]*)/', $content, $m) !== 1) {
            return null;
        }

        return is_numeric($m[1]) ? (float) $m[1] : null;
    }

    /**
     * Converte o timestamp do formato Horizons ("A.D. YYYY-Mon-DD HH:MM:SS.ffff") para ISO-8601.
     *
     * Se o parse falhar (formato desconhecido), retorna a string limpa como fallback.
     */
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
