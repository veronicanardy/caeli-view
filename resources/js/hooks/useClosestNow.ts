import { useEffect, useMemo, useRef, useState } from 'react';
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
 * Mantém os dados anteriores visíveis enquanto o novo lote carrega (stale-while-loading).
 *
 * `loading` sobe para `true` de forma síncrona (via useMemo) assim que qualquer dep
 * muda — antes mesmo do useEffect disparar o fetch. Isso garante que o overlay
 * "Carregando…" apareça no mesmo frame que o usuário clica num chip ou muda o critério.
 */
export function useClosestNow(
    dateMin:  string,
    dateMax:  string,
    limit:    ObjectLimit,
    mode:     SelectionMode,
    refreshNonce: number = 0,
): UseClosestNowResult {
    const [data,         setData]         = useState<ClosestNowResponse | null>(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [error,        setError]        = useState<string | null>(null);

    // Ref para o dado anterior: mantido entre fetches para stale-while-loading.
    const staleDataRef = useRef<ClosestNowResponse | null>(null);

    // Ref dos params atualmente resolvidos (pós-fetch bem-sucedido).
    // Comparado com os params atuais para detectar mudança antes do useEffect.
    const resolvedParamsRef = useRef<string | null>(null);
    const currentParams = `${dateMin}|${dateMax}|${limit}|${mode}|${refreshNonce}`;

    // Síncrono: loading é true se os params atuais diferem dos últimos resolvidos
    // OU se o fetch ainda está em andamento. Não depende do ciclo de useEffect.
    const loading = useMemo(
        () => fetchLoading || resolvedParamsRef.current !== currentParams,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [fetchLoading, currentParams],
    );

    useEffect(() => {
        const controller = new AbortController();
        setFetchLoading(true);
        setError(null);

        const params = new URLSearchParams({
            date_min: dateMin,
            date_max: dateMax,
            limit:    String(limit),
            mode,
        });
        if (refreshNonce > 0) params.set('force_refresh', '1');

        const headers: HeadersInit = { Accept: 'application/json' };
        if (refreshNonce > 0) headers['Cache-Control'] = 'no-cache';

        fetch(`/radar/closest-now?${params.toString()}`, {
            signal:      controller.signal,
            credentials: 'same-origin',
            headers,
        })
            .then((response) => {
                if (!response.ok) throw new Error('Closest-now unavailable.');
                return response.json() as Promise<ClosestNowResponse>;
            })
            .then((payload) => {
                staleDataRef.current = payload;
                resolvedParamsRef.current = currentParams;
                setData(payload);
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                // Em caso de erro marcamos como resolvido mesmo assim para não
                // deixar o loading preso; o erro é exibido via prop `error`.
                resolvedParamsRef.current = currentParams;
                setError(
                    'Não foi possível carregar os dados do radar agora. ' +
                    'Os dados de posição em tempo real estão temporariamente indisponíveis.',
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) setFetchLoading(false);
            });

        return () => controller.abort();
    // currentParams é derivado de dateMin/dateMax/limit/mode — usar as fontes diretas
    // nas deps garante que o efeito re-dispara corretamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateMin, dateMax, limit, mode, refreshNonce]);

    return { data: data ?? staleDataRef.current, loading, error };
}
