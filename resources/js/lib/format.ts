/**
 * Responsabilidade: formatar números, datas e distâncias astronômicas para exibição na interface.
 * Todas as funções respeitam o locale ativo (pt-BR ou en) via localStorage. Não depende de DOM
 * além da leitura do localStorage — pode ser usada em qualquer componente ou helper.
 */
import { LUNAR_DISTANCE_KM } from '@/lib/physicalConstants';
export { LUNAR_DISTANCE_KM };

/** Retorna o locale ativo da aplicação. Cai em pt-BR em ambiente Node (testes, SSR). */
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

/** Formata uma data ISO (YYYY-MM-DD) no estilo médio do locale ativo (ex.: "15 de mar. de 2026"). */
export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return currentLocale() === 'en' ? 'No date' : 'Sem data';
    }

    return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

/** Formata um valor em km com separador de milhar e sufixo "km". */
export function compactKm(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return currentLocale() === 'en' ? 'Unavailable' : 'Indisponível';
    }

    return `${formatNumber(value, 0)} km`;
}

/**
 * Versão aproximada de `compactKm` para leituras que mudam ao vivo: arredonda para
 * 3 algarismos significativos em notação por extenso ("1,09 milhão de km",
 * "465 mil km"), evitando a falsa precisão de 1 km de um valor dinâmico.
 * Abaixo de 10 000 km mantém o valor exato, nessa escala cada km importa.
 */
export function approxKm(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return currentLocale() === 'en' ? 'Unavailable' : 'Indisponível';
    }

    if (value < 10_000) {
        return compactKm(value);
    }

    const formatted = new Intl.NumberFormat(currentLocale(), {
        notation: 'compact',
        compactDisplay: 'long',
        maximumSignificantDigits: 3,
    }).format(value);

    // Em pt-BR, "milhão/bilhão" pede a preposição: "1,09 milhão de km".
    const needsDe = currentLocale() === 'pt-BR' && /lh(ão|ões)/.test(formatted);
    return `${formatted}${needsDe ? ' de' : ''} km`;
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

/** Formata um valor em metros: exibe em m abaixo de 1 000, converte para km acima disso. */
export function compactMeters(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return currentLocale() === 'en' ? 'Unavailable' : 'Indisponível';
    }

    if (value >= 1000) {
        return `${formatNumber(value / 1000, 2)} km`;
    }

    return `${formatNumber(value, 0)} m`;
}
