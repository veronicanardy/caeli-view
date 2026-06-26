/**
 * Busca a posição ATUAL das naves famosas via /radar/spacecraft.
 *
 * Responsabilidade: trazer do backend, uma vez por carga, o vetor heliocêntrico em UA de cada nave
 * (Voyager 1/2, Pioneer 10, New Horizons, Juno), resolvido ao vivo no JPL Horizons. A cena (camada e
 * foco de câmera) usa essa posição quando disponível e cai no vetor fixo local (knownSpacecraft.ts)
 * para as naves ausentes do payload, então nenhuma nave some quando o Horizons falha.
 *
 * Fetch único no mount: o backend cacheia ~30 min e a posição de uma nave a dezenas de UA muda
 * imperceptivelmente na escala da cena durante uma sessão, então não há re-fetch por intervalo.
 */

import { useEffect, useState } from 'react';

/** Vetor heliocêntrico em UA (eclíptico J2000) de uma nave, do backend. */
export type SpacecraftHelioAU = { x: number; y: number; z: number };

type SpacecraftPositionResponse = {
    objects: Array<{ horizonsId: string; id: string; name: string; helioAU: SpacecraftHelioAU }>;
};

export interface UseSpacecraftPositionsResult {
    /** Mapa horizonsId → posição heliocêntrica ao vivo. Naves sem posição não aparecem aqui. */
    positions: Record<string, SpacecraftHelioAU>;
    loading: boolean;
}

export function useSpacecraftPositions(): UseSpacecraftPositionsResult {
    const [positions, setPositions] = useState<Record<string, SpacecraftHelioAU>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/radar/spacecraft', { signal: controller.signal, headers: { Accept: 'application/json' } })
            .then((res) => (res.ok ? (res.json() as Promise<SpacecraftPositionResponse>) : null))
            .then((data) => {
                if (!data?.objects) return;
                const map: Record<string, SpacecraftHelioAU> = {};
                for (const obj of data.objects) {
                    if (obj.helioAU) map[obj.horizonsId] = obj.helioAU;
                }
                setPositions(map);
            })
            .catch(() => {
                // Falha de rede: o front fica só com os vetores fixos locais. Nenhuma nave some.
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, []);

    return { positions, loading };
}
