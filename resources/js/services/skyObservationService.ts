import { UserLocation } from '@/hooks/useUserLocation';

type ValidUserLocation = UserLocation & {
    latitude: number;
    longitude: number;
};

export type SkyObservation = {
    cloudCover: number | null;
    precipitationProbability: number | null;
    temperature: number | null;
    windSpeed: number | null;
    visibility: number | null;
    seeing: string | null;
    transparency: string | null;
    summaryPt: string;
    summaryEn: string;
    source: string;
};

type OpenMeteoResponse = {
    current?: {
        temperature_2m?: number;
        cloud_cover?: number;
        precipitation_probability?: number;
        wind_speed_10m?: number;
        visibility?: number;
    };
};

type SevenTimerResponse = {
    dataseries?: Array<{
        cloudcover?: number;
        seeing?: number;
        transparency?: number;
    }>;
};

type OpenMeteoCurrent = NonNullable<OpenMeteoResponse['current']>;
type SevenTimerSeriesItem = NonNullable<SevenTimerResponse['dataseries']>[number];

const cache = new Map<string, { expires: number; data: SkyObservation }>();

export async function fetchSkyObservation(location: ValidUserLocation, signal?: AbortSignal): Promise<SkyObservation> {
    const key = `${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}`;
    const cached = cache.get(key);

    if (cached && cached.expires > Date.now()) {
        return cached.data;
    }

    const [weatherResult, astroResult] = await Promise.allSettled([
        fetchOpenMeteo(location, signal),
        fetchSevenTimer(location, signal),
    ]);
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const astro = astroResult.status === 'fulfilled' ? astroResult.value : null;
    const observation = buildObservation(weather, astro);

    cache.set(key, { expires: Date.now() + 1000 * 60 * 15, data: observation });

    return observation;
}

async function fetchOpenMeteo(location: ValidUserLocation, signal?: AbortSignal): Promise<OpenMeteoCurrent | null> {
    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: 'temperature_2m,cloud_cover,precipitation_probability,wind_speed_10m,visibility',
        forecast_days: '1',
        timezone: 'auto',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });

    if (!response.ok) {
        throw new Error('Open-Meteo unavailable.');
    }

    const data = await response.json() as OpenMeteoResponse;

    return data.current ?? null;
}

async function fetchSevenTimer(location: ValidUserLocation, signal?: AbortSignal): Promise<SevenTimerSeriesItem | null> {
    const params = new URLSearchParams({
        lon: String(location.longitude),
        lat: String(location.latitude),
    });
    const response = await fetch(`/proxy/sky-observation?${params}`, { signal });

    if (!response.ok) {
        throw new Error('7Timer unavailable.');
    }

    const data = await response.json() as SevenTimerResponse;

    return data.dataseries?.[0] ?? null;
}

function buildObservation(weather: OpenMeteoCurrent | null, astro: SevenTimerSeriesItem | null): SkyObservation {
    const cloudCover = weather?.cloud_cover ?? cloudCoverFrom7Timer(astro?.cloudcover) ?? null;
    const seeing = seeingLabel(astro?.seeing);
    const transparency = transparencyLabel(astro?.transparency);
    const precipitationProbability = weather?.precipitation_probability ?? null;
    const source = weather || astro ? ['Open-Meteo', astro ? '7Timer' : null].filter(Boolean).join(' + ') : 'fallback';
    let summaryPt = 'Condições estimadas para observação.';
    let summaryEn = 'Estimated observing conditions.';

    if (cloudCover !== null && cloudCover <= 25 && (precipitationProbability ?? 0) < 35) {
        summaryPt = 'Poucas nuvens — boa noite para observação.';
        summaryEn = 'Few clouds — a good night for observing.';
    } else if (cloudCover !== null && cloudCover <= 60) {
        summaryPt = 'Céu parcialmente limpo, observação razoável.';
        summaryEn = 'Partly clear sky, reasonable observing conditions.';
    } else if (cloudCover !== null) {
        summaryPt = 'Muitas nuvens podem atrapalhar a observação hoje.';
        summaryEn = 'Heavy cloud cover may disturb observing tonight.';
    }

    if ((precipitationProbability ?? 0) >= 55) {
        summaryPt = 'Chance de chuva alta — observação pouco favorável.';
        summaryEn = 'High rain chance — observing is not very favorable.';
    }

    return {
        cloudCover,
        precipitationProbability,
        temperature: weather?.temperature_2m ?? null,
        windSpeed: weather?.wind_speed_10m ?? null,
        visibility: weather?.visibility ?? null,
        seeing,
        transparency,
        summaryPt,
        summaryEn,
        source,
    };
}

function cloudCoverFrom7Timer(value?: number): number | null {
    if (value === undefined) {
        return null;
    }

    return Math.min(100, Math.max(0, value * 12.5));
}

function seeingLabel(value?: number): string | null {
    if (!value) {
        return null;
    }

    if (value <= 3) {
        return 'ótimo';
    }

    if (value <= 5) {
        return 'médio';
    }

    return 'instável';
}

function transparencyLabel(value?: number): string | null {
    if (!value) {
        return null;
    }

    if (value <= 3) {
        return 'boa';
    }

    if (value <= 5) {
        return 'média';
    }

    return 'baixa';
}
