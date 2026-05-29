<?php

namespace App\Services\Approaches;

use App\DTOs\Approaches\UnifiedApproachData;
use App\Support\DistancePresenter;
use Illuminate\Support\Collection;

/**
 * Responsável por produzir os dados de apresentação derivados de uma coleção de aproximações.
 *
 * Agrupa duas preocupações de leitura que andam sempre juntas:
 *   - `summary`: estatísticas gerais (totais, destaques, extremos)
 *   - `charts`: séries de dados prontas para os componentes de gráfico do frontend
 *
 * Não persiste nem modifica nada — é uma camada de projeção pura sobre a coleção.
 */
final class ApproachSummarizer
{
    /**
     * Produz o resumo estatístico da lista de aproximações.
     * Inclui contagens por tipo/fonte, destaques de proximidade e o próximo evento.
     *
     * @param  Collection<int, UnifiedApproachData>  $approaches
     */
    public function summary(Collection $approaches): array
    {
        $closest = $approaches
            ->filter(fn (UnifiedApproachData $i) => $i->nominalDistanceKm !== null)
            ->sortBy('nominalDistanceKm')
            ->first();

        $fastest = $approaches
            ->filter(fn (UnifiedApproachData $i) => $i->relativeVelocityKph !== null)
            ->sortByDesc('relativeVelocityKph')
            ->first();

        $next = $approaches
            ->filter(fn (UnifiedApproachData $i) => $i->approachDate !== null)
            ->sortBy('approachDate')
            ->first();

        return [
            'total'              => $approaches->count(),
            'asteroids'          => $approaches->where('objectType', 'asteroid')->count(),
            'comets'             => $approaches->where('objectType', 'comet')->count(),
            'fromNeoWs'          => $approaches->where('source', 'neows')->count(),
            'fromCad'            => $approaches->where('source', 'cad')->count(),

            // Objetos que passaram dentro ou próximo da órbita média da Lua
            'closerThanMoon'     => $approaches->filter(fn (UnifiedApproachData $i) => $i->lunarDistance !== null && $i->lunarDistance < 1)->count(),
            'nearMoon'           => $approaches->filter(fn (UnifiedApproachData $i) => $i->lunarDistance !== null && $i->lunarDistance >= 1 && $i->lunarDistance <= 1.5)->count(),

            'closestObjectName'  => $closest?->name,
            'closestDistanceKm'  => $closest?->nominalDistanceKm,
            'closestLunarDistance' => $closest?->lunarDistance,

            'fastestObjectName'  => $fastest?->name,
            'fastestVelocityKph' => $fastest?->relativeVelocityKph,

            'nextApproachName'   => $next?->name,
            'nextApproachDate'   => $next?->approachDate,
        ];
    }

    /**
     * Produz as séries de dados para os gráficos do frontend.
     * Cada chave corresponde a um componente de visualização específico.
     *
     * @param  Collection<int, UnifiedApproachData>  $approaches
     */
    public function charts(Collection $approaches): array
    {
        return [
            // Distribuição de aproximações por dia do período filtrado
            'byDay' => $approaches
                ->groupBy(fn (UnifiedApproachData $i) => substr((string) $i->approachDate, 0, 10) ?: 'Sem data')
                ->map(fn (Collection $items, string $date) => ['date' => $date, 'total' => $items->count()])
                ->values()
                ->all(),

            // Proporção de asteroides vs cometas
            'byType' => [
                ['name' => 'Asteroides', 'value' => $approaches->where('objectType', 'asteroid')->count()],
                ['name' => 'Cometas',    'value' => $approaches->where('objectType', 'comet')->count()],
            ],

            // Proporção por fonte de dados
            'bySource' => [
                ['name' => 'NeoWs',   'value' => $approaches->where('source', 'neows')->count()],
                ['name' => 'JPL CAD', 'value' => $approaches->where('source', 'cad')->count()],
            ],

            // Top 6 objetos mais próximos (em distâncias lunares)
            'closest' => $approaches
                ->filter(fn (UnifiedApproachData $i) => $i->lunarDistance !== null)
                ->sortBy('lunarDistance')
                ->take(6)
                ->map(fn (UnifiedApproachData $i) => [
                    'name'          => $i->name,
                    'lunarDistance' => $i->lunarDistance,
                    'distanceKm'    => $i->nominalDistanceKm,
                ])
                ->values()
                ->all(),

            // Top 6 objetos mais rápidos (em km/h)
            'fastest' => $approaches
                ->filter(fn (UnifiedApproachData $i) => $i->relativeVelocityKph !== null)
                ->sortByDesc('relativeVelocityKph')
                ->take(6)
                ->map(fn (UnifiedApproachData $i) => [
                    'name'        => $i->name,
                    'velocityKph' => $i->relativeVelocityKph,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Retorna os metadados fixos da referência lunar exibidos no mapa.
     * Esses valores são constantes e servem como âncora visual para o usuário.
     */
    public function lunarReference(): array
    {
        return [
            'distanceKm'           => DistancePresenter::LUNAR_DISTANCE_KM,
            'earthDiametersApprox' => 30.0,
            'label'                => 'Distância média Terra-Lua',
            'description'          => 'A Lua é usada como referência visual: cerca de 384.400 km, aproximadamente 30 Terras de distância.',
        ];
    }

    /**
     * Nota de rodapé exibida junto ao mapa de posicionamento.
     * Deixa explícito ao usuário que o mapa preserva distância, não órbitas reais.
     */
    public function visualNote(): string
    {
        return 'Os objetos são posicionados de acordo com a distância registrada da Terra. '
            . 'A Lua aparece como referência em sua distância média de 384.400 km. '
            . 'O mapa não representa órbitas reais, mas preserva a comparação de distância entre os objetos.';
    }
}
