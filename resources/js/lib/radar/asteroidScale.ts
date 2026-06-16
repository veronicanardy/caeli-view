/**
 * Responsabilidade: política ÚNICA de tamanho visual dos asteroides na cena 3D do radar.
 *
 * Por que existe: o raio real de um asteroide nessa escala (1 DL = 384.400 km) é sub-pixel
 * (a régua de distância é linear e fiel, ver ./README.md). Usar o tamanho real os tornaria
 * invisíveis. Em vez disso, mapeamos o diâmetro físico para um raio visual SIMBÓLICO em degraus
 * por classe de tamanho. Os degraus dão uma pista grosseira de "maior/menor" mantendo todos
 * visíveis e inequivocamente menores que qualquer planeta.
 *
 * Esta é a fonte única dessa política: tanto os asteroides do feed (AsteroidMarker) quanto os
 * conhecidos/famosos (KnownAsteroidsLayer) consomem `symbolicRockRadiusFromDiameter`. Antes havia
 * duas regras divergentes (feed em degraus 0,006–0,022; conhecidos fixos no raio de Marte 0,048),
 * o que fazia o MESMO Bennu aparecer 6× maior conforme o pipeline que o desenhou, e rochas de
 * centenas de metros parecerem do tamanho de um planeta. Centralizar elimina essa incoerência.
 *
 * Invariantes (travados em tests/js/Radar/symbolicRockScale.test.ts):
 *  1. Monotonicidade: diâmetro maior nunca produz raio menor.
 *  2. Piso de visibilidade: nenhuma rocha some (todas ≥ MIN_ROCK_RADIUS_DL).
 *  3. Teto de honestidade: a maior rocha ainda é MENOR que o menor planeta (Mercúrio, 0,028 DL),
 *     logo nenhum asteroide compete visualmente com um planeta.
 */

/** Raio visual mínimo de um asteroide (DL). Garante que a menor rocha permaneça visível. */
export const MIN_ROCK_RADIUS_DL = 0.006;

/**
 * Raio visual máximo de um asteroide (DL). Fica abaixo do raio visual de Mercúrio (0,028 DL),
 * o menor planeta da cena, para que nenhum asteroide pareça um planeta. Ver planetData.ts.
 */
export const MAX_ROCK_RADIUS_DL = 0.022;

/** Raio usado quando não há diâmetro nem magnitude para estimar — degrau intermediário seguro. */
const UNKNOWN_ROCK_RADIUS_DL = 0.013;

/**
 * Diâmetro físico (metros) → raio visual simbólico (DL), em degraus monotônicos.
 *
 * Os limiares (10 / 50 / 150 / 500 / 1000 m) são classes grosseiras de tamanho de NEO; o salto
 * entre degraus é pequeno de propósito, para sugerir "maior/menor" sem exagerar a diferença.
 * `null` (diâmetro desconhecido) cai num degrau intermediário em vez de gerar uma rocha enorme.
 */
export function symbolicRockRadiusFromDiameter(diameterMeters: number | null): number {
    if (diameterMeters == null) return UNKNOWN_ROCK_RADIUS_DL;
    if (diameterMeters < 10)   return MIN_ROCK_RADIUS_DL; // 0.006
    if (diameterMeters < 50)   return 0.008;
    if (diameterMeters < 150)  return 0.010;
    if (diameterMeters < 500)  return 0.013;
    if (diameterMeters < 1000) return 0.017;
    return MAX_ROCK_RADIUS_DL; // 0.022 — teto de honestidade (< Mercúrio)
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
