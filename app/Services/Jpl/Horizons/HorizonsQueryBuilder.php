<?php

namespace App\Services\Jpl\Horizons;

/**
 * Monta os parâmetros de query para a API Horizons do JPL.
 *
 * Centraliza o formato de cada campo e a sanitização de valores,
 * separando essa responsabilidade do transporte HTTP.
 */
final class HorizonsQueryBuilder
{
    /**
     * Monta os parâmetros para uma consulta de vetores de estado (ephemeris type VECTORS).
     *
     * Centro fixo em '500@399' (superfície da Terra geocêntrica), plano eclíptico,
     * unidades km/s, saída em CSV sem rótulos de coluna.
     *
     * @return array<string, string>
     */
    public function vectorQuery(
        string $command,
        string $startTime,
        string $stopTime,
        string $stepSize,
        string $objectData,
    ): array {
        return [
            'format'     => 'text',
            'COMMAND'    => $this->quote($command),
            'OBJ_DATA'   => $this->quote($objectData),
            'MAKE_EPHEM' => $this->quote('YES'),
            'EPHEM_TYPE' => $this->quote('VECTORS'),
            'CENTER'     => $this->quote('500@399'),
            'START_TIME' => $this->quote($startTime),
            'STOP_TIME'  => $this->quote($stopTime),
            'STEP_SIZE'  => $this->quote($stepSize),
            'VEC_TABLE'  => $this->quote('3'),
            'CSV_FORMAT' => $this->quote('YES'),
            'VEC_LABELS' => $this->quote('NO'),
            'REF_PLANE'  => $this->quote('ECLIPTIC'),
            'OUT_UNITS'  => $this->quote('KM-S'),
        ];
    }

    /**
     * Encapsula o valor em aspas simples e remove aspas internas,
     * conforme exigido pelo formato de parâmetros da API Horizons.
     */
    private function quote(string $value): string
    {
        return "'".str_replace("'", '', $value)."'";
    }
}
