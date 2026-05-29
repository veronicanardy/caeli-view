<?php

namespace App\Services\Jpl\Cad;

use App\DTOs\Jpl\CloseApproachData;
use Illuminate\Support\Collection;

/**
 * Produz os dados analíticos (resumo e gráficos) sobre uma coleção de aproximações.
 *
 * Encapsula toda a lógica de agregação e ranking que antes ficava no CloseApproachService,
 * deixando o service responsável apenas por orquestrar cache e chamadas HTTP.
 */
final class CloseApproachAnalytics
{
    /**
     * Resumo estatístico: totais, objeto mais próximo, mais rápido e próxima aproximação.
     *
     * @param  Collection<int, CloseApproachData>  $approaches
     * @return array<string, mixed>
     */
    public function summary(Collection $approaches): array
    {
        $closest = $approaches
            ->filter(fn (CloseApproachData $a) => $a->distanceAu !== null)
            ->sortBy('distanceAu')
            ->first();

        $fastest = $approaches
            ->filter(fn (CloseApproachData $a) => $a->relativeVelocityKmS !== null)
            ->sortByDesc('relativeVelocityKmS')
            ->first();

        $next = $approaches
            ->filter(fn (CloseApproachData $a) => $a->calendarDate !== null)
            ->sortBy('calendarDate')
            ->first();

        return [
            'total'               => $approaches->count(),
            'comets'              => $approaches->where('objectType', 'comet')->count(),
            'asteroids'           => $approaches->where('objectType', 'asteroid')->count(),
            'closestDistanceAu'   => $closest?->distanceAu,
            'closestDistanceKm'   => $closest?->distanceKm(),
            'closestObjectName'   => $closest?->displayName(),
            'fastestVelocityKmS'  => $fastest?->relativeVelocityKmS,
            'fastestVelocityKmH'  => $fastest?->relativeVelocityKmH(),
            'fastestObjectName'   => $fastest?->displayName(),
            'nextApproachDate'    => $next?->calendarDate,
            'nextApproachName'    => $next?->displayName(),
        ];
    }

    /**
     * Dados para os gráficos do painel: por dia, por tipo, os 5 mais próximos e os 5 mais rápidos.
     *
     * @param  Collection<int, CloseApproachData>  $approaches
     * @return array<string, mixed>
     */
    public function charts(Collection $approaches): array
    {
        $byDay = $approaches
            ->groupBy(fn (CloseApproachData $a) => substr((string) $a->calendarDate, 0, 11) ?: 'Sem data')
            ->map(fn (Collection $items, string $date) => ['date' => trim($date), 'total' => $items->count()])
            ->values()
            ->all();

        $byType = [
            ['name' => 'Asteroides', 'value' => $approaches->where('objectType', 'asteroid')->count()],
            ['name' => 'Cometas',    'value' => $approaches->where('objectType', 'comet')->count()],
        ];

        $closest = $approaches
            ->filter(fn (CloseApproachData $a) => $a->distanceAu !== null)
            ->sortBy('distanceAu')
            ->take(5)
            ->map(fn (CloseApproachData $a) => [
                'name'       => $a->displayName(),
                'distanceAu' => $a->distanceAu,
                'distanceKm' => $a->distanceKm(),
            ])
            ->values()
            ->all();

        $fastest = $approaches
            ->filter(fn (CloseApproachData $a) => $a->relativeVelocityKmS !== null)
            ->sortByDesc('relativeVelocityKmS')
            ->take(5)
            ->map(fn (CloseApproachData $a) => [
                'name'        => $a->displayName(),
                'velocityKmS' => $a->relativeVelocityKmS,
                'velocityKmH' => $a->relativeVelocityKmH(),
            ])
            ->values()
            ->all();

        $byBody = $approaches
            ->groupBy(fn (CloseApproachData $a) => $a->approachBody ?: 'Não informado')
            ->map(fn (Collection $items, string $body) => ['name' => $body, 'value' => $items->count()])
            ->values()
            ->all();

        return compact('byDay', 'byType', 'closest', 'fastest', 'byBody');
    }
}
