/**
 * Busca a posição ATUAL das naves famosas via /radar/spacecraft.
 *
 * Responsabilidade: trazer do backend, uma vez por carga, os vetores em UA de cada nave (Voyager 1/2,
 * Pioneer 10/11, New Horizons, Juno, James Webb, Parker Solar Probe, Europa Clipper), resolvidos ao
 * vivo no JPL Horizons: o geocêntrico EXATO (geoAU) e o heliocêntrico aproximado (helioAU). A cena
 * (camada e foco de câmera) prefere `Terra_exata + geoAU` (importa nas naves próximas, ex.: James Webb
 * a 0,01 UA) e cai no fallback local (knownSpacecraft.ts) para as naves ausentes do payload, então
 * nenhuma nave some quando o Horizons falha.
 *
 * Fetch único no mount: o backend cacheia ~30 min e a posição das naves muda imperceptivelmente na
 * escala da cena durante uma sessão, então não há re-fetch por intervalo.
 */

import { useEffect, useState } from 'react';
import type { LiveSpacecraftPositions } from '@/Components/Radar/Bodies/Spacecraft/knownSpacecraft';

/** Vetor em UA (eclíptico J2000) de uma nave, do backend. */
export type SpacecraftHelioAU = { x: number; y: number; z: number };

type SpacecraftPositionResponse = {
    objects: Array<{
        horizonsId: string;
        id: string;
        name: string;
        helioAU: SpacecraftHelioAU;
        geoAU?: SpacecraftHelioAU;
    }>;
};

export interface UseSpacecraftPositionsResult {
    /** Mapa horizonsId → posição ao vivo (helioAU + geoAU). Naves sem posição não aparecem aqui. */
    positions: LiveSpacecraftPositions;
    loading: boolean;
}

export function useSpacecraftPositions(): UseSpacecraftPositionsResult {
    const [positions, setPositions] = useState<LiveSpacecraftPositions>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/radar/spacecraft', { signal: controller.signal, headers: { Accept: 'application/json' } })
            .then((res) => (res.ok ? (res.json() as Promise<SpacecraftPositionResponse>) : null))
            .then((data) => {
                if (!data?.objects) return;
                const map: LiveSpacecraftPositions = {};
                for (const obj of data.objects) {
                    if (obj.helioAU) map[obj.horizonsId] = { helioAU: obj.helioAU, geoAU: obj.geoAU };
                }
                setPositions(map);
            })
            .catch(() => {
                // Falha de rede: o front fica só com os fallbacks locais. Nenhuma nave some.
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, []);

    return { positions, loading };
}
