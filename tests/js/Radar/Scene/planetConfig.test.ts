/**
 * Trava o contrato do raio de enquadramento de câmera dos planetas.
 *
 * Por que existe: PLANET_CONFIG.framingRadius já foi uma cópia MANUAL dos raios visuais e
 * dessincronizou (Vênus ficou em 0,038 enquanto o globo renderizava 0,10, enquadrando o planeta
 * colado na câmera). Agora o valor é DERIVADO de planetData.visualRadiusDl; este teste garante que
 * os dois nunca mais divirjam e que toda PlanetId tenha config completa.
 */

import { describe, expect, it } from 'vitest';
import { PLANET_CONFIG, type PlanetId } from '@/Components/Radar/Scene/planetConfig';
import {
    JUPITER, MARS, MERCURY, NEPTUNE, SATURN, URANUS, VENUS, type PlanetDatum,
} from '@/lib/radar/planetData';

const EXPECTED: Record<PlanetId, PlanetDatum> = {
    mercury: MERCURY,
    venus: VENUS,
    mars: MARS,
    jupiter: JUPITER,
    saturn: SATURN,
    uranus: URANUS,
    neptune: NEPTUNE,
};

describe('PLANET_CONFIG', () => {
    it('o framingRadius de cada planeta é exatamente o visualRadiusDl correspondente', () => {
        for (const id of Object.keys(EXPECTED) as PlanetId[]) {
            expect(PLANET_CONFIG[id].framingRadius).toBe(EXPECTED[id].visualRadiusDl);
        }
    });

    it('cobre todas as PlanetId, sem entradas faltando', () => {
        expect(Object.keys(PLANET_CONFIG).sort()).toEqual(Object.keys(EXPECTED).sort());
    });

    it('Vênus é enquadrado com raio maior que Marte (regressão do bug de framing 0,038)', () => {
        expect(PLANET_CONFIG.venus.framingRadius).toBeGreaterThan(PLANET_CONFIG.mars.framingRadius);
    });
});
