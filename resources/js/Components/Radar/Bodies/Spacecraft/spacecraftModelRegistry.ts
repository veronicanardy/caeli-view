/**
 * Registro dos modelos GLB reais das naves do radar.
 *
 * Responsabilidade: mapear cada nave (por horizonsId) ao seu modelo 3D oficial da NASA e expor o
 * preload. Contraparte de cometModelRegistry/asteroidModelRegistry para objetos artificiais. Os GLBs
 * são dados públicos da NASA (ver public/models/spacecraft/CREDITS.md); Voyager 1 e 2 são gêmeas e
 * compartilham o mesmo modelo.
 *
 * `rotation` é a rotação visual de repouso de cada modelo, calibrada para a nave nascer num ângulo
 * 3/4 agradável na cena (alguns GLBs vêm deitados ou de costas). Ajustada vendo na tela.
 */

import { useGLTF } from '@react-three/drei';

export type SpacecraftModelAsset = {
    url: string;
    /** Rotação visual de repouso (rad), para a nave não nascer num ângulo sem graça. */
    rotation: [number, number, number];
};

/** Modelo por horizonsId. Voyager 1 (-31) e Voyager 2 (-32) usam o mesmo GLB (gêmeas). */
const SPACECRAFT_MODELS: Record<string, SpacecraftModelAsset> = {
    '-31': { url: '/models/spacecraft/Voyager.glb', rotation: [0.15, 0.6, 0] },
    '-32': { url: '/models/spacecraft/Voyager.glb', rotation: [0.15, 0.6, 0] },
    '-23': { url: '/models/spacecraft/Pioneer_10.glb', rotation: [0.15, 0.6, 0] },
    '-98': { url: '/models/spacecraft/New_Horizons.glb', rotation: [0.15, 0.6, 0] },
    '-61': { url: '/models/spacecraft/Juno.glb', rotation: [0.15, 0.6, 0] },
};

/** Asset GLB de uma nave por horizonsId, ou null quando não há modelo (cai no marcador estilizado). */
export function spacecraftModelAsset(horizonsId: string): SpacecraftModelAsset | null {
    return SPACECRAFT_MODELS[horizonsId] ?? null;
}

/**
 * Dispara o preload dos modelos de nave. Chamado quando a cena fica visível (mesmo padrão dos
 * asteroides/cometas reais), para que focar uma nave não espere o download no clique.
 */
export function preloadSpacecraftModels(): void {
    const seen = new Set<string>();
    for (const asset of Object.values(SPACECRAFT_MODELS)) {
        if (seen.has(asset.url)) continue;
        seen.add(asset.url);
        useGLTF.preload(asset.url);
    }
}
