/**
 * Registro dos modelos GLB de cometa da cena do radar.
 *
 * Responsabilidade: mapear cada `modelKey` de cometa (knownComets.ts) ao seu asset GLB e expor o
 * preload. Contraparte cometária de `asteroidModelRegistry.ts`, separada porque os cometas têm asset
 * próprio (núcleo de cometa, não rocha) e regra de casamento simples por chave fixa.
 *
 * Dois assets hoje, ambos núcleos de cometa REAIS (shape models de missão, convertidos para GLB):
 *  - `c67p`: núcleo do 67P/Churyumov-Gerasimenko (Rosetta/DLR).
 *  - `generic-comet`: núcleo do 9P/Tempel 1 (Deep Impact), usado como forma representativa de Halley,
 *    Encke e NEOWISE, que não têm modelo próprio. Núcleo real e irregular, coerente com os asteroides;
 *    exclusivo de cometa, nunca usado em asteroides. Ver CREDITS.md.
 *
 * A cauda do cometa é desenhada à parte (decisão de produto), não faz parte destes GLBs.
 */

import { useGLTF } from '@react-three/drei';

/** Chave de modelo de cometa. `generic-comet` é o fallback dos cometas sem shape model real. */
export type CometModelKey = 'c67p' | 'generic-comet';

export type CometModelAsset = {
    key: CometModelKey;
    url: string;
    /** Rotação visual de repouso (rad), para o corpo não nascer num ângulo sem graça. */
    rotation: [number, number, number];
};

const COMET_MODELS: Record<CometModelKey, CometModelAsset> = {
    c67p: { key: 'c67p', url: '/models/comets/67p.glb', rotation: [0.1, -0.3, 0.05] },
    'generic-comet': { key: 'generic-comet', url: '/models/comets/comet_generic.glb', rotation: [0, 0, 0] },
};

/** Asset GLB de um modelKey de cometa (sempre existe; cai no genérico se a chave for desconhecida). */
export function cometModelAsset(key: CometModelKey): CometModelAsset {
    return COMET_MODELS[key] ?? COMET_MODELS['generic-comet'];
}

/**
 * Dispara o preload dos modelos de cometa. Chamado quando a cena fica visível (mesmo padrão dos
 * asteroides reais), para que selecionar um cometa não espere o download no clique.
 */
export function preloadCometModels(): void {
    Object.values(COMET_MODELS).forEach((a) => useGLTF.preload(a.url));
}
