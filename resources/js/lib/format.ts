export const LUNAR_DISTANCE_KM = 384400;

function currentLocale(): 'pt-BR' | 'en' {
    if (typeof window === 'undefined') {
        return 'pt-BR';
    }

    return window.localStorage.getItem('caeli-view-locale') === 'en' ? 'en' : 'pt-BR';
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return currentLocale() === 'en' ? 'Unavailable' : 'Indisponível';
    }

    return new Intl.NumberFormat(currentLocale(), { maximumFractionDigits }).format(value);
}

export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return currentLocale() === 'en' ? 'No date' : 'Sem data';
    }

    return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

export function compactKm(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return currentLocale() === 'en' ? 'Unavailable' : 'Indisponível';
    }

    return `${formatNumber(value, 0)} km`;
}

export function lunarDistanceLabel(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return currentLocale() === 'en' ? 'No lunar distance' : 'Sem distância lunar';
    }

    return currentLocale() === 'en'
        ? `${formatNumber(value, value < 10 ? 1 : 0)}× the Moon’s distance`
        : `${formatNumber(value, value < 10 ? 1 : 0)}x a distância da Lua`;
}

export function lunarDistanceFromKm(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
    }

    return value / LUNAR_DISTANCE_KM;
}

export function compactMeters(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return currentLocale() === 'en' ? 'Unavailable' : 'Indisponível';
    }

    if (value >= 1000) {
        return `${formatNumber(value / 1000, 2)} km`;
    }

    return `${formatNumber(value, 0)} m`;
}
