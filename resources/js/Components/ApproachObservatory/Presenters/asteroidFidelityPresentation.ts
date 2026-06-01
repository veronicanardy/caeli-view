/**
 * Helpers de apresentação para o card de fidelidade visual.
 *
 * Organiza textos, labels e valores derivados simples que já chegam ao
 * presenter. Não calcula órbita, ranking, seleção global ou modelo físico real.
 */
import type { AsteroidModelMetadata, UnifiedApproach } from '@/types';

export function averageDiameter(approach: UnifiedApproach): number | null {
    if (approach.diameterMeters !== null) return approach.diameterMeters;
    if (approach.estimatedDiameterMinMeters !== null && approach.estimatedDiameterMaxMeters !== null) {
        return (approach.estimatedDiameterMinMeters + approach.estimatedDiameterMaxMeters) / 2;
    }
    return null;
}

export function seedFrom(value: string): number {
    let seed = 0;
    for (let index = 0; index < value.length; index += 1) {
        seed = (seed * 31 + value.charCodeAt(index)) % 100000;
    }
    return seed;
}

export function labelForLevel(level: AsteroidModelMetadata['fidelityLevel'], locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    return {
        N1: en ? 'Real shape model' : 'Modelo real de forma',
        N2: en ? 'Catalog reference' : 'Referência catalogada',
        N3: en ? 'Physics-informed procedural' : 'Procedural com dados físicos',
        N4: en ? 'Size-only procedural' : 'Procedural por tamanho',
        N5: en ? 'Placeholder only' : 'Placeholder',
    }[level];
}

export function modelKind(kind: AsteroidModelMetadata['modelKind'] | undefined, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    if (kind === 'real_shape') return en ? 'Real' : 'Real';
    if (kind === 'catalog_reference') return en ? 'Catalog' : 'Catálogo';
    if (kind === 'procedural') return en ? 'Procedural' : 'Procedural';
    return en ? 'Placeholder' : 'Placeholder';
}

export function fallbackNote(level: AsteroidModelMetadata['fidelityLevel'], locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    if (level === 'N5') {
        return en
            ? 'No reliable physical size is available yet, so this is only a neutral placeholder.'
            : 'Ainda não há tamanho físico confiável, então isto é apenas um placeholder neutro.';
    }
    return en
        ? 'The resolver is loading. A procedural preview is shown until cached model metadata arrives.'
        : 'O resolvedor está carregando. Uma prévia procedural aparece até os metadados em cache chegarem.';
}

export function localizedModelNote(
    model: AsteroidModelMetadata | null,
    level: AsteroidModelMetadata['fidelityLevel'],
    locale: 'pt-BR' | 'en',
): string {
    const en = locale === 'en';

    if (!model) return fallbackNote(level, locale);

    if (model.fidelityLevel === 'N3') {
        return en
            ? 'Procedural model generated from known diameter and orbital identity. The shape is illustrative, not a measured shape model.'
            : 'Modelo procedural gerado a partir do diâmetro conhecido e da identidade orbital. A forma é ilustrativa, não um modelo medido.';
    }

    if (model.fidelityLevel === 'N4') {
        return en
            ? 'Size-only procedural model generated from the available diameter range.'
            : 'Modelo procedural baseado apenas no intervalo de diâmetro disponível.';
    }

    if (model.fidelityLevel === 'N5') {
        return en
            ? 'No reliable physical size is available yet, so this is only a neutral placeholder.'
            : 'Ainda não há tamanho físico confiável, então isto é apenas um placeholder neutro.';
    }

    if (model.fidelityLevel === 'N2') {
        return en
            ? 'Catalog reference found, but no lightweight real model is configured yet.'
            : 'Referência catalogada encontrada, mas ainda sem modelo real leve configurado.';
    }

    return en
        ? 'Validated real shape model resolved by backend catalog.'
        : 'Modelo real de forma resolvido pelo catálogo do backend.';
}
