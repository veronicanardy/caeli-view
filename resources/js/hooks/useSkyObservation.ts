import { useEffect, useState } from 'react';
import { hasValidCoordinates, UserLocation } from './useUserLocation';
import { fetchSkyObservation, SkyObservation } from '@/services/skyObservationService';

export function useSkyObservation(location: UserLocation | null) {
    const [data, setData] = useState<SkyObservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!hasValidCoordinates(location)) {
            setData(null);
            setLoading(false);
            setError(null);

            return undefined;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        fetchSkyObservation(location, controller.signal)
            .then((observation) => setData(observation))
            .catch(() => {
                setError('Não foi possível atualizar o céu agora.');
                setData({
                    cloudCover: null,
                    precipitationProbability: null,
                    temperature: null,
                    windSpeed: null,
                    visibility: null,
                    seeing: null,
                    transparency: null,
                    summaryPt: 'Mostrando uma estimativa visual enquanto os dados do céu não chegam.',
                    summaryEn: 'Showing a visual estimate while sky data is unavailable.',
                    source: 'fallback',
                });
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [location?.latitude, location?.longitude, location?.source]);

    return { data, loading, error };
}
