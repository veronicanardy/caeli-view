/**
 * Busca o detalhe físico/orbital de um asteroide conhecido no JPL SBDB (via /radar/small-body),
 * para enriquecer o card do critério "Asteroides famosos" sem recarregar a página.
 *
 * Responsabilidade: dado o número de catálogo de um conhecido (ou null quando nenhum está
 * selecionado), buscar os dados ricos e mantê-los em cache por identificador. O card mostra a base
 * (nome, diâmetro, modelo) imediatamente e estes dados chegam depois (carregamento progressivo);
 * se a rede falhar, o hook apenas não entrega o detalhe, sem travar nada.
 */

import { useEffect, useRef, useState } from 'react';

/** Subconjunto de SmallBodyData::toArray() (backend) consumido pelo card. */
export type SmallBodyDetail = {
    designation: string | null;
    fullName: string | null;
    orbitClass: string | null;
    orbitClassDescription: string | null;
    objectType: string | null;
    absoluteMagnitude: number | null;
    diameterKm: number | null;
    albedo: number | null;
    rotationPeriodHours: number | null;
};

export interface UseKnownAsteroidDetailResult {
    detail: SmallBodyDetail | null;
    loading: boolean;
    error: string | null;
}

export function useKnownAsteroidDetail(identifier: string | null): UseKnownAsteroidDetailResult {
    const [detail, setDetail] = useState<SmallBodyDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cache por identificador: reabrir o mesmo conhecido não refaz a chamada.
    const cacheRef = useRef<Map<string, SmallBodyDetail>>(new Map());

    useEffect(() => {
        if (!identifier) {
            setDetail(null);
            setError(null);
            setLoading(false);
            return;
        }

        const cached = cacheRef.current.get(identifier);
        if (cached) {
            setDetail(cached);
            setError(null);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setDetail(null);

        fetch(`/radar/small-body/${encodeURIComponent(identifier)}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Small-body lookup failed.');
                return response.json() as Promise<SmallBodyDetail>;
            })
            .then((payload) => {
                cacheRef.current.set(identifier, payload);
                setDetail(payload);
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                // Falha não bloqueia o card: ele permanece com a base já visível.
                setError('Não foi possível carregar os detalhes deste asteroide agora.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [identifier]);

    return { detail, loading, error };
}
