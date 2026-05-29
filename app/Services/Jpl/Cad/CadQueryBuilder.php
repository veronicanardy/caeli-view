<?php

namespace App\Services\Jpl\Cad;

use Carbon\CarbonImmutable;

/**
 * Constrói e normaliza os parâmetros de consulta para a API CAD (Close Approach Data) do JPL.
 *
 * Separa a lógica de filtros e montagem de query da orquestração do CloseApproachService,
 * tornando cada parte testável de forma independente.
 */
final class CadQueryBuilder
{
    /**
     * Filtros padrão usados quando o usuário não especifica nenhum parâmetro.
     *
     * Janela de 30 dias a partir de hoje, todos os tipos, distância máxima 0.2 AU.
     *
     * @return array<string, mixed>
     */
    public function defaultFilters(): array
    {
        $today = CarbonImmutable::today();

        return [
            'date_min' => $today->toDateString(),
            'date_max' => $today->addDays(30)->toDateString(),
            'type'     => 'all',
            'dist_max' => '0.2',
            'sort'     => 'date',
        ];
    }

    /**
     * Preenche filtros ausentes com os valores padrão e garante os tipos corretos.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function normalize(array $filters): array
    {
        $defaults = $this->defaultFilters();

        return [
            'date_min' => (string) ($filters['date_min'] ?? $defaults['date_min']),
            'date_max' => (string) ($filters['date_max'] ?? $defaults['date_max']),
            'type'     => (string) ($filters['type'] ?? 'all'),
            'dist_max' => $filters['dist_max'] ?? $defaults['dist_max'],
            'sort'     => (string) ($filters['sort'] ?? 'date'),
        ];
    }

    /**
     * Transforma os filtros normalizados nos parâmetros aceitos pela API CAD.
     *
     * @param  array<string, mixed>  $filters  filtros já normalizados via normalize()
     * @return array<string, mixed>
     */
    public function build(array $filters): array
    {
        $query = [
            'date-min'  => $filters['date_min'],
            'date-max'  => $filters['date_max'],
            'dist-max'  => $filters['dist_max'],
            'body'      => 'Earth',
            'sort'      => $filters['sort'],
            'limit'     => 100,
            'diameter'  => 'true',
            'fullname'  => 'true',
            'neo'       => 'false',
        ];

        if ($filters['type'] === 'asteroid') {
            $query['kind'] = 'a';
        }

        if ($filters['type'] === 'comet') {
            $query['kind'] = 'c';
        }

        return $query;
    }
}
