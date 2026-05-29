<?php

namespace App\Services\Approaches;

use App\DTOs\Approaches\UnifiedApproachData;
use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;

/**
 * Determina quais objetos estão mais próximos da Terra *agora*, usando vetores do JPL Horizons.
 *
 * O CAD e o NeoWs registram a distância no ponto de máxima aproximação (um instante fixo no tempo),
 * não a distância atual. Este serviço corrige isso consultando o Horizons para obter vetores x/y/z
 * reais centrados no momento presente, reordenando os candidatos pela distância real de agora.
 *
 * Pipeline:
 *   1. Descobre candidatos via `ApproachObservatoryService` (CAD + NeoWs, já com dedup e filtro).
 *   2. Seleciona os N mais próximos por miss_distance + todos os PHAs (objetos potencialmente perigosos).
 *   3. Busca trajetórias do Horizons em paralelo para cada candidato.
 *   4. Reordena pela distância real derivada do Horizons; usa miss_distance como fallback.
 *   5. Retorna os K melhores com a trajetória completa (passado/presente/futuro) anexada.
 *
 * @see ApproachObservatoryService  Fonte dos candidatos iniciais
 * @see HorizonsTrajectoryService   Provedor das trajetórias vetoriais reais
 */
final class ClosestNowSelector
{
    /** Quantos candidatos avaliar no Horizons antes de cortar para o limite final */
    private const TOP_CANDIDATES = 15;

    /** Número padrão de objetos retornados ao chamador */
    private const TOP_RESULT_LIMIT = 5;

    /**
     * Janela temporal enviada ao Horizons: -30d passado / +90d futuro com passo de 2 dias (~60 pontos).
     *
     * Por que esse tamanho? NEOs mal curvam a trajetória em poucos dias (~1° por dia), mas ao longo
     * de ~120 dias um NEO típico descreve um arco claramente curvo (ex: 2026 KL2 curva ~48°).
     * 120 dias ainda é uma fração pequena de uma órbita típica (~2,8 anos / ~1000 dias),
     * então a cena continua sendo um "radar de proximidade", não uma órbita heliocêntrica completa.
     * O passo de 2 dias mantém ~60 pontos × 5 objetos = ~300 amostras (leve) e a spline suaviza.
     */
    private const HORIZONS_WINDOW = [
        'startOffsetHours' => -720,   // -30 dias
        'stopOffsetHours'  => 2160,   // +90 dias
        'stepSize'         => '2 days',
    ];

    /**
     * TTL do cache para o resultado resolvido.
     * Curto o suficiente para "mais próximo agora" ficar fresco, longo o suficiente para
     * coalescer recarregamentos simultâneos do frontend.
     */
    private const RESULT_CACHE_TTL_SECONDS = 900; // 15 minutos

    public function __construct(
        private readonly ApproachObservatoryService $observatory,
        private readonly HorizonsTrajectoryService  $horizons,
    ) {
    }

    /**
     * Retorna os objetos mais próximos da Terra agora dentro da janela de datas informada.
     *
     * @param  string  $dateMin  Data inicial ISO (Y-m-d), inclusive
     * @param  string  $dateMax  Data final ISO (Y-m-d), inclusive
     * @param  int     $limit    Quantos objetos retornar (padrão 5, máx 10)
     */
    public function select(string $dateMin, string $dateMax, int $limit = self::TOP_RESULT_LIMIT): array
    {
        $limit = max(1, min($limit, 10));

        // A assinatura da janela faz parte da chave de cache para que uma mudança de configuração
        // (ex: ampliar o horizonte temporal) invalide resultados antigos imediatamente.
        $windowSignature = implode(',', self::HORIZONS_WINDOW);
        $cacheKey        = 'closest-now:' . md5($dateMin . '|' . $dateMax . '|' . $limit . '|' . $windowSignature);

        return Cache::flexible(
            $cacheKey,
            [self::RESULT_CACHE_TTL_SECONDS, self::RESULT_CACHE_TTL_SECONDS + 900],
            fn (): array => $this->resolve($dateMin, $dateMax, $limit),
        );
    }

    // -------------------------------------------------------------------------
    // Pipeline principal
    // -------------------------------------------------------------------------

    /**
     * Executa o pipeline completo de resolução sem cache.
     */
    private function resolve(string $dateMin, string $dateMax, int $limit): array
    {
        // Passo 1: candidatos do CAD + NeoWs (já deduplicados e filtrados por dist_max)
        $data = $this->observatory->observe([
            'date_min'      => $dateMin,
            'date_max'      => $dateMax,
            'type'          => 'all',
            'dist_max'      => '0.2',
            'sort'          => 'dist',
            'distance_unit' => 'km',
        ]);

        $approaches = is_array($data['approaches'] ?? null) ? $data['approaches'] : [];

        if ($approaches === []) {
            return $this->emptyResult($dateMin, $dateMax, 'Nenhum candidato encontrado no período.');
        }

        // Passo 2: seleciona top-N por miss_distance + todos os PHAs do período
        $candidates = $this->pickCandidates($approaches);

        if ($candidates === []) {
            return $this->emptyResult($dateMin, $dateMax, 'Nenhum candidato com dados suficientes para projeção.');
        }

        // Passo 3: busca trajetórias do Horizons em paralelo para cada candidato
        $trajectories = $this->fetchTrajectoriesParallel($candidates);

        // Passo 4: monta resultado por objeto com distância atual e reordena
        $objects = $this->buildObjects($candidates, $trajectories);

        usort($objects, $this->compareByCurrentDistance(...));

        return [
            'mode'                => 'closest_now',
            'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
            'window'              => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
            'requestedLimit'      => $limit,
            'candidatesEvaluated' => count($candidates),
            'objects'             => array_slice($objects, 0, $limit),
            'lunarReference'      => [
                'distanceKm'           => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label'                => 'Distância média Terra-Lua',
                'description'          => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Seleção e busca de candidatos
    // -------------------------------------------------------------------------

    /**
     * Seleciona os candidatos que serão consultados no Horizons.
     *
     * Critério: top-N por miss_distance (proximidade na data de aproximação)
     * + união com todos os PHAs (potencialmente perigosos) da janela, mesmo que
     * estejam fora do top-N por distância — PHAs sempre merecem avaliação real.
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @return array<int, array<string, mixed>>
     */
    private function pickCandidates(array $approaches): array
    {
        $withDistance = array_filter(
            $approaches,
            static fn (array $a): bool => is_numeric($a['nominalDistanceKm'] ?? null),
        );

        usort(
            $withDistance,
            static fn (array $a, array $b): int => ((float) $a['nominalDistanceKm']) <=> ((float) $b['nominalDistanceKm']),
        );

        $byId = [];

        foreach (array_slice($withDistance, 0, self::TOP_CANDIDATES) as $approach) {
            $id = (string) ($approach['id'] ?? '');
            if ($id !== '') {
                $byId[$id] = $approach;
            }
        }

        // Garante que todos os PHAs entrem, independentemente do ranking por distância
        foreach ($approaches as $approach) {
            if (! (bool) ($approach['hazardFlag'] ?? false)) {
                continue;
            }
            $id = (string) ($approach['id'] ?? '');
            if ($id !== '' && ! isset($byId[$id])) {
                $byId[$id] = $approach;
            }
        }

        return array_values($byId);
    }

    /**
     * Dispara as consultas ao Horizons em paralelo e retorna um mapa indexado pelo ID da aproximação.
     *
     * @param  array<int, array<string, mixed>>   $candidates
     * @return array<string, array<string, mixed>>
     */
    private function fetchTrajectoriesParallel(array $candidates): array
    {
        $tasks = [];

        foreach ($candidates as $approach) {
            $id = (string) ($approach['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $payload    = $this->toHorizonsPayload($approach);
            $tasks[$id] = fn () => $this->horizons->trajectoryAroundNow($payload, self::HORIZONS_WINDOW);
        }

        return $tasks !== [] ? Concurrency::run($tasks) : [];
    }

    // -------------------------------------------------------------------------
    // Montagem de resultado
    // -------------------------------------------------------------------------

    /**
     * Constrói o array de objetos com distância atual e trajetória para cada candidato.
     *
     * @param  array<int, array<string, mixed>>   $candidates
     * @param  array<string, array<string, mixed>> $trajectories
     * @return array<int, array<string, mixed>>
     */
    private function buildObjects(array $candidates, array $trajectories): array
    {
        $objects = [];

        foreach ($candidates as $approach) {
            $id = (string) ($approach['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $trajectory = $trajectories[$id] ?? null;
            $currentKm  = $this->extractCurrentDistance($trajectory, $approach);

            $objects[] = [
                'approach'               => $approach,
                'trajectory'             => $trajectory,
                'currentDistanceKm'      => $currentKm,
                'currentDistanceLD'      => $currentKm !== null
                    ? $currentKm / DistancePresenter::LUNAR_DISTANCE_KM
                    : null,
                'hasRealCurrentDistance' => $this->trajectoryIsAvailable($trajectory),
            ];
        }

        return $objects;
    }

    /**
     * Comparador de ordenação: prioriza objetos com distância real do Horizons.
     * Objetos sem distância real vão para o final e são comparados pela miss_distance nominal.
     */
    private function compareByCurrentDistance(array $a, array $b): int
    {
        $aKm = $a['hasRealCurrentDistance'] ? $a['currentDistanceKm'] : null;
        $bKm = $b['hasRealCurrentDistance'] ? $b['currentDistanceKm'] : null;

        if ($aKm === null && $bKm === null) {
            $aFallback = (float) ($a['approach']['nominalDistanceKm'] ?? INF);
            $bFallback = (float) ($b['approach']['nominalDistanceKm'] ?? INF);

            return $aFallback <=> $bFallback;
        }

        if ($aKm === null) {
            return 1;
        }

        if ($bKm === null) {
            return -1;
        }

        return $aKm <=> $bKm;
    }

    /**
     * Resultado vazio padronizado para quando não há candidatos viáveis.
     */
    private function emptyResult(string $dateMin, string $dateMax, string $note): array
    {
        return [
            'mode'                => 'closest_now',
            'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
            'window'              => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
            'requestedLimit'      => self::TOP_RESULT_LIMIT,
            'candidatesEvaluated' => 0,
            'objects'             => [],
            'note'                => $note,
            'lunarReference'      => [
                'distanceKm'           => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => 30.0,
                'label'                => 'Distância média Terra-Lua',
                'description'          => 'A Lua é referência visual: cerca de 384.400 km, aproximadamente 30 Terras.',
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Adaptadores e helpers
    // -------------------------------------------------------------------------

    /**
     * Converte o shape de uma aproximação unificada para o payload esperado pelo `HorizonsTrajectoryService`.
     */
    private function toHorizonsPayload(array $approach): array
    {
        return [
            'id'               => (string) ($approach['id'] ?? ''),
            'name'             => (string) ($approach['name'] ?? ''),
            'displayName'      => (string) ($approach['displayName'] ?? $approach['name'] ?? ''),
            'rawName'          => (string) ($approach['rawName'] ?? $approach['name'] ?? ''),
            'designation'      => (string) ($approach['provisionalDesignation'] ?? $approach['designation'] ?? ''),
            'detailIdentifier' => (string) ($approach['detailIdentifier'] ?? ''),
            'spkId'            => (string) ($approach['spkId'] ?? ''),
            'approachTime'     => (string) ($approach['approachDate'] ?? ''),
            'nominalDistanceKm' => $approach['nominalDistanceKm'] ?? null,
            'source'           => (string) ($approach['source'] ?? ''),
            'sourceLabel'      => (string) ($approach['sourceLabel'] ?? ''),
        ];
    }

    /**
     * Verifica se a trajetória retornada pelo Horizons está disponível para uso.
     */
    private function trajectoryIsAvailable(?array $trajectory): bool
    {
        return is_array($trajectory) && ($trajectory['status'] ?? null) === 'available';
    }

    /**
     * Extrai a distância atual em km da trajetória do Horizons.
     * Se indisponível, cai para a miss_distance nominal do CAD/NeoWs como aproximação.
     */
    private function extractCurrentDistance(?array $trajectory, array $approach): ?float
    {
        if ($this->trajectoryIsAvailable($trajectory)) {
            $value = $trajectory['currentDistanceKm'] ?? null;
            if (is_numeric($value)) {
                return (float) $value;
            }
        }

        $fallback = $approach['nominalDistanceKm'] ?? null;

        return is_numeric($fallback) ? (float) $fallback : null;
    }
}
