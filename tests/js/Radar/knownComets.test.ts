/**
 * Garante que os cometas conhecidos caem na régua LINEAR dos planetas, na região real deles, e que
 * a identidade sintética (comet:<designacao>) é reconhecível e distinta da de asteroides. Espelha
 * knownAsteroids.test.ts para a contraparte cometária.
 */

import { describe, expect, it } from 'vitest';
import {
    KNOWN_COMETS,
    isKnownCometId,
    knownCometById,
    knownCometHeliocentricDistanceKm,
    knownCometId,
    knownCometPlacements,
    knownCometScenePosition,
} from '@/Components/Radar/Bodies/Comet/knownComets';
import { orbitFactsFromElements } from '@/lib/keplerOrbit';
import { isKnownAsteroidId } from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';

const FIXED_DATE = new Date('2026-06-15T00:00:00Z');

describe('catálogo de cometas conhecidos', () => {
    it('tem os três cometas famosos', () => {
        const names = KNOWN_COMETS.map((c) => c.name);
        expect(names).toEqual(expect.arrayContaining(['Halley', 'Encke', '67P Churyumov-Gerasimenko']));
        expect(KNOWN_COMETS).toHaveLength(3);
    });

    it('todos são do tipo comet', () => {
        for (const comet of KNOWN_COMETS) {
            expect(comet.objectType).toBe('comet');
        }
    });
});

describe('posicionamento na régua linear', () => {
    it('todos produzem uma posição ancorável', () => {
        expect(knownCometPlacements(FIXED_DATE)).toHaveLength(3);
    });

    it('cada um fica dentro da faixa periélio–afélio da própria órbita', () => {
        for (const comet of KNOWN_COMETS) {
            const pos = knownCometScenePosition(comet, FIXED_DATE)!;
            expect(pos).not.toBeNull();
            const rAu = Math.hypot(pos[0], pos[1], pos[2]) / ORBIT_AU_SCALE;
            const a = comet.elements.qrAu / (1 - comet.elements.ec);
            const aphelion = 2 * a - comet.elements.qrAu;
            expect(rAu).toBeGreaterThanOrEqual(comet.elements.qrAu - 1e-6);
            expect(rAu).toBeLessThanOrEqual(aphelion + 1e-3);
        }
    });

    it('a posição evolui no tempo (não é estática)', () => {
        const encke = KNOWN_COMETS.find((c) => c.name === 'Encke')!;
        const a = knownCometScenePosition(encke, new Date('2026-01-01T00:00:00Z'))!;
        const b = knownCometScenePosition(encke, new Date('2026-07-01T00:00:00Z'))!;
        const moved = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        expect(moved).toBeGreaterThan(0.01);
    });
});

describe('distância heliocêntrica (fallback de rótulo quando o Horizons falha)', () => {
    it('Halley em 2026 está no afélio (~36 UA = ~5,4 bilhões de km), longe mas dentro da escala', () => {
        const halley = KNOWN_COMETS.find((c) => c.name === 'Halley')!;
        const km = knownCometHeliocentricDistanceKm(halley, FIXED_DATE)!;
        const au = km / 149_597_870.7;
        expect(au).toBeGreaterThan(30); // além de Netuno (~30 UA)
        expect(au).toBeLessThan(36);    // não passa do afélio (~36 UA)
    });

    it('Encke (período curto) fica a poucas UA, bem mais perto que Halley', () => {
        const encke = KNOWN_COMETS.find((c) => c.name === 'Encke')!;
        const halley = KNOWN_COMETS.find((c) => c.name === 'Halley')!;
        const enckeKm = knownCometHeliocentricDistanceKm(encke, FIXED_DATE)!;
        const halleyKm = knownCometHeliocentricDistanceKm(halley, FIXED_DATE)!;
        expect(enckeKm).toBeLessThan(halleyKm);
    });
});

describe('fatos orbitais (aba Aproximação, via órbita Kepler)', () => {
    it('Halley: periélio < distância atual ≤ afélio, em UA e km, próximo periélio ~2061', () => {
        const halley = KNOWN_COMETS.find((c) => c.name === 'Halley')!;
        const facts = orbitFactsFromElements(halley.elements, FIXED_DATE)!;
        // Periélio ~0,59 UA; afélio ~35,9 UA; agora ~36 UA (no afélio).
        expect(facts.perihelionAu).toBeGreaterThan(0.5);
        expect(facts.perihelionAu).toBeLessThan(0.7);
        expect(facts.aphelionAu).toBeGreaterThan(35);
        expect(facts.sunDistanceAu).toBeGreaterThan(facts.perihelionAu);
        expect(facts.sunDistanceAu).toBeLessThanOrEqual(facts.aphelionAu + 0.01);
        // Km coerente com UA (KM_PER_AU).
        expect(facts.perihelionKm).toBeCloseTo(facts.perihelionAu * 149_597_870.7, 0);
        expect(facts.sunDistanceKm).toBeGreaterThan(1e9);
        // Período longo (~78 anos): próximo periélio é OMITIDO de propósito (a estimativa erraria por anos).
        expect(facts.periodYears).toBeGreaterThan(70);
        expect(facts.nextPerihelion).toBeNull();
    });

    it('Encke (período curto ~3 anos): próximo periélio é uma data futura, mostrável', () => {
        const encke = KNOWN_COMETS.find((c) => c.name === 'Encke')!;
        const facts = orbitFactsFromElements(encke.elements, FIXED_DATE)!;
        expect(facts.periodYears).toBeLessThan(20);
        expect(facts.nextPerihelion!.getTime()).toBeGreaterThanOrEqual(FIXED_DATE.getTime());
    });
});

describe('identidade sintética de cometa', () => {
    it('produz um id reconhecível e estável, distinto do de asteroides', () => {
        for (const comet of KNOWN_COMETS) {
            const id = knownCometId(comet);
            expect(id).toContain(comet.designation);
            expect(isKnownCometId(id)).toBe(true);
            // Um id de cometa NÃO é confundido com um id de asteroide conhecido.
            expect(isKnownAsteroidId(id)).toBe(false);
        }
        expect(isKnownCometId('known:1')).toBe(false);
        expect(isKnownCometId(null)).toBe(false);
    });

    it('resolve o cometa a partir do id sintético (ida e volta), e ignora ids estranhos', () => {
        for (const comet of KNOWN_COMETS) {
            expect(knownCometById(knownCometId(comet))).toBe(comet);
        }
        expect(knownCometById('comet:999P')).toBeNull();
        expect(knownCometById('known:1')).toBeNull();
        expect(knownCometById(null)).toBeNull();
    });
});
