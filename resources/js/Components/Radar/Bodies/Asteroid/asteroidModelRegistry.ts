import { useGLTF } from '@react-three/drei';
import type { ClosestNowObject } from '@/types';

/**
 * Metadados de um modelo 3D real de asteroide que pode ser usado na cena.
 */
export type AsteroidModelAsset = {
    key: 'bennu' | 'ceres' | 'eros' | 'itokawa' | 'vesta' | 'generic';
    url: string;
    rotation: [number, number, number];
    aliases: string[];
    numbers: string[];
    excludedVariants?: string[];
};

/**
 * Representação visual escolhida para um asteroide.
 */
export type AsteroidRenderableModel = { kind: 'real'; asset: AsteroidModelAsset };

const GENERIC_ASTEROID_MODEL: AsteroidModelAsset = {
    key: 'generic',
    url: '/models/asteroids/Asteroid_2f_small.glb',
    rotation: [0, 0, 0],
    aliases: [],
    numbers: [],
    excludedVariants: ['Asteroid_2f6'],
};

/**
 * Modelos GLB de asteroides com identidade conhecida.
 */
export const REAL_ASTEROID_MODELS: AsteroidModelAsset[] = [
    { key: 'bennu', url: '/models/asteroids/bennu.glb', rotation: [-0.12, 0.38, 0.04], aliases: ['bennu', 'rq36'], numbers: ['101955'] },
    { key: 'ceres', url: '/models/asteroids/ceres.glb', rotation: [0.08, -0.28, 0.02], aliases: ['ceres'], numbers: ['1'] },
    { key: 'itokawa', url: '/models/asteroids/itokawa.glb', rotation: [-0.2, 0.45, 0.08], aliases: ['itokawa'], numbers: ['25143'] },
    { key: 'eros', url: '/models/asteroids/eros.glb', rotation: [0.15, -0.32, -0.1], aliases: ['eros'], numbers: ['433'] },
    { key: 'vesta', url: '/models/asteroids/vesta.glb', rotation: [-0.06, 0.3, -0.04], aliases: ['vesta'], numbers: ['4'] },
];

// Inicia o download e parse dos GLBs imediatamente ao importar o módulo,
// antes de qualquer Canvas ou componente montar. Quando useGLTF for chamado
// dentro da cena os arquivos já estarão no cache do drei — elimina o travamento
// em cadeia no primeiro render.
const ALL_ASTEROID_URLS = [
    GENERIC_ASTEROID_MODEL.url,
    ...REAL_ASTEROID_MODELS.map((a) => a.url),
];
ALL_ASTEROID_URLS.forEach((url) => useGLTF.preload(url));

/**
 * Seleciona o modelo GLB para um objeto próximo.
 *
 * Usa o modelo específico quando a identidade é conhecida; caso contrário
 * usa o modelo genérico de asteroide.
 */
export function asteroidRenderableModelFor(object: ClosestNowObject): AsteroidRenderableModel {
    return { kind: 'real', asset: realAsteroidModelFor(object) ?? GENERIC_ASTEROID_MODEL };
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
