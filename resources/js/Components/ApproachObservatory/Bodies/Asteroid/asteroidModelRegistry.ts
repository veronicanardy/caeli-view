import type { ClosestNowObject } from '@/types';
import { genericAsteroidVariantFor } from './asteroidProcedural';

/**
 * Metadados de um modelo 3D real de asteroide que pode ser usado na cena.
 *
 * Esses modelos são usados apenas quando a identidade do objeto pode ser
 * determinada com segurança por alias ou número de catálogo.
 */
export type AsteroidModelAsset = {
    key: 'bennu' | 'ceres' | 'eros' | 'itokawa' | 'vesta';
    url: string;
    rotation: [number, number, number];
    aliases: string[];
    numbers: string[];
};

/**
 * Representação visual escolhida para um asteroide.
 *
 * Um objeto pode ser renderizado como um modelo real conhecido ou como uma
 * rocha procedural genérica quando não há correspondência segura.
 */
export type AsteroidRenderableModel =
    | { kind: 'real'; asset: AsteroidModelAsset }
    | { kind: 'generic'; variant: string };

/**
 * Modelos GLB de asteroides reais usados para corpos com identidade conhecida.
 */
export const REAL_ASTEROID_MODELS: AsteroidModelAsset[] = [
    { key: 'bennu', url: '/models/asteroids/bennu.glb', rotation: [-0.12, 0.38, 0.04], aliases: ['bennu', 'rq36'], numbers: ['101955'] },
    { key: 'ceres', url: '/models/asteroids/ceres.glb', rotation: [0.08, -0.28, 0.02], aliases: ['ceres'], numbers: ['1'] },
    { key: 'itokawa', url: '/models/asteroids/itokawa.glb', rotation: [-0.2, 0.45, 0.08], aliases: ['itokawa'], numbers: ['25143'] },
    { key: 'eros', url: '/models/asteroids/eros.glb', rotation: [0.15, -0.32, -0.1], aliases: ['eros'], numbers: ['433'] },
    { key: 'vesta', url: '/models/asteroids/vesta.glb', rotation: [-0.06, 0.3, -0.04], aliases: ['vesta'], numbers: ['4'] },
];

/**
 * Seleciona a representação visual mais adequada para um objeto próximo.
 *
 * Primeiro tenta combinar o objeto com um modelo real conhecido. Caso não
 * haja correspondência segura, devolve uma variante procedural genérica.
 */
export function asteroidRenderableModelFor(object: ClosestNowObject): AsteroidRenderableModel {
    const realAsset = realAsteroidModelFor(object);
    if (realAsset) {
        return { kind: 'real', asset: realAsset };
    }

    return { kind: 'generic', variant: genericAsteroidVariantFor(object) };
}

/**
 * Determina se o objeto corresponde a um modelo real de asteroide.
 *
 * A correspondência é feita por alias textual e por número de catálogo.
 * Só devolvemos um modelo real quando a identidade é inequívoca.
 */
function realAsteroidModelFor(object: ClosestNowObject): AsteroidModelAsset | null {
    const textFields = [
        object.approach.name,
        object.approach.displayName,
        object.approach.rawName,
        object.approach.properName,
        object.approach.designation,
        object.approach.provisionalDesignation,
        object.approach.detailIdentifier,
        ...(object.approach.aliases ?? []),
    ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

    const catalogNumberFields = [
        object.approach.permanentNumber,
        object.approach.spkId,
    ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

    for (const asset of REAL_ASTEROID_MODELS) {
        if (asset.aliases.some((alias) => textFields.some((field) => fieldContainsWord(field, alias)))) {
            return asset;
        }

        if (asset.numbers.some((number) => catalogNumberFields.some((field) => fieldEqualsCatalogNumber(field, number)))) {
            return asset;
        }
    }

    return null;
}

/**
 * Verifica se um alias aparece como palavra inteira em um campo de texto.
 *
 * Isso evita falsos positivos por substring, como "ceres" combinando com
 * "cerebral".
 */
function fieldContainsWord(field: string, needle: string): boolean {
    const escaped = needle.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(field);
}

/**
 * Valida se um campo numérico canônico corresponde exatamente ao número de
 * catálogo esperado.
 */
function fieldEqualsCatalogNumber(field: string, number: string): boolean {
    const trimmed = field.trim().replace(/^\((\d+)\)$/, '$1');

    return trimmed === number;
}
