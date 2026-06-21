/**
 * Registro dos modelos GLB de cometa da cena do radar.
 *
 * Responsabilidade: mapear cada `modelKey` de cometa (knownComets.ts) ao seu asset GLB e expor o
 * preload. Contraparte cometária de `asteroidModelRegistry.ts`, separada porque os cometas têm asset
 * próprio (núcleo de cometa, não rocha) e regra de casamento simples por chave fixa.
 *
 * Dois assets hoje:
 *  - `c67p`: shape model REAL do 67P/Churyumov-Gerasimenko (Rosetta/DLR), exclusivo do 67P.
 *  - `generic-comet`: reusa o MESMO GLB genérico texturizado dos asteroides (Asteroid_2f_small), como
 *    forma representativa de Halley e Encke (sem modelo próprio). Núcleo de cometa e asteroide escuro têm
 *    a mesma cor real (albedo ~0.04) e formato irregular, então o mesmo modelo serve aos dois.
 *
 * A cauda do cometa é desenhada à parte (decisão de produto), não faz parte destes GLBs.
 *
 * A COR não vive mais aqui: como o genérico do cometa É o mesmo GLB texturizado do asteroide, cometa e
 * asteroide têm cor/textura/iluminação idênticas por construção. A distinção visual do cometa é a cauda.
 */

import { useGLTF } from '@react-three/drei';
import type { ClosestNowObject } from '@/types';
import { knownCometById } from './knownComets';

/** Chave de modelo de cometa. `generic-comet` é o fallback dos cometas sem shape model real. */
export type CometModelKey = 'c67p' | 'generic-comet';

/**
 * Cor escura dedicada ao núcleo do 67P. O GLB do 67P (shape model da Rosetta) NÃO tem textura e traz um
 * cinza claro embutido (~0.30), que deixava o corpo lavado. Passada como fallbackColor só para o 67P,
 * pra ele ficar bem escuro (carvão real, albedo ~0.04) sem mexer nos outros corpos.
 *
 * Há duas variantes porque a iluminação difere: a cena é escura/dramática (cor bem carvão), o card é uma
 * vitrine iluminada onde a mesma cor sumiria, então o preview usa um tom um pouco mais claro.
 */
export const COMET_67P_COLOR = '#33383e';
export const COMET_67P_COLOR_PREVIEW = '#33383e';

export type CometModelAsset = {
    key: CometModelKey;
    url: string;
    /** Rotação visual de repouso (rad), para o corpo não nascer num ângulo sem graça. */
    rotation: [number, number, number];
};

const COMET_MODELS: Record<CometModelKey, CometModelAsset> = {
    c67p: { key: 'c67p', url: '/models/comets/67p.glb', rotation: [0.1, -0.3, 0.05] },
    // Cometa sem shape model próprio reusa o MESMO GLB genérico texturizado dos asteroides: núcleo de
    // cometa e asteroide escuro têm a mesma cor real (albedo ~0.04) e formato irregular, então o mesmo
    // modelo serve aos dois. Usar o mesmo asset garante cor/textura/iluminação idênticas (resolve o
    // descasamento de cor que havia quando o cometa usava um GLB sem textura).
    'generic-comet': { key: 'generic-comet', url: '/models/asteroids/Asteroid_2f_small.glb', rotation: [0, 0, 0] },
};

/** Asset GLB de um modelKey de cometa (sempre existe; cai no genérico se a chave for desconhecida). */
export function cometModelAsset(key: CometModelKey): CometModelAsset {
    return COMET_MODELS[key] ?? COMET_MODELS['generic-comet'];
}

/**
 * Asset de cometa para um objeto do feed, ou null se o objeto não for um cometa conhecido. Casa o id
 * sintético (comet:<designacao>) com o catálogo (knownCometById) e devolve o GLB do seu modelKey.
 * Usado pelo AsteroidMarker para desenhar um cometa do feed com seu núcleo real, não com a rocha genérica.
 */
export function cometModelForObject(object: ClosestNowObject): CometModelAsset | null {
    if (object.approach.objectType !== 'comet') return null;
    const comet = knownCometById(object.approach.id);
    return comet ? cometModelAsset(comet.modelKey) : null;
}

/**
 * Dispara o preload dos modelos de cometa. Chamado quando a cena fica visível (mesmo padrão dos
 * asteroides reais), para que selecionar um cometa não espere o download no clique.
 */
export function preloadCometModels(): void {
    Object.values(COMET_MODELS).forEach((a) => useGLTF.preload(a.url));
}
