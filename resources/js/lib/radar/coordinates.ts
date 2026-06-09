/**
 * Transformações de coordenadas compartilhadas entre as cenas geocêntrica (radar) e heliocêntrica (órbita).
 *
 * Convenções:
 * - O JPL Horizons retorna vetores geocêntricos eclípticos em km.
 * - Eixos da cena: eclíptico X → cena X, eclíptico Z → cena Y, eclíptico −Y → cena Z.
 *   Isso coloca o plano eclíptico em XZ (onde ficam os anéis de DL) e o norte eclíptico em +Y da cena.
 * - "Unidades de cena" na camada geocêntrica significa "1 unidade = 1 DL", comprimido
 *   radialmente via compressSceneVector (em sceneEphemeris.ts) — a direção é preservada, só a
 *   magnitude é reescalonada.
 *
 * Tudo neste arquivo é puro: mesma entrada → mesma saída, sem I/O nem DOM.
 */

import type { SunDirection } from '@/types';
import { KM_PER_AU, KM_PER_LD, ORBIT_AU_SCALE, compressSceneVector } from '@/lib/sceneEphemeris';

/**
 * Transforma um vetor geocêntrico eclíptico (km) em um vetor de cena radar (unidades de cena,
 * pós compressão logarítmica). A troca Y ↔ Z alinha o plano eclíptico com o plano XZ da cena;
 * a compressão radial mantém direção e inclinação honestas enquanto recolhe o enorme gap até o Sol.
 */
export function horizonsToScene(xKm: number, yKm: number, zKm: number): [number, number, number] {
    return compressSceneVector([
        xKm / KM_PER_LD,
        zKm / KM_PER_LD,
        -yKm / KM_PER_LD,
    ]);
}

/**
 * Transforma um vetor geocêntrico eclíptico (km) em uma posição heliocêntrica de cena (unidades
 * de cena, pós compressão logarítmica), dado o ponto heliocêntrico da Terra em UA (eclíptico J2000).
 *
 * Por que: aplicar compressão logarítmica em um vetor geocêntrico e depois somar earthPos
 * (que é ele próprio comprimido heliocentricamente) NÃO produz a posição heliocêntrica correta
 * — as duas compressões não compõem linearmente. Para objetos próximos (< ~0,1 UA) o erro é
 * desprezível, mas para objetos do cinturão como Ceres ou Vesta (2–4 UA geocêntricas) o asteroide
 * aparece comprimido junto ao Sol em vez de estar na sua distância heliocêntrica real.
 *
 * Solução: converte geo (km) → geo (UA) → soma earthHelio (UA) → helio (UA) → escala LINEAR
 * compatível com helioToScene/ORBIT_AU_SCALE, para que o asteroide caia na mesma grade das
 * órbitas planetárias e do earthPos.
 */
export function horizonsGeoToHelioScene(
    xKm: number,
    yKm: number,
    zKm: number,
    earthHelioAU: { x: number; y: number; z: number },
): [number, number, number] {
    const helioX = earthHelioAU.x + xKm / KM_PER_AU;
    const helioY = earthHelioAU.y + yKm / KM_PER_AU;
    const helioZ = earthHelioAU.z + zKm / KM_PER_AU;
    // Convenção consistente com helioAUToSunCenteredScene e horizonsToScene:
    //   eclíptico (x, y, z) → cena (x, z, −y).
    // Norte eclíptico (z > 0) aponta para +Y da cena; escala LINEAR (ORBIT_AU_SCALE).
    return [
        helioX * ORBIT_AU_SCALE,
        helioZ * ORBIT_AU_SCALE,
        -helioY * ORBIT_AU_SCALE,
    ];
}

/** Retorna o vetor redimensionado para comprimento unitário, ou [0, 0, 0] se degenerado. */
export function normalize3(v: [number, number, number]): [number, number, number] {
    const len = Math.hypot(v[0], v[1], v[2]);
    if (len < 1e-12) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Converte a direção solar 2D do backend (x, y no plano eclíptico, z descartado) para a
 * convenção de eixos 3D da cena (eclíptico x/y → cena x/z, eclíptico z → cena y). O Sol
 * geocêntrico tem |z_ecl| ≲ 1e-4, então colapsar para zero está dentro da precisão visual
 * do radar — o astronomy-engine assume o controle assim que resolve e fornece o vetor 3D completo.
 */
export function sunDirectionFromIncoming(input: SunDirection): [number, number, number] {
    return normalize3([input.x, 0, input.y]);
}
