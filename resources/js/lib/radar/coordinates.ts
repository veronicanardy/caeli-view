/**
 * Transformações de coordenadas da direção solar para a cena do radar.
 *
 * Convenções de eixos da cena: eclíptico X → cena X, eclíptico Z → cena Y, eclíptico −Y → cena Z.
 * Isso coloca o plano eclíptico em XZ e o norte eclíptico em +Y da cena. A projeção das posições é
 * feita pela régua linear em UA (makeHelioLinearProjector / helioAUToSunCenteredScene), não aqui.
 *
 * Tudo neste arquivo é puro: mesma entrada → mesma saída, sem I/O nem DOM.
 */

import type { SunDirection } from '@/types';

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
