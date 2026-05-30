<?php

namespace App\Services\Approaches;

use App\Services\Jpl\Horizons\HorizonsTrajectoryService;
use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Concurrency;
use Illuminate\Support\Facades\Log;

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
    /**
     * Quantos candidatos buscar no CAD/SBDB antes de qualquer corte.
     *
     * Precisa ser maior que o maior `limit` aceito pelo controller (30) mais margem para PHAs
     * extras. 45 garante que mesmo com limit=30 haja candidatos suficientes para ordenar por
     * distância real e ainda sobrar PHAs que não estavam no top-30 por miss_distance.
     *
     * O Horizons NÃO é consultado para todos eles: apenas os `limit + HORIZONS_MARGIN`
     * mais próximos por distância nominal recebem trajetória real. Os demais entram no
     * resultado com fallback nominal e hasRealCurrentDistance=false.
     */
    private const TOP_CANDIDATES = 45;

    /**
     * Quantos candidatos extras além do `limit` solicitado recebem consulta ao Horizons.
     *
     * A margem serve como reserva caso algum objeto da "janela principal" falhe ou seja
     * descartado na deduplicação. Com margem=5, um `limit=5` consulta até 10 objetos,
     * garantindo que os 5 finais tenham dados reais sempre que possível.
     */
    private const HORIZONS_MARGIN = 5;

    /** Número padrão de objetos retornados ao chamador */
    private const TOP_RESULT_LIMIT = 5;

    /** Modos de seleção válidos — o critério que define quais objetos são priorizados */
    private const VALID_MODES = ['nearest', 'upcoming', 'featured', 'attention'];

    /**
     * Janela temporal enviada ao Horizons: ±2 dias com passo de 6 horas (~9 pontos por objeto).
     *
     * Janela curta tem dois efeitos positivos:
     *   1. Respostas muito menores → menos timeout quando 30 objetos são consultados em paralelo.
     *   2. A distância atual interpolada fica mais precisa (ponto mais próximo de "agora").
     * Para o critério "mais próximos agora" não precisamos de órbita completa — só queremos
     * saber onde o objeto está hoje. A trajetória de ±2 dias é suficiente para a cena 3D
     * mostrar a curva de passagem sem exigir 60 pontos por objeto.
     */
    private const HORIZONS_WINDOW = [
        'startOffsetHours' => -48,    // -2 dias
        'stopOffsetHours'  => 48,     // +2 dias
        'stepSize'         => '6 hours',
    ];

    /** Máximo de objetos consultados simultaneamente no Horizons. Acima disso os timeouts explodem. */
    private const HORIZONS_BATCH_SIZE = 8;

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
     * Retorna os objetos selecionados para o radar dentro da janela de datas informada.
     *
     * O pipeline usa lazy-loading para o Horizons: apenas os `$limit + HORIZONS_MARGIN`
     * candidatos mais próximos por distância nominal recebem trajetória real. Os demais
     * entram no resultado com fallback nominal (hasRealCurrentDistance=false).
     *
     * A chave de cache NÃO inclui o limit: o resultado completo é armazenado e
     * fatias menores simplesmente fazem array_slice sobre ele. Isso garante que
     * top-5, top-15 e top-30 sejam fatias coerentes do mesmo conjunto ordenado —
     * sem pipelines independentes que podem discordar entre si.
     *
     * Quando o limit aumenta (ex: 5→15), os objetos 1–5 já estão no cache
     * individual do Horizons (por objectId + bucket de tempo) e são reutilizados
     * automaticamente; apenas os objetos 6–15 (+ margem) geram novas chamadas.
     *
     * @param  string  $dateMin   Data inicial ISO (Y-m-d), inclusive (já pode estar alargada pelo controller)
     * @param  string  $dateMax   Data final ISO (Y-m-d), inclusive (já pode estar alargada pelo controller)
     * @param  int     $limit     Quantos objetos retornar (padrão 5, máx 30)
     * @param  string  $mode      Critério de seleção: 'nearest' | 'upcoming' | 'featured' | 'attention'
     * @param  string  $anchorMin Data âncora original (antes do alargamento) — usada pelo modo 'upcoming'
     */
    public function select(string $dateMin, string $dateMax, int $limit = self::TOP_RESULT_LIMIT, string $mode = 'nearest', string $anchorMin = '', bool $forceRefresh = false): array
    {
        $limit = max(1, min($limit, 30));
        $mode  = in_array($mode, self::VALID_MODES, true) ? $mode : 'nearest';

        // Âncora para o modo 'upcoming': data original sem alargamento.
        // Se não fornecida, cai para $dateMin (comportamento legado).
        $anchor = $anchorMin !== '' ? $anchorMin : $dateMin;

        // O $limit entra na chave de cache porque o conteúdo do pipeline varia com ele:
        // limit=5 consulta ~10 objetos no Horizons; limit=30 consulta ~35.
        //
        // Quando o usuário expande de 5→15, o cache de limit=5 é ignorado e resolve()
        // é executado novamente com limit=15. O custo adicional é mínimo: o cache
        // individual do Horizons por objectId (TTL 30min) reutiliza automaticamente os
        // ~10 objetos já consultados — apenas os objetos 11–20 geram novas chamadas à API.
        $windowSignature = implode(',', self::HORIZONS_WINDOW);
        $cacheKey        = 'closest-now:v7:' . md5($dateMin . '|' . $dateMax . '|' . $mode . '|' . $limit . '|' . $anchor . '|' . $windowSignature);

        if ($forceRefresh) {
            Cache::forget($cacheKey);
            Cache::forget("illuminate:cache:flexible:created:{$cacheKey}");
        }

        $full = Cache::flexible(
            $cacheKey,
            [self::RESULT_CACHE_TTL_SECONDS, self::RESULT_CACHE_TTL_SECONDS + 900],
            fn (): array => $this->resolve($dateMin, $dateMax, $mode, $limit, $anchor),
        );

        // Fatia o resultado já ordenado para o limite solicitado (todos os modos).
        if (is_array($full['objects'] ?? null)) {
            $full['objects']        = array_slice($full['objects'], 0, $limit);
            $full['requestedLimit'] = $limit;
        }

        return $full;
    }

    // -------------------------------------------------------------------------
    // Pipeline principal
    // -------------------------------------------------------------------------

    /**
     * Executa o pipeline completo de resolução sem cache.
     *
     * Estratégia de lazy-loading do Horizons:
     *   1. Pré-ordena todos os candidatos por distância nominal do CAD (operação gratuita).
     *   2. Consulta o Horizons apenas para os `$limit + HORIZONS_MARGIN` mais próximos.
     *   3. Os demais candidatos entram no resultado usando nominalDistanceKm como fallback,
     *      com hasRealCurrentDistance=false, e ficam disponíveis para expansões futuras
     *      (cache individual do Horizons por objectId + bucket de tempo).
     *
     * Resultado: sempre contém TOP_CANDIDATES objetos ordenados, mas apenas os
     * `$limit + HORIZONS_MARGIN` primeiros têm posição real do Horizons. O slice
     * final para o $limit pedido é aplicado pelo chamador (select).
     */
    private function resolve(string $dateMin, string $dateMax, string $mode, int $limit = self::TOP_RESULT_LIMIT, string $anchor = ''): array
    {
        // Âncora para filtros por data (modo 'upcoming'): usa o valor fornecido ou cai para $dateMin.
        $anchorDate = $anchor !== '' ? $anchor : $dateMin;

        // Passo 1: candidatos do CAD + NeoWs.
        // 'featured' e 'attention' usam janela de ± 90 dias sem dist_max para garantir
        // que objetos famosos (Bennu, Eros…) e PHAs sejam encontrados mesmo fora da janela diária.
        // 'upcoming' usa janela alargada para capturar os próximos 3 dias.
        $observeParams = match ($mode) {
            'featured', 'attention' => [
                'date_min'      => CarbonImmutable::parse($anchorDate, 'UTC')->subDays(90)->toDateString(),
                'date_max'      => CarbonImmutable::parse($anchorDate, 'UTC')->addDays(90)->toDateString(),
                'type'          => 'all',
                'dist_max'      => '1.0',   // até 1 UA — inclui objetos famosos distantes
                'sort'          => 'dist',
                'distance_unit' => 'km',
            ],
            default => [
                'date_min'      => $dateMin,
                'date_max'      => $dateMax,
                'type'          => 'all',
                'dist_max'      => '0.2',
                'sort'          => 'dist',
                'distance_unit' => 'km',
            ],
        };

        $data = $this->observatory->observe($observeParams);

        $approaches = is_array($data['approaches'] ?? null) ? $data['approaches'] : [];

        if ($approaches === []) {
            return $this->emptyResult($dateMin, $dateMax, 30, $mode, 'Nenhum candidato encontrado no período.');
        }

        // Passo 2: filtra e seleciona candidatos de acordo com o modo.
        $candidates = $this->pickCandidates($approaches, $mode, $anchorDate);

        if ($candidates === []) {
            return $this->emptyResult($dateMin, $dateMax, 30, $mode, 'Nenhum candidato com dados suficientes para projeção.');
        }

        // Passo 3: pré-ordena por distância nominal do CAD (gratuito) e divide em
        // "prioritários" (recebem Horizons) e "reserva" (ficam com fallback nominal).
        //
        // Para modos que não são 'nearest', o Horizons é consultado para todos porque
        // o conjunto já é pequeno e fixo (objetos featured, PHAs, upcoming do dia).
        [$priorityCandidates, $reserveCandidates] = $this->splitCandidatesByPriority($candidates, $mode, $limit);

        Log::info('[ClosestNow] pipeline iniciado', [
            'mode'              => $mode,
            'limit'             => $limit,
            'candidatos_cad'    => count($approaches),
            'candidatos_apos_pick' => count($candidates),
            'horizons_priorizados' => count($priorityCandidates),
            'horizons_reserva'  => count($reserveCandidates),
        ]);

        // Passo 4: busca trajetórias do Horizons apenas para os candidatos prioritários.
        $started      = microtime(true);
        $trajectories = $this->fetchTrajectoriesParallel($priorityCandidates);
        $elapsed      = round((microtime(true) - $started) * 1000);

        $horizonsOk    = count(array_filter($trajectories, fn ($t) => ($t['status'] ?? null) === 'available'));
        $horizonsFail  = count($trajectories) - $horizonsOk;

        Log::info('[ClosestNow] Horizons concluído', [
            'horizons_ok'     => $horizonsOk,
            'horizons_falha'  => $horizonsFail,
            'tempo_ms'        => $elapsed,
        ]);

        // Passo 5: monta resultado. Candidatos reserva entram com trajectory=null →
        // buildObjects usa nominalDistanceKm como fallback (hasRealCurrentDistance=false).
        $allCandidates = array_merge($priorityCandidates, $reserveCandidates);
        $objects       = $this->buildObjects($allCandidates, $trajectories);

        if ($mode !== 'upcoming') {
            usort($objects, $this->compareByCurrentDistance(...));
        } else {
            usort($objects, $this->compareByUpcomingApproachDate(...));
        }

        // Remove duplicatas por nome canônico mantendo apenas a entrada mais próxima (já é a primeira após sort).
        // Necessário porque um mesmo objeto pode ter múltiplas entradas no CAD com datas de aproximação
        // distintas, que passam pela dedup do ApproachMerger (baseada em nome+data) como entidades separadas.
        $objects = $this->deduplicateByName($objects);

        return [
            'mode'                => 'closest_now',
            'selectionMode'       => $mode,
            'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
            'window'              => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
            'requestedLimit'      => 30,
            'candidatesEvaluated' => count($candidates),
            'horizonsQueried'     => count($priorityCandidates),
            'objects'             => $objects,
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
     * Filtra e seleciona os candidatos de acordo com o modo de seleção.
     *
     * Cada modo aplica critérios distintos sobre o pool de aproximações:
     *
     *   nearest   — top-N por miss_distance + todos os PHAs (comportamento original)
     *   upcoming  — somente objetos cuja data de aproximação cai no dia $dateMin
     *   featured  — somente objetos com modelo 3D real disponível (nomes próprios conhecidos)
     *   attention — somente objetos com hazardFlag = true (monitorados pela NASA/JPL)
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @param  string                            $mode
     * @param  string                            $dateMin    Data âncora para o filtro 'upcoming' (Y-m-d)
     * @return array<int, array<string, mixed>>
     */
    private function pickCandidates(array $approaches, string $mode, string $dateMin): array
    {
        return match ($mode) {
            'upcoming'  => $this->pickUpcomingCandidates($approaches, $dateMin),
            'featured'  => $this->pickFeaturedCandidates($approaches),
            'attention' => $this->pickAttentionCandidates($approaches),
            default     => $this->pickNearestCandidates($approaches),
        };
    }

    /**
     * Modo 'nearest': top-N por miss_distance + todos os PHAs da janela.
     * PHAs sempre entram independentemente do ranking — merecem avaliação real.
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @return array<int, array<string, mixed>>
     */
    private function pickNearestCandidates(array $approaches): array
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
     * Modo 'upcoming': objetos cuja data de máxima aproximação cai nos próximos 3 dias
     * a partir da data âncora (inclusive). Ordenados por proximidade temporal com o instante atual.
     *
     * Atenção: approachDate pode vir em formatos distintos da NASA (ex: "2026-May-28 12:42"
     * ou "2026-05-28T12:42:00"). Usamos Carbon::parse() para normalizar antes de comparar.
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @param  string                            $dateMin  Data âncora no formato Y-m-d
     * @return array<int, array<string, mixed>>
     */
    private function pickUpcomingCandidates(array $approaches, string $dateMin): array
    {
        $now         = CarbonImmutable::now('UTC');
        $anchorStart = CarbonImmutable::parse($dateMin, 'UTC')->startOfDay();
        // Corte a partir de agora (não do início do dia) para não incluir aproximações já passadas.
        $windowStart = $anchorStart->greaterThan($now) ? $anchorStart : $now;
        $anchorEnd   = $anchorStart->addDays(3)->endOfDay();

        $filtered = array_values(array_filter(
            $approaches,
            static function (array $a) use ($windowStart, $anchorEnd): bool {
                $raw = (string) ($a['approachDate'] ?? '');
                if ($raw === '') {
                    return false;
                }
                try {
                    $date = CarbonImmutable::parse($raw, 'UTC');
                } catch (\Throwable) {
                    return false;
                }
                return $date->greaterThanOrEqualTo($windowStart) && $date->lessThanOrEqualTo($anchorEnd);
            },
        ));

        usort($filtered, $this->compareByUpcomingApproach(...));

        return $filtered;
    }

    /**
     * Modo 'featured': somente objetos com modelo 3D real disponível na cena.
     * A lista de nomes/números espelha exatamente REAL_ASTEROID_MODELS no frontend.
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @return array<int, array<string, mixed>>
     */
    private function pickFeaturedCandidates(array $approaches): array
    {
        return array_values(array_filter(
            $approaches,
            fn (array $a): bool => $this->hasFeaturedModel($a),
        ));
    }

    /**
     * Modo 'attention': somente objetos monitorados pela NASA/JPL (hazardFlag = true).
     *
     * @param  array<int, array<string, mixed>>  $approaches
     * @return array<int, array<string, mixed>>
     */
    private function pickAttentionCandidates(array $approaches): array
    {
        return array_values(array_filter(
            $approaches,
            static fn (array $a): bool => (bool) ($a['hazardFlag'] ?? false),
        ));
    }

    /**
     * Verifica se o objeto corresponde a um asteroide com modelo 3D real disponível.
     * Espelha exatamente os registros de REAL_ASTEROID_MODELS no frontend:
     *   bennu (101955), ceres (1), itokawa (25143), eros (433), vesta (4)
     */
    private function hasFeaturedModel(array $approach): bool
    {
        // Números de catálogo canônicos dos asteroides com modelo 3D próprio
        static $featuredNumbers = ['101955', '1', '25143', '433', '4'];

        // Aliases textuais correspondentes
        static $featuredAliases = ['bennu', 'rq36', 'ceres', 'itokawa', 'eros', 'vesta'];

        $fields = array_filter([
            $approach['name'] ?? null,
            $approach['displayName'] ?? null,
            $approach['rawName'] ?? null,
            $approach['properName'] ?? null,
            $approach['designation'] ?? null,
            $approach['provisionalDesignation'] ?? null,
            $approach['detailIdentifier'] ?? null,
        ]);

        $lowerFields = array_map('strtolower', array_map('trim', $fields));

        foreach ($featuredAliases as $alias) {
            foreach ($lowerFields as $field) {
                if (preg_match('/(^|[^a-z0-9])' . preg_quote($alias, '/') . '([^a-z0-9]|$)/i', $field)) {
                    return true;
                }
            }
        }

        $numberFields = array_filter([
            (string) ($approach['permanentNumber'] ?? ''),
            (string) ($approach['spkId'] ?? ''),
        ]);

        foreach ($featuredNumbers as $number) {
            foreach ($numberFields as $field) {
                $clean = trim(preg_replace('/^\((\d+)\)$/', '$1', $field));
                if ($clean === $number) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Divide os candidatos em dois grupos: prioritários (recebem Horizons) e reserva (fallback nominal).
     *
     * Para o modo 'nearest', pré-ordena por nominalDistanceKm e consulta o Horizons apenas
     * para os `$limit + HORIZONS_MARGIN` mais próximos. Isso garante que a página abra
     * consultando no máximo 10 objetos para limit=5, 20 para limit=15, e 35 para limit=30,
     * em vez dos 45 que seriam consultados sem esse corte.
     *
     * O cache individual por objectId no HorizonsTrajectoryService garante que, ao expandir
     * de 5→15, os 5 já processados sejam reaproveitados sem nova chamada à API.
     *
     * Para modos não-nearest (featured, attention, upcoming), consulta todos os candidatos
     * pois o conjunto já é pequeno e fixo — não faz sentido aplicar lazy-loading.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>}
     *         [prioritários, reserva]
     */
    private function splitCandidatesByPriority(array $candidates, string $mode, int $limit): array
    {
        if ($mode !== 'nearest') {
            return [$candidates, []];
        }

        // Pré-ordena pelo ranking nominal do CAD (nominalDistanceKm).
        // Objetos sem distância vão para o final — receberão fallback null no buildObjects.
        usort(
            $candidates,
            static fn (array $a, array $b): int =>
                ((float) ($a['nominalDistanceKm'] ?? PHP_INT_MAX)) <=> ((float) ($b['nominalDistanceKm'] ?? PHP_INT_MAX)),
        );

        $horizonsCount    = min(count($candidates), $limit + self::HORIZONS_MARGIN);
        $priorityCandidates = array_slice($candidates, 0, $horizonsCount);
        $reserveCandidates  = array_slice($candidates, $horizonsCount);

        return [$priorityCandidates, $reserveCandidates];
    }

    /**
     * Consulta o Horizons em lotes paralelos para evitar timeouts por sobrecarga.
     *
     * 30 requisições simultâneas causam timeout na maioria dos objetos. Lotes de 8
     * mantêm a concorrência útil sem saturar a conexão com o JPL.
     * Entre lotes há uma pausa de 300ms para não bater no rate-limit da API.
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

        if ($tasks === []) {
            return [];
        }

        $results = [];
        $batches = array_chunk($tasks, self::HORIZONS_BATCH_SIZE, preserve_keys: true);

        Log::info('[ClosestNow] Horizons lotes', [
            'total_objetos' => count($tasks),
            'total_lotes'   => count($batches),
            'tamanho_lote'  => self::HORIZONS_BATCH_SIZE,
        ]);

        foreach ($batches as $i => $batch) {
            if ($i > 0) {
                usleep(300_000); // 300ms entre lotes
            }
            Log::debug('[ClosestNow] Horizons lote ' . ($i + 1), [
                'objetos' => array_keys($batch),
            ]);
            $batchResults = Concurrency::run($batch);
            $results      = array_merge($results, $batchResults);
        }

        return $results;
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
     * Comparador por distância: usa currentDistanceKm que já contém o fallback nominal quando
     * o Horizons falhou (ver extractCurrentDistance). Objetos sem qualquer distância vão pro final.
     * Em caso de empate numérico, distância real do Horizons tem precedência sobre nominal.
     */
    private function compareByCurrentDistance(array $a, array $b): int
    {
        $aKm = isset($a['currentDistanceKm']) ? (float) $a['currentDistanceKm'] : null;
        $bKm = isset($b['currentDistanceKm']) ? (float) $b['currentDistanceKm'] : null;

        if ($aKm === null && $bKm === null) {
            return 0;
        }

        if ($aKm === null) {
            return 1;
        }

        if ($bKm === null) {
            return -1;
        }

        if ($aKm === $bKm) {
            // Desempate: Horizons real tem precedência sobre nominal de mesma distância
            return (int) $b['hasRealCurrentDistance'] <=> (int) $a['hasRealCurrentDistance'];
        }

        return $aKm <=> $bKm;
    }

    /**
     * Remove duplicatas por nome canônico mantendo apenas a primeira ocorrência de cada objeto
     * (que após o usort já é a entrada com menor distância atual).
     *
     * Um mesmo asteroide pode ter múltiplas entradas no pool quando o CAD registrou mais de
     * uma aproximação dentro da janela temporal e as datas distintas fizeram o dedupeKey do
     * ApproachMerger tratá-las como objetos diferentes.
     *
     * @param  array<int, array<string, mixed>>  $objects
     * @return array<int, array<string, mixed>>
     */
    private function deduplicateByName(array $objects): array
    {
        $seen   = [];
        $result = [];

        foreach ($objects as $obj) {
            $rawName = (string) ($obj['approach']['rawName'] ?? $obj['approach']['name'] ?? $obj['approach']['id'] ?? '');
            $key     = strtolower(preg_replace('/[^a-z0-9]+/i', '', $rawName));

            if ($key === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $result[]   = $obj;
        }

        return $result;
    }

    /**
     * Comparador para modo 'upcoming': prioriza objetos cuja data de aproximação é mais próxima
     * do instante atual (passado imediato ou futuro próximo). Ordena por |approachDate - now|.
     * Objetos sem data de aproximação vão para o final.
     */
    private function compareByUpcomingApproach(array $a, array $b): int
    {
        $now   = CarbonImmutable::now('UTC');
        $aDate = isset($a['approachDate'])
            ? CarbonImmutable::parse($a['approachDate'], 'UTC')
            : null;
        $bDate = isset($b['approachDate'])
            ? CarbonImmutable::parse($b['approachDate'], 'UTC')
            : null;

        if ($aDate === null && $bDate === null) return 0;
        if ($aDate === null) return 1;
        if ($bDate === null) return -1;

        // Prioriza datas no futuro; para datas passadas usa distância absoluta
        $aFuture = $aDate->greaterThan($now);
        $bFuture = $bDate->greaterThan($now);

        if ($aFuture && ! $bFuture) return -1;
        if (! $aFuture && $bFuture) return 1;

        return abs($aDate->diffInSeconds($now)) <=> abs($bDate->diffInSeconds($now));
    }

    /**
     * Comparador para modo 'upcoming' aplicado sobre os objects já construídos (com 'approach' aninhado).
     * Ordena pela approachDate mais próxima de agora: futuras primeiro, depois passado recente.
     */
    private function compareByUpcomingApproachDate(array $a, array $b): int
    {
        $now   = CarbonImmutable::now('UTC');
        $aRaw  = (string) ($a['approach']['approachDate'] ?? '');
        $bRaw  = (string) ($b['approach']['approachDate'] ?? '');
        $aDate = $aRaw !== '' ? CarbonImmutable::parse($aRaw, 'UTC') : null;
        $bDate = $bRaw !== '' ? CarbonImmutable::parse($bRaw, 'UTC') : null;

        if ($aDate === null && $bDate === null) return 0;
        if ($aDate === null) return 1;
        if ($bDate === null) return -1;

        $aFuture = $aDate->greaterThan($now);
        $bFuture = $bDate->greaterThan($now);

        if ($aFuture && ! $bFuture) return -1;
        if (! $aFuture && $bFuture) return 1;

        return abs($aDate->diffInSeconds($now)) <=> abs($bDate->diffInSeconds($now));
    }

    /**
     * Resultado vazio padronizado para quando não há candidatos viáveis.
     */
    private function emptyResult(string $dateMin, string $dateMax, int $limit, string $mode, string $note): array
    {
        return [
            'mode'                => 'closest_now',
            'selectionMode'       => $mode,
            'generatedAt'         => CarbonImmutable::now('UTC')->toIso8601String(),
            'window'              => ['dateMin' => $dateMin, 'dateMax' => $dateMax],
            'requestedLimit'      => $limit,
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
