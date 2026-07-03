/**
 * Trava a invariante do NEO FOCADO no modo linear: a rocha cai EXATAMENTE sobre a sua própria órbita
 * desenhada, igual aos planetas. A causa do "deslocado" era posicionar o corpo pelo ponto Horizons
 * (currentPositionInHelioScene) enquanto a linha vinha da elipse Kepleriana — duas fontes que
 * divergem. A correção amostra a posição NA MESMA polilinha (focusedOrbitSamplePosition), então o
 * desvio é zero por construção, em qualquer distância.
 *
 * Estes testes provam: (a) o ponto amostrado está sobre a polilinha de buildHeliocentricOrbit;
 * (b) elementos sem época de periélio (tpJd = 0) retornam null, como o resto do pipeline.
 * (O antigo caso do LINEAR_SCALE_FACTOR morreu com o alias: a matemática já gera direto na régua
 * única LINEAR_AU_SCALE, sem reescalonamento a sobreviver.)
 */

import { describe, expect, it } from 'vitest';
import { buildHeliocentricOrbit } from '@/lib/sceneEphemeris';
import { focusedOrbitSamplePosition } from '@/lib/radar/trajectorySampling';
import type { OrbitalElements } from '@/types';

/** Menor distância de um ponto à polilinha (lista de segmentos) da elipse. */
function distanceToPolyline(point: [number, number, number], poly: Float32Array): number {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i + 5 < poly.length; i += 3) {
        const ax = poly[i], ay = poly[i + 1], az = poly[i + 2];
        const bx = poly[i + 3], by = poly[i + 4], bz = poly[i + 5];
        const dx = bx - ax, dy = by - ay, dz = bz - az;
        const segLen2 = dx * dx + dy * dy + dz * dz || 1e-12;
        let t = ((point[0] - ax) * dx + (point[1] - ay) * dy + (point[2] - az) * dz) / segLen2;
        t = Math.min(1, Math.max(0, t));
        const cx = ax + t * dx, cy = ay + t * dy, cz = az + t * dz;
        const d = Math.hypot(point[0] - cx, point[1] - cy, point[2] - cz);
        if (d < best) best = d;
    }
    return best;
}

/**
 * NEOs representativos com época de periélio válida. A data é fixa para o teste ser determinístico;
 * o ν de "agora" é calculado a partir de tpJd, então qualquer data ancorada serve.
 */
const FIXED_DATE = new Date('2026-06-16T00:00:00Z');

const NEOS: Array<{ name: string; elements: OrbitalElements }> = [
    // Eros: e moderada, inclinação ~10°.
    { name: 'Eros', elements: { ec: 0.2228, qrAu: 1.1332, inDeg: 10.83, omDeg: 304.27, wDeg: 178.92, tpJd: 2461088.81, epochJd: 2461200.5 } },
    // Bennu: e ~0.2, baixa inclinação.
    { name: 'Bennu', elements: { ec: 0.2037, qrAu: 0.8969, inDeg: 6.03, omDeg: 2.06, wDeg: 66.22, tpJd: 2455439.14, epochJd: 2455562.5 } },
    // Excêntrico tipo cometa: estressa o pior caso da sagitta (curva vs corda) longe do periélio.
    { name: 'Excêntrico', elements: { ec: 0.65, qrAu: 0.9, inDeg: 22, omDeg: 120, wDeg: 250, tpJd: 2461000.0, epochJd: 2461200.5 } },
];

describe('focusedOrbitSamplePosition', () => {
    it('cai sobre a polilinha de buildHeliocentricOrbit (mesma fonte dos planetas)', () => {
        for (const { name, elements } of NEOS) {
            const sample = focusedOrbitSamplePosition(elements, FIXED_DATE);
            const orbit = buildHeliocentricOrbit(elements);
            expect(sample, name).not.toBeNull();
            expect(orbit, name).not.toBeNull();
            // Sobre a aresta visível: desvio só de ponto flutuante (ordem 1e-6), ordens de grandeza
            // abaixo do deslocamento do bug original (corpo numa fonte, linha em outra). A barra 1e-4
            // espelha a do teste irmão dos planetas (planetOnEllipse).
            expect(distanceToPolyline(sample!, orbit!), name).toBeLessThan(1e-4);
        }
    });

    it('retorna null quando os elementos não têm época de periélio (tpJd = 0)', () => {
        const semEpoca: OrbitalElements = { ec: 0.2, qrAu: 1.0, inDeg: 5, omDeg: 100, wDeg: 50, tpJd: 0, epochJd: 2461200.5 };
        expect(focusedOrbitSamplePosition(semEpoca, FIXED_DATE)).toBeNull();
    });
});
