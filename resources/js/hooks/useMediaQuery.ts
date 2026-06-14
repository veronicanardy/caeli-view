/**
 * Hook reativo de media query.
 *
 * Responsabilidade: observar uma media query CSS e devolver seu estado atual,
 * acompanhando mudanças de viewport (resize, rotação) sem recriar listeners.
 * Em ambiente sem `window` (SSR), retorna false até o primeiro render no browser.
 */

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() =>
        typeof window !== 'undefined' && window.matchMedia(query).matches,
    );

    useEffect(() => {
        const mql = window.matchMedia(query);
        setMatches(mql.matches);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}
