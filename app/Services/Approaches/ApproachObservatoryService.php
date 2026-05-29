<?php

namespace App\Services\Approaches;

use App\DTOs\Approaches\UnifiedApproachData;
use App\Exceptions\JplApiException;
use App\Exceptions\NasaApiException;
use App\Services\Jpl\Cad\CloseApproachService;
use App\Services\Nasa\NeoWsService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;

/**
 * Orquestrador principal do observatório de aproximações.
 *
 * Coordena o ciclo completo de uma consulta:
 *   1. Normaliza os filtros recebidos do cliente
 *   2. Verifica/popula o cache com estratégia stale-while-revalidate
 *   3. Busca dados do NeoWs e do JPL CAD em paralelo
 *   4. Delega merge, dedup, ordenação e apresentação para colaboradores especializados
 *
 * Esta classe não contém lógica de negócio — ela apenas conecta as peças.
 *
 * @see ApproachFilterNormalizer  Normalização e valores padrão dos filtros
 * @see ApproachMerger            Combinação e deduplicação das fontes
 * @see ApproachSummarizer        Estatísticas e séries para gráficos
 */
final class ApproachObservatoryService
{
    /** Fator de conversão de Unidades Astronômicas para quilômetros */
    private const ASTRONOMICAL_UNIT_KM = 149_597_870.7;

    public function __construct(
        private readonly NeoWsService            $neoWs,
        private readonly CloseApproachService    $cad,
        private readonly ApproachFilterNormalizer $filterNormalizer,
        private readonly ApproachMerger          $merger,
        private readonly ApproachSummarizer      $summarizer,
    ) {
    }

    /**
     * Retorna os filtros padrão para exibição no formulário do frontend.
     * Delega para o normalizador, que é a fonte de verdade sobre os padrões.
     */
    public function defaultFilters(): array
    {
        return $this->filterNormalizer->defaults();
    }

    /**
     * Executa uma consulta completa ao observatório e retorna o payload da página.
     *
     * Usa cache com stale-while-revalidate: o dado vencido é servido imediatamente
     * enquanto a revalidação ocorre em background, evitando latência visível ao usuário.
     */
    public function observe(array $filters): array
    {
        $normalized = $this->filterNormalizer->normalize($filters);
        $key        = 'approach-observatory:' . md5(json_encode($normalized, JSON_THROW_ON_ERROR));
        $ttl        = (int) config('services.jpl.cad_cache_ttl', 21600);

        return Cache::flexible($key, [$ttl, $ttl + 3600], fn () => $this->fetch($normalized));
    }

    /**
     * Retorna a próxima aproximação futura dentro dos filtros informados.
     *
     * Diferente de `observe()`, não inclui sumário nem gráficos — apenas o
     * primeiro evento ordenado por data. Útil para widgets e cards de destaque.
     */
    public function nextApproach(array $filters): ?array
    {
        $normalized = $this->filterNormalizer->normalize($filters);
        $key        = 'approach-observatory:next:' . md5(json_encode($normalized, JSON_THROW_ON_ERROR));
        $ttl        = (int) config('services.jpl.cad_cache_ttl', 21600);

        $result = Cache::flexible($key, [$ttl, $ttl + 3600], function () use ($normalized) {
            [$neoWsItems, $cadItems] = $this->fetchSources($normalized);

            return $this->filterByMaxDistance(
                $this->merger->merge($neoWsItems, $cadItems, 'date'),
                $normalized['dist_max'],
            )
                ->filter(fn (UnifiedApproachData $item) => isset($item->approachDate))
                ->sortBy('approachDate')
                ->first()
                ?->toArray();
        });

        return is_array($result) ? $result : null;
    }

    // -------------------------------------------------------------------------
    // Busca de dados
    // -------------------------------------------------------------------------

    /**
     * Monta o payload completo retornado por `observe()`.
     */
    private function fetch(array $normalized): array
    {
        [$neoWsItems, $cadItems, $errors] = $this->fetchSourcesWithErrors($normalized);

        $approaches = $this->filterByMaxDistance(
            $this->merger->merge($neoWsItems, $cadItems, $normalized['sort']),
            $normalized['dist_max'],
        );

        return [
            'approaches'    => $approaches->map->toArray()->values()->all(),
            'summary'       => $this->summarizer->summary($approaches),
            'charts'        => $this->summarizer->charts($approaches),
            'filters'       => $normalized,
            'source'        => 'NASA NeoWs + JPL CAD + JPL SBDB',
            'errorsBySource' => $errors,
            'lunarReference' => $this->summarizer->lunarReference(),
            'visualNote'    => $this->summarizer->visualNote(),
        ];
    }

    /**
     * Dispara NeoWs e CAD em paralelo via `Concurrency::run()`.
     * Retorna [neoWsItems, cadItems, errors], onde `errors` mapeia a fonte ao
     * texto de erro amigável para exibição no frontend.
     *
     * Se o filtro `type` for `comet`, a busca no NeoWs é omitida (ele só tem asteroides).
     */
    private function fetchSourcesWithErrors(array $normalized): array
    {
        $tasks  = [];
        $errors = [];

        if ($normalized['type'] !== 'comet') {
            $tasks['neows'] = function () use ($normalized): array {
                try {
                    return ['ok' => true, 'data' => $this->neoWsApproaches($normalized['date_min'], $normalized['date_max'])];
                } catch (NasaApiException $e) {
                    return ['ok' => false, 'error' => $e->getUserMessage()];
                }
            };
        }

        $tasks['cad'] = function () use ($normalized): array {
            try {
                return ['ok' => true, 'data' => $this->cadApproaches($normalized)];
            } catch (JplApiException $e) {
                return ['ok' => false, 'error' => $e->getUserMessage()];
            }
        };

        $results = Concurrency::run($tasks);

        $neoWsItems = collect();
        $cadItems   = collect();

        if (isset($results['neows'])) {
            $results['neows']['ok']
                ? $neoWsItems = $results['neows']['data']
                : $errors['neows'] = $results['neows']['error'];
        }

        if (isset($results['cad'])) {
            $results['cad']['ok']
                ? $cadItems = $results['cad']['data']
                : $errors['cad'] = $results['cad']['error'];
        }

        return [$neoWsItems, $cadItems, $errors];
    }

    /**
     * Versão simplificada de `fetchSourcesWithErrors()` que descarta erros.
     * Usada por `nextApproach()`, que não precisa reportar falhas por fonte.
     */
    private function fetchSources(array $normalized): array
    {
        [$neoWsItems, $cadItems] = $this->fetchSourcesWithErrors($normalized);

        return [$neoWsItems, $cadItems];
    }

    // -------------------------------------------------------------------------
    // Adaptadores de fonte
    // -------------------------------------------------------------------------

    /**
     * Busca aproximações do NeoWs dividindo o intervalo em janelas de até 8 dias.
     * A API do NeoWs tem esse limite por requisição; janelas maiores são paralelizadas.
     */
    private function neoWsApproaches(string $startDate, string $endDate): Collection
    {
        $start   = CarbonImmutable::parse($startDate);
        $end     = CarbonImmutable::parse($endDate);
        $windows = [];

        for ($ws = $start; $ws->lessThanOrEqualTo($end); $ws = $ws->addDays(8)) {
            $we        = $ws->addDays(7)->min($end);
            $windows[] = [$ws->toDateString(), $we->toDateString()];
        }

        // Intervalo cabe em uma janela — chama direto sem concorrência
        if (count($windows) === 1) {
            [$s, $e] = $windows[0];
            $feed = $this->neoWs->feed($s, $e);

            return collect($feed['asteroids'] ?? [])
                ->map(fn (array $a) => UnifiedApproachData::fromNeoWs($a));
        }

        $tasks   = array_map(fn (array $w) => fn () => $this->neoWs->feed($w[0], $w[1]), $windows);
        $results = Concurrency::run($tasks);

        return collect($results)
            ->filter(fn ($r) => is_array($r))
            ->flatMap(fn (array $feed) => collect($feed['asteroids'] ?? [])
                ->map(fn (array $a) => UnifiedApproachData::fromNeoWs($a)))
            ->values();
    }

    /**
     * Busca aproximações do JPL CAD e converte para `UnifiedApproachData`.
     */
    private function cadApproaches(array $filters): Collection
    {
        $data = $this->cad->search([
            'date_min' => $filters['date_min'],
            'date_max' => $filters['date_max'],
            'type'     => $filters['type'],
            'dist_max' => $filters['dist_max'],
            'sort'     => $filters['sort'],
        ]);

        return collect($data['approaches'] ?? [])
            ->map(fn (array $approach) => UnifiedApproachData::fromCad($approach));
    }

    // -------------------------------------------------------------------------
    // Filtros pós-merge
    // -------------------------------------------------------------------------

    /**
     * Remove objetos além do limite de distância informado em Unidades Astronômicas.
     * Objetos sem distância registrada são mantidos (benefício da dúvida).
     */
    private function filterByMaxDistance(Collection $approaches, string $maxDistanceAu): Collection
    {
        if (! is_numeric($maxDistanceAu)) {
            return $approaches->values();
        }

        $limitKm = (float) $maxDistanceAu * self::ASTRONOMICAL_UNIT_KM;

        if ($limitKm <= 0) {
            return $approaches->values();
        }

        return $approaches
            ->filter(fn (UnifiedApproachData $item) => $item->nominalDistanceKm === null || $item->nominalDistanceKm <= $limitKm)
            ->values();
    }
}
