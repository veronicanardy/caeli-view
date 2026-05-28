import { ComparisonObject } from './comparisonObjects';

export function getAsteroidAverageDiameter(min: number | null, max: number | null, fallback: number | null): number | null {
    if (min !== null && max !== null) {
        return (min + max) / 2;
    }

    return min ?? max ?? fallback;
}

export function formatMeters(value: number | null, locale: string): string {
    if (value === null || Number.isNaN(value)) {
        return locale === 'en' ? 'Unavailable' : 'Indisponível';
    }

    return `${new Intl.NumberFormat(locale === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: value >= 100 ? 0 : 1 }).format(value)} m`;
}

export function buildComparisonSentence(asteroidMeters: number | null, reference: ComparisonObject, locale: string): string {
    const label = locale === 'en' ? reference.labelEn : reference.labelPt;
    const labelPt = reference.labelPt.toLowerCase();
    const articlePt = articleFor(reference.id);

    if (!asteroidMeters) {
        return locale === 'en'
            ? 'There is not enough diameter data for a reliable visual comparison.'
            : 'Ainda não há diâmetro suficiente para uma comparação visual confiável.';
    }

    const ratio = asteroidMeters / reference.sizeMeters;
    const formatter = new Intl.NumberFormat(locale === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: ratio < 10 ? 1 : 0 });

    if (ratio >= 0.9 && ratio <= 1.15) {
        return locale === 'en'
            ? `This asteroid is almost the same size as a ${label.toLowerCase()}.`
            : `Este asteroide tem um tamanho muito próximo ao de ${articlePt} ${labelPt}.`;
    }

    if (ratio > 1) {
        return locale === 'en'
            ? `This asteroid is about ${formatter.format(ratio)} times larger than a ${label.toLowerCase()}.`
            : `Este asteroide é cerca de ${formatter.format(ratio)} vezes maior que ${articlePt} ${labelPt}.`;
    }

    const inverse = reference.sizeMeters / asteroidMeters;
    const inverseLabel = new Intl.NumberFormat(locale === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: inverse < 10 ? 1 : 0 }).format(inverse);

    return locale === 'en'
        ? `This asteroid is about ${inverseLabel} times smaller than a ${label.toLowerCase()}.`
        : `Este asteroide é cerca de ${inverseLabel} vezes menor que ${articlePt} ${labelPt}.`;
}

function articleFor(id: string): string {
    if (['person', 'liberty'].includes(id)) {
        return 'uma';
    }

    return 'um';
}
