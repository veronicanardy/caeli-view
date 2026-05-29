<?php

namespace App\Services\Approaches;

use Carbon\CarbonImmutable;

/**
 * Responsável por definir e normalizar os filtros de busca de aproximações.
 *
 * Centraliza os valores padrão e garante que todos os filtros recebidos
 * sejam convertidos para os tipos corretos antes de serem usados nas queries.
 */
final class ApproachFilterNormalizer
{
    /**
     * Retorna os filtros padrão para o observatório.
     * Por padrão, busca aproximações de hoje com distância máxima de 0,2 UA.
     */
    public function defaults(): array
    {
        $today = CarbonImmutable::today();

        return [
            'date_min'      => $today->toDateString(),
            'date_max'      => $today->toDateString(),
            'type'          => 'all',
            'dist_max'      => '0.2',
            'sort'          => 'dist',
            'distance_unit' => 'km',
        ];
    }

    /**
     * Mescla os filtros recebidos com os padrões e normaliza os tipos.
     * Qualquer chave ausente no array de entrada é preenchida com o valor padrão.
     */
    public function normalize(array $filters): array
    {
        $defaults = $this->defaults();

        return [
            'date_min'      => (string) ($filters['date_min']      ?? $defaults['date_min']),
            'date_max'      => (string) ($filters['date_max']      ?? $defaults['date_max']),
            'type'          => (string) ($filters['type']          ?? $defaults['type']),
            'dist_max'      => (string) ($filters['dist_max']      ?? $defaults['dist_max']),
            'sort'          => (string) ($filters['sort']          ?? $defaults['sort']),
            'distance_unit' => (string) ($filters['distance_unit'] ?? $defaults['distance_unit']),
        ];
    }
}
