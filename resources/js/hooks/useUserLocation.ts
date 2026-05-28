import { useCallback, useEffect, useRef, useState } from 'react';

export type UserLocationSource = 'browser' | 'cached' | 'fallback' | 'unavailable';

export type UserLocationStatus =
    | 'idle'
    | 'checking-permission'
    | 'requesting'
    | 'granted'
    | 'denied'
    | 'timeout'
    | 'unsupported'
    | 'error';

export type UserLocation = {
    latitude: number | null;
    longitude: number | null;
    accuracy?: number | null;
    displayName: string;
    source: UserLocationSource;
    status: UserLocationStatus;
    detectedAt?: string | null;
    error?: string | null;
};

type LocationLocale = 'pt-BR' | 'en';

type CachedLocation = {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    displayName?: string | null;
    detectedAt: string;
    expiresAt: number;
};

type CachedPlaceName = {
    displayName: string;
    expiresAt: number;
};

type ReverseGeocodeResponse = {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    principalSubdivisionCode?: string;
    countryName?: string;
    countryCode?: string;
};

export const LOCATION_CACHE_KEY = 'caeli-view:last-browser-location';
const LOCATION_NAME_CACHE_PREFIX = 'caeli-view:reverse-geocode';

const LOCATION_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const LOCATION_NAME_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const GENERIC_DISPLAY_NAMES = new Set([
    'Aguardando localização',
    'Aguardando localizacao',
    'Localização atual detectada',
    'Localizacao atual detectada',
    'Usando última localização salva',
    'Usando ultima localizacao salva',
    'Usando localização padrão',
    'Usando localizacao padrao',
]);

const FALLBACK_COORDINATES = {
    latitude: -15.7939,
    longitude: -47.8828,
};

const EMPTY_LOCATION: UserLocation = {
    latitude: null,
    longitude: null,
    accuracy: null,
    displayName: 'Aguardando localização',
    source: 'unavailable',
    status: 'idle',
    detectedAt: null,
    error: null,
};

const FALLBACK_LOCATION: UserLocation = {
    ...FALLBACK_COORDINATES,
    accuracy: null,
    displayName: 'Usando localização padrão',
    source: 'fallback',
    status: 'error',
    detectedAt: null,
    error: 'Localização real indisponível.',
};

export function hasValidCoordinates(location: Pick<UserLocation, 'latitude' | 'longitude'> | null | undefined): location is UserLocation & { latitude: number; longitude: number } {
    return Boolean(
        location
        && typeof location.latitude === 'number'
        && typeof location.longitude === 'number'
        && Number.isFinite(location.latitude)
        && Number.isFinite(location.longitude)
        && Math.abs(location.latitude) <= 90
        && Math.abs(location.longitude) <= 180,
    );
}

export function locationStatusLabel(location: UserLocation, en = false): string {
    if (hasHumanDisplayName(location)) {
        return location.displayName;
    }

    if (location.source === 'browser' && location.status === 'granted') {
        return en ? 'Current location detected' : 'Localização atual detectada';
    }

    if (location.source === 'cached') {
        return en ? 'Using last saved location' : 'Usando última localização salva';
    }

    if (location.source === 'fallback') {
        return en ? 'Using default location' : 'Usando localização padrão';
    }

    if (location.status === 'checking-permission' || location.status === 'requesting' || location.status === 'idle') {
        return en ? 'Waiting for location' : 'Aguardando localização';
    }

    if (location.status === 'denied') {
        return en ? 'Location not allowed' : 'Localização não permitida';
    }

    if (location.status === 'timeout' || location.status === 'unsupported' || location.status === 'error' || location.source === 'unavailable') {
        return en ? 'Could not get your location' : 'Não foi possível obter sua localização';
    }

    return location.displayName;
}

export function useUserLocation(locale: LocationLocale = 'pt-BR') {
    const [location, setLocation] = useState<UserLocation>(EMPTY_LOCATION);
    const latestLocationRef = useRef<UserLocation>(EMPTY_LOCATION);

    const setTrackedLocation = useCallback((nextLocation: UserLocation) => {
        latestLocationRef.current = nextLocation;
        setLocation(nextLocation);
        debugLocation('source:', nextLocation.source);
        debugLocation('status:', nextLocation.status);
        debugLocation('final source:', nextLocation.source);
        debugLocation('final location used by home:', nextLocation);
    }, []);

    const applyCachedLocation = useCallback(() => {
        const cached = readCachedLocation();

        if (!cached) {
            return false;
        }

        setTrackedLocation({
            latitude: cached.latitude,
            longitude: cached.longitude,
            accuracy: cached.accuracy ?? null,
            displayName: cached.displayName && !GENERIC_DISPLAY_NAMES.has(cached.displayName) ? cached.displayName : 'Usando última localização salva',
            source: 'cached',
            status: 'requesting',
            detectedAt: cached.detectedAt,
            error: null,
        });
        debugLocation('source:', 'cached');
        debugLocation('status:', 'requesting');

        return true;
    }, [setTrackedLocation]);

    const applyFallback = useCallback((status: UserLocationStatus, error: string) => {
        const latest = latestLocationRef.current;

        if (latest.source === 'cached' && hasValidCoordinates(latest)) {
            setTrackedLocation({
                ...latest,
                displayName: locationStatusLabel({ ...latest, source: 'cached', status }, false),
                source: 'cached',
                status,
                error,
            });

            return;
        }

        setTrackedLocation({
            ...FALLBACK_LOCATION,
            status,
            error,
        });
    }, [setTrackedLocation]);

    const requestLocation = useCallback(() => {
        const hasCache = applyCachedLocation();

        if (!('geolocation' in navigator)) {
            debugLocation('geolocation supported:', false);
            applyFallback('unsupported', 'Geolocation unavailable in this browser.');

            return;
        }

        debugLocation('geolocation supported:', true);

        const startRequest = () => {
            const current = latestLocationRef.current;

            setTrackedLocation({
                ...current,
                displayName: current.source === 'cached' && hasValidCoordinates(current)
                    ? current.displayName
                    : 'Aguardando localização',
                status: 'requesting',
                error: null,
            });
            debugLocation('requesting browser location');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const browserLocation: UserLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        displayName: 'Localização atual detectada',
                        source: 'browser',
                        status: 'granted',
                        detectedAt: new Date().toISOString(),
                        error: null,
                    };

                    writeCachedLocation(browserLocation);
                    debugLocation('browser success:', {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    });
                    setTrackedLocation(browserLocation);
                },
                (error) => {
                    const status = geolocationErrorStatus(error);

                    debugLocation('browser error:', {
                        code: error.code,
                        message: error.message,
                    });
                    applyFallback(status, error.message || 'Browser geolocation failed.');
                },
                {
                    enableHighAccuracy: false,
                    timeout: 7000,
                    maximumAge: 0,
                },
            );
        };

        if ('permissions' in navigator && navigator.permissions?.query) {
            setTrackedLocation({
                ...(hasCache ? latestLocationRef.current : EMPTY_LOCATION),
                status: 'checking-permission',
                displayName: hasCache ? latestLocationRef.current.displayName : 'Aguardando localização',
            });

            navigator.permissions.query({ name: 'geolocation' as PermissionName })
                .then((permission) => {
                    debugLocation('permission state:', permission.state);
                    startRequest();
                })
                .catch((error: unknown) => {
                    debugLocation('permission state:', 'unavailable');
                    debugLocation('permission query error:', error);
                    startRequest();
                });

            return;
        }

        debugLocation('permission state:', 'unsupported');
        startRequest();
    }, [applyCachedLocation, applyFallback, setTrackedLocation]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    useEffect(() => {
        if (!hasValidCoordinates(location) || !shouldResolvePlaceName(location)) {
            return undefined;
        }

        const cachedName = readCachedPlaceName(location, locale);

        if (cachedName) {
            setTrackedLocation({ ...location, displayName: cachedName });

            return undefined;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);

        reverseGeocode(location, locale, controller.signal)
            .then((displayName) => {
                if (!displayName) {
                    return;
                }

                writeCachedPlaceName(location, locale, displayName);
                setTrackedLocation({ ...latestLocationRef.current, displayName });
                debugLocation('resolved displayName:', displayName);
            })
            .catch((error: unknown) => {
                if (import.meta.env.DEV) {
                    console.debug('[location] reverse geocode unavailable:', error);
                }
            })
            .finally(() => window.clearTimeout(timeout));

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [location.latitude, location.longitude, location.source, locale, setTrackedLocation]);

    return { location, requestLocation };
}

function geolocationErrorStatus(error: GeolocationPositionError): UserLocationStatus {
    if (error.code === error.PERMISSION_DENIED) {
        return 'denied';
    }

    if (error.code === error.TIMEOUT) {
        return 'timeout';
    }

    return 'error';
}

function readCachedLocation(): CachedLocation | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const value = window.localStorage.getItem(LOCATION_CACHE_KEY);

        if (!value) {
            return null;
        }

        const parsed = JSON.parse(value) as Partial<CachedLocation>;

        if (
            typeof parsed.latitude !== 'number'
            || typeof parsed.longitude !== 'number'
            || !Number.isFinite(parsed.latitude)
            || !Number.isFinite(parsed.longitude)
            || Math.abs(parsed.latitude) > 90
            || Math.abs(parsed.longitude) > 180
            || typeof parsed.expiresAt !== 'number'
            || parsed.expiresAt <= Date.now()
            || typeof parsed.detectedAt !== 'string'
        ) {
            window.localStorage.removeItem(LOCATION_CACHE_KEY);

            return null;
        }

        return {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : null,
            displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
            detectedAt: parsed.detectedAt,
            expiresAt: parsed.expiresAt,
        };
    } catch {
        window.localStorage.removeItem(LOCATION_CACHE_KEY);

        return null;
    }
}

function writeCachedLocation(location: UserLocation): void {
    if (typeof window === 'undefined' || !hasValidCoordinates(location) || location.source !== 'browser') {
        return;
    }

    const cached: CachedLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null,
        displayName: hasHumanDisplayName(location) ? location.displayName : null,
        detectedAt: location.detectedAt ?? new Date().toISOString(),
        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
    };

    window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));
}

function shouldResolvePlaceName(location: UserLocation): boolean {
    return (location.source === 'browser' || location.source === 'cached')
        && hasValidCoordinates(location)
        && !hasHumanDisplayName(location);
}

function hasHumanDisplayName(location: UserLocation): boolean {
    return Boolean(
        location.displayName
        && !GENERIC_DISPLAY_NAMES.has(location.displayName)
        && location.displayName.trim().length > 0,
    );
}

async function reverseGeocode(location: UserLocation & { latitude: number; longitude: number }, locale: LocationLocale, signal?: AbortSignal): Promise<string | null> {
    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        localityLanguage: locale === 'en' ? 'en' : 'pt',
    });
    const response = await fetch(`/proxy/reverse-geocode?${params}`, {
        signal,
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Reverse geocoding unavailable.');
    }

    const data = await response.json() as ReverseGeocodeResponse;

    return formatPlaceName(data, locale);
}

function formatPlaceName(data: ReverseGeocodeResponse, locale: LocationLocale): string | null {
    const city = data.city || data.locality;
    const regionCode = normalizeSubdivisionCode(data.principalSubdivisionCode);
    const region = regionCode || data.principalSubdivision;
    const country = data.countryCode || data.countryName;

    if (city && region) {
        return `${city}, ${region}`;
    }

    if (city && country) {
        return `${city}, ${country}`;
    }

    if (data.locality && data.principalSubdivision) {
        return `${data.locality}, ${data.principalSubdivision}`;
    }

    return locale === 'en' ? 'Current location detected' : 'Localização atual detectada';
}

function normalizeSubdivisionCode(value?: string): string | null {
    if (!value) {
        return null;
    }

    const code = value.includes('-') ? value.split('-').pop() : value;

    if (!code || code.length > 3) {
        return null;
    }

    return code.toUpperCase();
}

function placeNameCacheKey(location: UserLocation & { latitude: number; longitude: number }, locale: LocationLocale): string {
    return `${LOCATION_NAME_CACHE_PREFIX}:${locale}:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`;
}

function readCachedPlaceName(location: UserLocation & { latitude: number; longitude: number }, locale: LocationLocale): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const value = window.localStorage.getItem(placeNameCacheKey(location, locale));

        if (!value) {
            return null;
        }

        const parsed = JSON.parse(value) as Partial<CachedPlaceName>;

        if (typeof parsed.displayName !== 'string' || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
            window.localStorage.removeItem(placeNameCacheKey(location, locale));

            return null;
        }

        return parsed.displayName;
    } catch {
        window.localStorage.removeItem(placeNameCacheKey(location, locale));

        return null;
    }
}

function writeCachedPlaceName(location: UserLocation & { latitude: number; longitude: number }, locale: LocationLocale, displayName: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(placeNameCacheKey(location, locale), JSON.stringify({
        displayName,
        expiresAt: Date.now() + LOCATION_NAME_CACHE_TTL_MS,
    }));
}

function debugLocation(label: string, value?: unknown): void {
    if (!import.meta.env.DEV) {
        return;
    }

    if (value === undefined) {
        console.debug(`[location] ${label}`);

        return;
    }

    console.debug(`[location] ${label}`, value);
}
