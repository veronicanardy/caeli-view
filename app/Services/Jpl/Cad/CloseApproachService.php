<?php

namespace App\Services\Jpl\Cad;

use App\DTOs\Jpl\CloseApproachData;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use App\Services\Jpl\JplHttpClient;

/**
 * Orquestra a busca de aproximações próximas à Terra via API CAD do JPL.
 *
 * Responsabilidades deste service:
 *   - Receber filtros externos, normalizá-los e gerenciar o cache do resultado.
 *   - Delegar a montagem da query a CadQueryBuilder.
 *   - Converter a resposta bruta em uma coleção de CloseApproachData.
 *   - Delegar cálculos analíticos (summary e charts) a CloseApproachAnalytics.
 */
final class CloseApproachService
{
    public function __construct(
        private readonly JplHttpClient $client,
        private readonly CadQueryBuilder $queryBuilder,
        private readonly CloseApproachAnalytics $analytics,
    ) {
    }

    /**
     * Busca as aproximações que satisfazem os filtros informados.
     *
     * O resultado completo (aproximações + resumo + gráficos) é cacheado pelo TTL
     * configurado em services.jpl.cad_cache_ttl (padrão: 6 horas).
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function search(array $filters): array
    {
        $normalized = $this->queryBuilder->normalize($filters);
        $key = 'jpl:cad:'.md5(json_encode($normalized, JSON_THROW_ON_ERROR));

        return Cache::remember($key, (int) config('services.jpl.cad_cache_ttl', 21600), function () use ($normalized) {
            $query = $this->queryBuilder->build($normalized);
            $response = $this->client->get('/cad.api', $query);
            $approaches = $this->parseApproaches($response, $normalized);

            return [
                'approaches' => $approaches->map->toArray()->values()->all(),
                'summary'    => $this->analytics->summary($approaches),
                'charts'     => $this->analytics->charts($approaches),
                'filters'    => $normalized,
                'source'     => 'NASA/JPL SBDB Close Approach Data API',
                'query'      => $query,
            ];
        });
    }

    /**
     * Retorna os filtros padrão usados quando o usuário não informa nenhum parâmetro.
     *
     * @return array<string, mixed>
     */
    public function defaultFilters(): array
    {
        return $this->queryBuilder->defaultFilters();
    }

    // =========================================================================
    // Parsing interno
    // =========================================================================

    /**
     * Converte os campos e registros brutos da resposta CAD em uma coleção tipada.
     *
     * Registros inválidos (não-array) e aproximações sem designação são descartados.
     *
     * @param  array<string, mixed>  $response   resposta decodificada da API CAD
     * @param  array<string, mixed>  $filters    filtros normalizados (usado para forçar o tipo do objeto)
     * @return Collection<int, CloseApproachData>
     */
    private function parseApproaches(array $response, array $filters): Collection
    {
        $fields = $response['fields'] ?? [];
        $records = $response['data'] ?? [];

        if (! is_array($fields) || ! is_array($records)) {
            return collect();
        }

        $forcedType = match ($filters['type']) {
            'asteroid' => 'asteroid',
            'comet'    => 'comet',
            default    => null,
        };

        return collect($records)
            ->filter(fn (mixed $record) => is_array($record))
            ->map(fn (array $record) => CloseApproachData::fromCadRecord($fields, $record, 'Earth', $forcedType))
            ->filter(fn (CloseApproachData $approach) => $approach->designation !== '')
            ->values();
    }
}
