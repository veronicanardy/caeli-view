import { useEffect, useState } from 'react';
import { hasValidCoordinates, UserLocation } from './useUserLocation';
import type { VisibleObject } from '@/services/visibleObjectsService';

type VisibleObjectsResult = {
    objects: VisibleObject[];
    moonIllumination: number;
    favorable: VisibleObject[];
};

const EMPTY: VisibleObjectsResult = { objects: [], moonIllumination: 0, favorable: [] };

export function useVisibleObjects(location: UserLocation | null): VisibleObjectsResult {
    const [result, setResult] = useState<VisibleObjectsResult>(EMPTY);

    useEffect(() => {
        if (!hasValidCoordinates(location)) {
            return;
        }

        let cancelled = false;

        import('@/services/visibleObjectsService').then(({ calculateVisibleObjects, moonIlluminationPercent }) => {
            if (cancelled) return;
            const objects = calculateVisibleObjects(location);
            setResult({
                objects,
                moonIllumination: moonIlluminationPercent(),
                favorable: objects.filter((o) => o.visible).slice(0, 3),
            });
        });

        return () => { cancelled = true; };
    }, [location?.latitude, location?.longitude, location?.source]);

    // moonIllumination inicial: calculado de forma síncrona e leve ao montar
    // (astronomy-engine ainda não carregou; o valor será atualizado quando o import terminar)
    return result;
}
