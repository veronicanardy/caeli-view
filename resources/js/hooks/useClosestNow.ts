import { useEffect, useRef, useState } from 'react';
import type { ClosestNowResponse, ObjectLimit, SelectionMode } from '@/types';

export interface UseClosestNowResult {
    data:    ClosestNowResponse | null;
    loading: boolean;
    error:   string | null;
}

/**
 * Busca os objetos selecionados para o radar via `/radar/closest-now`.
 *
 * Re-faz o fetch sempre que `dateMin`, `dateMax`, `limit` ou `mode` mudam.
 * Mantém os dados anteriores visíveis enquanto o novo lote carrega (stale-while-loading),
 * evitando o flash de tela vazia ao trocar quantidade ou critério.
 */
export function useClosestNow(
    dateMin:  string,
    dateMax:  string,
    limit:    ObjectLimit,
    mode:     SelectionMode,
): UseClosestNowResult {
    const [data,    setData]    = useState<ClosestNowResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    // Ref para o dado anterior: mantido entre fetches para stale-while-loading.
    const staleDataRef = useRef<ClosestNowResponse | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
            date_min: dateMin,
            date_max: dateMax,
            limit:    String(limit),
            mode,
        });

        fetch(`/radar/closest-now?${params.toString()}`, {
            signal:      controller.signal,
            credentials: 'same-origin',
            headers:     { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('Closest-now unavailable.');
                return response.json() as Promise<ClosestNowResponse>;
            })
            .then((payload) => {
                staleDataRef.current = payload;
                setData(payload);
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setError(
                    'Não foi possível carregar os dados do radar agora. ' +
                    'Os dados de posição em tempo real estão temporariamente indisponíveis.',
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [dateMin, dateMax, limit, mode]);

    // Enquanto carrega uma nova query, devolve os dados anteriores para não piscar a cena.
    return { data: data ?? staleDataRef.current, loading, error };
}
