/**
 * Responsabilidade: política ÚNICA de tamanho visual dos asteroides na cena 3D do radar.
 *
 * Por que existe: o raio real de um asteroide nessa escala (1 DL = 384.400 km) é sub-pixel
 * (a régua de distância é linear e fiel, ver ./README.md). Usar o tamanho real os tornaria
 * invisíveis. Em vez disso, mapeamos o diâmetro físico para um raio visual por escala LOGARÍTMICA
 * contínua, dentro de uma faixa estreita [MIN, MAX]: "maior parece maior, menor parece menor" de
 * forma monotônica e legível, mantendo todos visíveis e inequivocamente menores que qualquer planeta.
 *
 * Calibrada pelo AMBIENTE inteiro: a faixa fica abaixo do menor planeta (Mercúrio, 0,028 DL); só os
 * corpos gigantes (Ceres ~939 km, Vesta ~525 km, planeta-anão / quase) chegam perto do teto, na
 * fronteira com Mercúrio, enquanto os pequenos (Itokawa, Bennu) ficam perto do piso. A ordem por
 * tamanho do elenco real é sempre preservada.
 *
 * Esta é a fonte única dessa política: tanto os asteroides do feed (AsteroidMarker) quanto os
 * conhecidos/famosos (KnownAsteroidsLayer) e os cometas (KnownCometsLayer) consomem
 * `symbolicRockRadiusFromDiameter`. Antes havia duas regras divergentes (feed em degraus; conhecidos
 * fixos no raio de Marte 0,048), o que fazia o MESMO Bennu aparecer 6× maior conforme o pipeline.
 * Depois disso a regra virou degraus por classe; agora é log contínuo (degraus achatavam vizinhos,
 * ex.: Bennu e Eros no mesmo degrau).
 *
 * Invariantes (travados em tests/js/Radar/symbolicRockScale.test.ts):
 *  1. Monotonicidade: diâmetro maior nunca produz raio menor (com a curva, ESTRITAMENTE maior dentro
 *     da faixa, então corpos de diâmetros distintos não colapsam no mesmo tamanho).
 *  2. Piso de visibilidade: nenhuma rocha some (todas ≥ MIN_ROCK_RADIUS_DL).
 *  3. Teto de honestidade: a maior rocha ainda é MENOR que o menor planeta (Mercúrio, 0,028 DL),
 *     logo nenhum asteroide compete visualmente com um planeta.
 */

/**
 * Raio visual mínimo de um asteroide (DL). Garante que a menor rocha permaneça visível.
 *
 * 0,003 (era 0,006): abaixar o piso ABRE a faixa da curva log, então a diferença entre uma rocha
 * pequena (Itokawa, Bennu) e uma grande (Vesta, Ceres) fica mais perceptível, aproximando-se do
 * abismo de tamanho real entre elas (Ceres é ~2800× Itokawa). As pequenas ficam mais miúdas, que é
 * justamente o efeito honesto desejado. A esfera menor não atrapalha o clique: a hitbox é separada e
 * generosa (HITBOX_RADIUS em AsteroidMarker). A razão Terra:rocha-pequena melhora de graça com isso,
 * sem mexer no raio da Terra (que ancora a cena inteira).
 */
export const MIN_ROCK_RADIUS_DL = 0.003;

/**
 * Raio visual máximo de um asteroide (DL). Fica abaixo do raio visual de Mercúrio (0,028 DL),
 * o menor planeta da cena, para que nenhum asteroide pareça um planeta. Ver planetData.ts.
 *
 * 0,026 (era 0,022): com a escala logarítmica abaixo, só os corpos GIGANTES (Ceres ~939 km, Vesta
 * ~525 km) chegam perto do teto, e ainda assim ficam sob Mercúrio. Eles são planeta-anão / quase, faz
 * sentido serem as maiores rochas, na fronteira com o menor planeta.
 */
export const MAX_ROCK_RADIUS_DL = 0.026;

/**
 * Faixa de diâmetros (metros) mapeada pela curva log. Calibrada pelo elenco real da cena:
 *  - piso ~100 m: abaixo disso (raros sub-100 m do feed) tudo vira o menor raio;
 *  - teto ~950 km: Ceres (939 km), a maior rocha do Sistema Solar, ancora o topo.
 * Diâmetros entre os extremos interpolam em log10, então a ORDEM por tamanho é sempre preservada
 * (Itokawa < Bennu < Eros < Vesta < Ceres) com diferença perceptível, sem degraus achatando vizinhos.
 */
const DIAMETER_FLOOR_M = 100;
const DIAMETER_CEIL_M = 950_000;

/** Raio usado quando não há diâmetro nem magnitude para estimar — meio da curva (em log). */
const UNKNOWN_ROCK_RADIUS_DL = 0.012;

/**
 * Diâmetro físico (metros) → raio visual (DL), por escala LOGARÍTMICA contínua.
 *
 * Por que log (e não linear nem degraus): o elenco da cena vai de ~330 m (Itokawa) a ~939 km (Ceres),
 * quase 4 ordens de grandeza. Linear deixaria Ceres ~2800× Bennu (Ceres viraria um planeta e os
 * pequenos sumiriam no piso). Degraus fixos achatavam vizinhos (Bennu e Eros caíam no mesmo degrau).
 * O log dá "maior parece maior, menor parece menor" de forma monotônica e legível, dentro de uma
 * faixa estreita [MIN, MAX] que mantém TODA rocha visível e sob o menor planeta (Mercúrio, 0,028).
 *
 * `null` (diâmetro desconhecido) cai no meio da curva em vez de gerar uma rocha enorme.
 */
export function symbolicRockRadiusFromDiameter(diameterMeters: number | null): number {
    if (diameterMeters == null) return UNKNOWN_ROCK_RADIUS_DL;

    const clamped = Math.min(Math.max(diameterMeters, DIAMETER_FLOOR_M), DIAMETER_CEIL_M);
    const t = (Math.log10(clamped) - Math.log10(DIAMETER_FLOOR_M))
        / (Math.log10(DIAMETER_CEIL_M) - Math.log10(DIAMETER_FLOOR_M)); // 0..1
    return MIN_ROCK_RADIUS_DL + t * (MAX_ROCK_RADIUS_DL - MIN_ROCK_RADIUS_DL);
}

/**
 * Estima o diâmetro (metros) de um asteroide a partir do que o feed fornece, com fallbacks:
 *  - usa `diameterMeters` quando presente;
 *  - senão, a média dos limites estimados min/max do feed;
 *  - senão, deriva da magnitude absoluta H pela relação padrão D[km] = 1329/√(albedo) · 10^(−H/5),
 *    com a faixa de albedo assumida pelo JPL (0,25 → limite inferior de D; 0,05 → superior); a
 *    média dos extremos é o diâmetro usado. × 1000 converte km → m.
 * Retorna null quando nada disso está disponível.
 */
export function estimateAsteroidDiameterMeters(input: {
    diameterMeters?: number | null;
    estimatedDiameterMinMeters?: number | null;
    estimatedDiameterMaxMeters?: number | null;
    absoluteMagnitude?: number | null;
}): number | null {
    const h = input.absoluteMagnitude;
    const dFromH = (albedo: number): number | null =>
        h != null ? (1329 / Math.sqrt(albedo)) * Math.pow(10, -h / 5) * 1000 : null;

    const dMin = input.estimatedDiameterMinMeters ?? dFromH(0.25);
    const dMax = input.estimatedDiameterMaxMeters ?? dFromH(0.05);
    return (
        input.diameterMeters
        ?? (dMin != null && dMax != null ? Math.round((dMin + dMax) / 2) : dMax ?? dMin)
        ?? null
    );
}
