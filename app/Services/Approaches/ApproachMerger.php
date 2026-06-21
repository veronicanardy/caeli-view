<?php

namespace App\Services\Approaches;

use App\DTOs\Approaches\UnifiedApproachData;
use Illuminate\Support\Collection;

/**
 * Responsável por combinar e deduplicar listas de aproximações de fontes distintas (NeoWs e CAD).
 *
 * A deduplicação é feita por chave semântica (designação + data), evitando
 * que o mesmo objeto apareça duas vezes por vir de fontes diferentes.
 * A ordenação é aplicada após o merge para garantir consistência independente
 * da ordem em que as fontes retornaram os dados.
 */
final class ApproachMerger
{
    /**
     * Combina duas coleções de aproximações, remove duplicatas e ordena o resultado.
     *
     * @param  Collection<int, UnifiedApproachData>  $primary    Geralmente os itens do NeoWs
     * @param  Collection<int, UnifiedApproachData>  $secondary  Geralmente os itens do CAD
     * @param  string  $sort  Critério de ordenação (dist, -dist, v-rel, -v-rel, object, date)
     * @return Collection<int, UnifiedApproachData>
     */
    public function merge(Collection $primary, Collection $secondary, string $sort): Collection
    {
        $merged = $this->deduplicate($primary->concat($secondary));

        return $this->sort($merged, $sort);
    }

    /**
     * Remove entradas duplicadas usando a chave semântica de cada objeto.
     *
     * Em colisão entre fontes (mesmo objeto+data vindo do NeoWs E do CAD), o CAD vence:
     * é a solução orbital integrada do JPL (alta precisão), a mesma referência do NASA Eyes.
     * O NeoWs e o CAD reportam distâncias levemente distintas; usar a do CAD mantém o radar
     * coerente com o JPL, inclusive no corte por dist_max (um objeto na fronteira de 0,05 UA
     * não entra só porque a distância do NeoWs ficou abaixo do corte enquanto a do JPL não).
     *
     * Dentro da MESMA fonte, mantém a primeira ocorrência (ordem de chegada).
     */
    private function deduplicate(Collection $items): Collection
    {
        /** @var array<string, UnifiedApproachData> $byKey */
        $byKey = [];
        $order = [];

        foreach ($items as $approach) {
            if (! $approach instanceof UnifiedApproachData) {
                continue;
            }

            $key = $approach->dedupeKey();

            if (! isset($byKey[$key])) {
                $byKey[$key] = $approach;
                $order[]     = $key;
                continue;
            }

            // Já visto: só substitui se o novo for CAD e o guardado não for (CAD tem precedência).
            if ($approach->source === 'cad' && $byKey[$key]->source !== 'cad') {
                $byKey[$key] = $approach;
            }
        }

        return collect(array_map(static fn (string $k) => $byKey[$k], $order));
    }

    /**
     * Ordena a coleção de acordo com o critério solicitado.
     * Valores nulos são empurrados para o final em qualquer critério.
     */
    private function sort(Collection $items, string $sort): Collection
    {
        return match ($sort) {
            'dist'   => $items->sortBy(fn (UnifiedApproachData $i) => $i->nominalDistanceKm    ?? INF)->values(),
            '-dist'  => $items->sortByDesc(fn (UnifiedApproachData $i) => $i->nominalDistanceKm  ?? -INF)->values(),
            'v-rel'  => $items->sortBy(fn (UnifiedApproachData $i) => $i->relativeVelocityKms  ?? INF)->values(),
            '-v-rel' => $items->sortByDesc(fn (UnifiedApproachData $i) => $i->relativeVelocityKms ?? -INF)->values(),
            'object' => $items->sortBy('name')->values(),
            default  => $items->sortBy(fn (UnifiedApproachData $i) => $i->approachDate ?? '9999-99-99')->values(),
        };
    }
}
