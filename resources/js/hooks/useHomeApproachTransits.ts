/**
 * Responsabilidade: alimentar o trânsito de dados e o contador vivo do hero.
 *
 * Faz um único fetch leve a `/radar/closest-now` (limite pequeno, modo nearest)
 * e devolve duas coisas: a lista enxuta { name, distanceKm } por objeto (que o
 * ApproachTransit cicla como riscos cruzando a cena) e a CONTAGEM total de
 * objetos avaliados na janela (candidatesEvaluated), que alimenta o contador
 * "N objetos perto da Terra agora". Diferente do useClosestNow do radar (que
 * carrega trajetórias, elementos orbitais e faz stale-while-loading por critério
 * interativo), aqui só interessam rótulo e contagem.
 *
 * Degrada em silêncio: sem rede ou sem objetos, lista vazia e contagem zero, e
 * tanto o trânsito quanto o contador simplesmente não aparecem.
 */

import { useEffect, useState } from 'react';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import type { ClosestNowResponse } from '@/types';

export type HomeApproachTransit = {
    id: string;
    name: string;
    distanceKm: number | null;
};

export type HomeApproachData = {
    transits: HomeApproachTransit[];
    /** Total de objetos com aproximação na janela (candidatesEvaluated). */
    nearbyCount: number;
};

// Poucos objetos: o hero não é o radar. Cinco bastam para a cena nunca repetir
// o mesmo rótulo em sequência sem pesar o fetch.
const TRANSIT_LIMIT = 5;

/**
 * Reduz a resposta do closest-now à lista enxuta de trânsitos. Pura e testável:
 * usa a distância ATUAL quando há e cai para a nominal da aproximação. O nome
 * vem sempre resolvido (resolveApproachIdentity garante um displayName não vazio,
 * com fallback genérico), então não há objeto sem rótulo a descartar.
 */
export function mapResponseToTransits(payload: ClosestNowResponse): HomeApproachTransit[] {
    return payload.objects.map((object): HomeApproachTransit => ({
        id: object.approach.id,
        name: resolveApproachIdentity(object.approach).displayName,
        distanceKm: object.currentDistanceKm ?? object.approach.nominalDistanceKm ?? null,
    }));
}

/**
 * Extrai a contagem de objetos próximos da resposta. Prefere candidatesEvaluated
 * (total avaliado na janela); cai para o número de objetos retornados quando o
 * campo falta. Pura e testável.
 */
export function nearbyCountFromResponse(payload: ClosestNowResponse): number {
    if (typeof payload.candidatesEvaluated === 'number' && payload.candidatesEvaluated > 0) {
        return payload.candidatesEvaluated;
    }
    return payload.objects.length;
}

export function useHomeApproachTransits(): HomeApproachData {
    const [data, setData] = useState<HomeApproachData>({ transits: [], nearbyCount: 0 });

    useEffect(() => {
        const controller = new AbortController();

        const params = new URLSearchParams({ limit: String(TRANSIT_LIMIT), mode: 'nearest' });
        fetch(`/radar/closest-now?${params.toString()}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('closest-now unavailable');
                return response.json() as Promise<ClosestNowResponse>;
            })
            .then((payload) => {
                setData({
                    transits: mapResponseToTransits(payload),
                    nearbyCount: nearbyCountFromResponse(payload),
                });
            })
            .catch(() => {
                // Silêncio: trânsito e contador apenas não aparecem.
            });

        return () => controller.abort();
    }, []);

    return data;
}
