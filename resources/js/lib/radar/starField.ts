/**
 * Geração PURA do campo estelar da cena 3D (sem React/DOM/three).
 *
 * Responsabilidade: produzir, de forma determinística, os buffers de posição, cor,
 * tamanho e opacidade por estrela do campo de fundo. A sensação de PROFUNDIDADE vem
 * daqui: as estrelas se espalham em várias camadas de distância e o tamanho/brilho de
 * cada uma varia com a camada (próximas maiores e mais nítidas, distantes minúsculas e
 * tênues), em vez de um céu uniforme. Puramente decorativo: não entra em nenhum cálculo
 * orbital.
 *
 * O componente `Overlays/StarField.tsx` só monta esses buffers em geometria three e os
 * desenha. Manter a matemática aqui deixa as regras de profundidade testáveis sem GPU.
 */

/** Número de camadas de profundidade. Mais camadas = transição de tamanho/brilho mais suave. */
export const STAR_LAYER_COUNT = 4;

/** Total de estrelas do campo. */
export const STAR_COUNT = 1400;

export type StarFieldBuffers = {
    /** xyz por estrela (length = count * 3). */
    positions: Float32Array;
    /** rgb por estrela (length = count * 3). */
    colors: Float32Array;
    /** Tamanho do ponto por estrela, em unidades de cena (length = count). */
    sizes: Float32Array;
    /** Opacidade [0..1] por estrela (length = count). */
    opacities: Float32Array;
};

/** RNG linear-congruente determinístico: mesmo seed → mesmo campo entre sessões. */
function makeRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

/**
 * Perfil de uma camada de profundidade: raio base, tamanho e brilho do ponto. As camadas
 * próximas (índice baixo) ficam mais perto, maiores e mais nítidas; as distantes ficam
 * mais longe, menores e mais apagadas. É essa gradação que cria a profundidade percebida.
 */
function layerProfile(layer: number, layers: number): { rNear: number; rSpan: number; size: number; opacity: number } {
    // t = 0 na camada mais próxima, 1 na mais distante.
    const t = layers <= 1 ? 0 : layer / (layers - 1);
    return {
        // Camada próxima ~300, distante ~900: faixas que não se sobrepõem fortemente.
        rNear: 300 + t * 560,
        rSpan: 90,
        // Próxima 0.34, distante 0.16: estrelas de fundo viram poeira fina (sem chegar tão baixo
        // a ponto de virarem subpixel e cintilarem; o tamanho em px tem piso no shader).
        size: 0.34 - t * 0.18,
        // Próxima 0.55, distante 0.22: o fundo é um brilho difuso atrás das camadas da frente.
        // Piso mais alto que antes para a estrela distante não tremular por alpha minúsculo.
        opacity: 0.55 - t * 0.33,
    };
}

/**
 * Monta os buffers do campo estelar de forma determinística.
 *
 * Cada estrela é sorteada numa camada de profundidade (distribuição que favorece as
 * camadas distantes, para o céu ter mais poeira fina ao fundo que pontos grandes na
 * frente) e recebe tamanho/opacidade derivados dessa camada, com um leve jitter por
 * estrela para o campo não parecer "anelado". A direção é uniforme na esfera.
 */
export function buildStarField(seed = 42, count = STAR_COUNT, layers = STAR_LAYER_COUNT): StarFieldBuffers {
    const rng = makeRng(seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        // Sorteio enviesado para as camadas distantes (rng²): mais estrelas pequenas ao fundo,
        // poucas grandes na frente — o que dá a leitura natural de "profundidade".
        const layer = Math.min(layers - 1, Math.floor(rng() * rng() * layers));
        const profile = layerProfile(layer, layers);

        // Direção uniforme na esfera (evita aglomerar nos polos).
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(2 * rng() - 1);
        const r = profile.rNear + rng() * profile.rSpan;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Cor: leve eixo quente↔frio, tom sóbrio (nada saturado).
        const warm = rng();
        colors[i * 3] = 0.82 + warm * 0.18;
        colors[i * 3 + 1] = 0.86 + rng() * 0.1;
        colors[i * 3 + 2] = 0.82 + (1 - warm) * 0.18;

        // Tamanho e opacidade da camada, com jitter por estrela (0.7..1.0) para o campo
        // não ficar uniforme dentro de uma mesma camada.
        const jitter = 0.7 + rng() * 0.3;
        sizes[i] = profile.size * jitter;
        opacities[i] = Math.min(1, profile.opacity * jitter);
    }

    return { positions, colors, sizes, opacities };
}
