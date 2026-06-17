/**
 * Invariantes da RÉGUA LINEAR ÚNICA em UA — a única régua do radar (a cara do produto).
 *
 * A matemática de cena gera a geometria DIRETO na régua única (LINEAR_AU_SCALE): asteroides, Lua,
 * planetas e Sol caem todos nela, sem reescalonamento intermediário. Estes testes travam o resultado
 * em unidades absolutas (1 UA → LINEAR_AU_SCALE unidades) — a garantia de que a escala efetiva é a
 * régua linear honesta e que qualquer regressão de escala falha aqui.
 */

import { describe, expect, it } from 'vitest';
import {
    LINEAR_AU_SCALE,
    buildHeliocentricOrbit,
    helioAUToSunCenteredScene,
} from '@/lib/sceneEphemeris';
import { KM_PER_AU, LUNAR_DISTANCE_KM } from '@/lib/physicalConstants';

// ─── A régua linear em si ───────────────────────────────────────────────────────

describe('régua linear: 1 UA = LINEAR_AU_SCALE unidades de cena', () => {
    it('um corpo a 1 UA do Sol (eclíptico +x) cai a LINEAR_AU_SCALE unidades na régua linear', () => {
        const scene = helioAUToSunCenteredScene({ x: 1, y: 0, z: 0 }, LINEAR_AU_SCALE);
        expect(Math.hypot(...scene)).toBeCloseTo(LINEAR_AU_SCALE, 9);
    });

    it('a régua é estritamente LINEAR: dobrar a distância UA dobra a distância de cena', () => {
        const oneAu = Math.hypot(...helioAUToSunCenteredScene({ x: 1, y: 0, z: 0 }, LINEAR_AU_SCALE));
        const twoAu = Math.hypot(...helioAUToSunCenteredScene({ x: 2, y: 0, z: 0 }, LINEAR_AU_SCALE));
        const fiveAu = Math.hypot(...helioAUToSunCenteredScene({ x: 5, y: 0, z: 0 }, LINEAR_AU_SCALE));
        expect(twoAu / oneAu).toBeCloseTo(2, 9);
        expect(fiveAu / oneAu).toBeCloseTo(5, 9);
    });

    it('a matemática gera a órbita DIRETO na régua única (periélio = qrAu × LINEAR_AU_SCALE)', () => {
        // A órbita do NEO sai de buildHeliocentricOrbit já na régua única — sem reescalonamento
        // intermediário. O menor raio (periélio) deve bater com qrAu × LINEAR_AU_SCALE, e a forma
        // (razão afélio/periélio) é a da elipse real (1+e)/(1−e).
        const elements = { ec: 0.2, qrAu: 1.1, inDeg: 12, omDeg: 80, wDeg: 150 };
        const orbit = buildHeliocentricOrbit(elements, 192)!;

        let minR = Number.POSITIVE_INFINITY;
        let maxR = 0;
        for (let i = 0; i < orbit.length; i += 3) {
            const r = Math.hypot(orbit[i], orbit[i + 1], orbit[i + 2]);
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
        }

        // Periélio na régua única (o menor raio é o periélio).
        expect(minR).toBeCloseTo(elements.qrAu * LINEAR_AU_SCALE, 3);
        // Forma fiel: razão afélio/periélio = (1+e)/(1−e).
        expect(maxR / minR).toBeCloseTo((1 + elements.ec) / (1 - elements.ec), 3);
    });
});

// ─── Coerência entre as três famílias na régua linear ───────────────────────────

describe('coerência: Lua, NEO e planeta na MESMA régua linear', () => {
    it('um NEO e um planeta à mesma distância heliocêntrica caem no mesmo raio de cena', () => {
        // Régua única: nada de "planetas numa régua, asteroides em outra". 2 UA é 2 UA para ambos.
        const neoLike = helioAUToSunCenteredScene({ x: 2, y: 0, z: 0 }, LINEAR_AU_SCALE);
        const planetLike = helioAUToSunCenteredScene({ x: 0, y: 0, z: 2 }, LINEAR_AU_SCALE);
        expect(Math.hypot(...neoLike)).toBeCloseTo(Math.hypot(...planetLike), 9);
        expect(Math.hypot(...neoLike)).toBeCloseTo(2 * LINEAR_AU_SCALE, 9);
    });

    it('a Lua (1 DL) fica MUITO mais perto que 1 UA na mesma régua (ordem honesta)', () => {
        // 1 DL ≈ 0,00257 UA → ~0,77 unidades; 1 UA → LINEAR_AU_SCALE unidades. A proximidade da
        // Lua é revelada por zoom, não por distorção: a régua não reordena distâncias.
        const moonUnits = (LUNAR_DISTANCE_KM / KM_PER_AU) * LINEAR_AU_SCALE;
        const oneAuUnits = LINEAR_AU_SCALE;
        expect(moonUnits).toBeLessThan(1);
        expect(moonUnits).toBeLessThan(oneAuUnits);
        // E é estritamente proporcional à distância real (régua linear, não comprimida).
        expect(moonUnits / oneAuUnits).toBeCloseTo(LUNAR_DISTANCE_KM / KM_PER_AU, 12);
    });
});
