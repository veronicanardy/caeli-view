/**
 * Transformações de coordenadas compartilhadas entre o modo radar e o modo órbita.
 *
 * Convenções:
 * - O JPL Horizons retorna vetores eclípticos em km, com a Terra como origem de medição.
 * - Eixos da cena: eclíptico X → cena X, eclíptico Z → cena Y, eclíptico −Y → cena Z.
 *   Isso coloca o plano eclíptico em XZ (onde ficam os anéis de DL) e o norte eclíptico em +Y da cena.
 * - horizonsToScene (abaixo) serve a régua LOG LEGADA, acessível só atrás de `?log`: "1 unidade de
 *   cena = 1 DL", comprimido radialmente via compressSceneVector (em sceneEphemeris.ts) — direção
 *   preservada, só a magnitude reescalonada. O caminho PADRÃO é a régua linear em UA, que projeta os
 *   vetores via makeHelioLinearProjector / helioAUToSunCenteredScene, sem passar por aqui.
 *
 * Tudo neste arquivo é puro: mesma entrada → mesma saída, sem I/O nem DOM.
 */

import type { SunDirection } from '@/types';
import { KM_PER_LD, compressSceneVector } from '@/lib/sceneEphemeris';

/**
 * [Régua log legada, `?log`] Transforma um vetor geocêntrico eclíptico (km) em vetor de cena radar
 * (unidades de cena, pós compressão logarítmica). A troca Y ↔ Z alinha o plano eclíptico com o plano
 * XZ da cena; a compressão radial mantém direção e inclinação honestas enquanto recolhe o enorme gap
 * até o Sol. NÃO é o caminho padrão (esse é a régua linear em UA).
 */
export function horizonsToScene(xKm: number, yKm: number, zKm: number): [number, number, number] {
    return compressSceneVector([
        xKm / KM_PER_LD,
        zKm / KM_PER_LD,
        -yKm / KM_PER_LD,
    ]);
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
