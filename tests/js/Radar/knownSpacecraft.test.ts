/**
 * Garante que as naves famosas têm identidade sintética reconhecível (spacecraft:<horizonsId>),
 * distinta de asteroides e cometas, caem na régua LINEAR dos planetas na região real (Voyager bem
 * além de Netuno, Juno na faixa de Júpiter) e que o objeto sintético do card é honesto (sem diâmetro,
 * distância só simbólica). Espelha knownComets.test.ts para a contraparte de objetos artificiais.
 */

import { describe, expect, it } from 'vitest';
import {
    KNOWN_SPACECRAFT,
    isKnownSpacecraftId,
    knownSpacecraftById,
    knownSpacecraftHeliocentricDistanceKm,
    knownSpacecraftId,
    knownSpacecraftPlacements,
    knownSpacecraftScenePosition,
    knownSpacecraftToApproach,
    knownSpacecraftToClosestNowObject,
    resolveSpacecraftHelioAU,
} from '@/Components/Radar/Bodies/Spacecraft/knownSpacecraft';
import { isKnownCometId } from '@/Components/Radar/Bodies/Comet/knownComets';
import { isKnownAsteroidId } from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { LINEAR_AU_SCALE } from '@/lib/sceneEphemeris';

const KM_PER_AU = 149_597_870.7;

describe('catálogo de naves conhecidas', () => {
    it('tem as cinco naves famosas', () => {
        const names = KNOWN_SPACECRAFT.map((c) => c.name);
        expect(names).toEqual(
            expect.arrayContaining(['Voyager 1', 'Voyager 2', 'Pioneer 10', 'New Horizons', 'Juno']),
        );
        expect(KNOWN_SPACECRAFT).toHaveLength(5);
    });

    it('todas são do tipo spacecraft', () => {
        for (const craft of KNOWN_SPACECRAFT) {
            expect(craft.objectType).toBe('spacecraft');
        }
    });

    it('cada nave usa um id de Horizons negativo (SPK de nave)', () => {
        for (const craft of KNOWN_SPACECRAFT) {
            expect(Number(craft.horizonsId)).toBeLessThan(0);
        }
    });
});

describe('posicionamento na régua linear', () => {
    it('todas produzem uma posição (vetor fixo sempre ancorável)', () => {
        expect(knownSpacecraftPlacements()).toHaveLength(5);
    });

    it('a posição de cena bate com o vetor heliocêntrico fixo na régua única', () => {
        for (const craft of KNOWN_SPACECRAFT) {
            const pos = knownSpacecraftScenePosition(craft, LINEAR_AU_SCALE);
            // Convenção de eixos: cena (x, z, -y) a partir do eclíptico (x, y, z).
            expect(pos[0]).toBeCloseTo(craft.helioAU.x * LINEAR_AU_SCALE, 3);
            expect(pos[1]).toBeCloseTo(craft.helioAU.z * LINEAR_AU_SCALE, 3);
            expect(pos[2]).toBeCloseTo(-craft.helioAU.y * LINEAR_AU_SCALE, 3);
        }
    });

    it('os Voyager estão bem além de Netuno (~30 UA); a Juno fica na faixa de Júpiter (~5 UA)', () => {
        const v1 = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 1')!;
        const v2 = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 2')!;
        const juno = KNOWN_SPACECRAFT.find((c) => c.name === 'Juno')!;

        const auOf = (c: typeof v1) => knownSpacecraftHeliocentricDistanceKm(c) / KM_PER_AU;
        expect(auOf(v1)).toBeGreaterThan(150);
        expect(auOf(v2)).toBeGreaterThan(120);
        // Juno orbita Júpiter: fica perto de 5 UA, muito mais perto que os Voyager.
        expect(auOf(juno)).toBeGreaterThan(4);
        expect(auOf(juno)).toBeLessThan(6);
        expect(auOf(juno)).toBeLessThan(auOf(v1));
    });
});

describe('identidade sintética de nave', () => {
    it('produz um id reconhecível e estável, distinto de asteroides e cometas', () => {
        for (const craft of KNOWN_SPACECRAFT) {
            const id = knownSpacecraftId(craft);
            expect(id).toContain(craft.horizonsId);
            expect(isKnownSpacecraftId(id)).toBe(true);
            // Não é confundido com um id de asteroide nem de cometa conhecido.
            expect(isKnownAsteroidId(id)).toBe(false);
            expect(isKnownCometId(id)).toBe(false);
        }
        expect(isKnownSpacecraftId('known:1')).toBe(false);
        expect(isKnownSpacecraftId('comet:1P')).toBe(false);
        expect(isKnownSpacecraftId(null)).toBe(false);
    });

    it('resolve a nave a partir do id sintético (ida e volta), e ignora ids estranhos', () => {
        for (const craft of KNOWN_SPACECRAFT) {
            expect(knownSpacecraftById(knownSpacecraftId(craft))).toBe(craft);
        }
        expect(knownSpacecraftById('spacecraft:-999')).toBeNull();
        expect(knownSpacecraftById('known:1')).toBeNull();
        expect(knownSpacecraftById(null)).toBeNull();
    });
});

describe('posição ao vivo do Horizons (override do vetor fixo)', () => {
    it('usa a posição ao vivo quando disponível e marca live=true', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const live = { [craft.horizonsId]: { x: 1, y: 2, z: 3 } };
        const resolved = resolveSpacecraftHelioAU(craft, live);
        expect(resolved.live).toBe(true);
        expect(resolved.helioAU).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('cai no vetor fixo quando a nave não está no mapa ao vivo (live=false)', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const resolved = resolveSpacecraftHelioAU(craft, {});
        expect(resolved.live).toBe(false);
        expect(resolved.helioAU).toEqual(craft.helioAU);
    });

    it('placements refletem live por nave (uma ao vivo, as outras fixas)', () => {
        const craft = KNOWN_SPACECRAFT[1];
        const live = { [craft.horizonsId]: { x: 10, y: 0, z: 0 } };
        const placements = knownSpacecraftPlacements(undefined, live);
        const liveOnes = placements.filter((p) => p.live);
        expect(liveOnes).toHaveLength(1);
        expect(liveOnes[0].craft.horizonsId).toBe(craft.horizonsId);
    });

    it('o card marca hasRealCurrentDistance=true quando a posição é ao vivo', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const live = { [craft.horizonsId]: { x: 30, y: 0, z: 0 } };
        const obj = knownSpacecraftToClosestNowObject(craft, live);
        expect(obj.hasRealCurrentDistance).toBe(true);
        // Distância heliocêntrica = 30 UA em km.
        expect(obj.currentDistanceKm).toBeCloseTo(30 * KM_PER_AU, 0);
    });
});

describe('objeto sintético para o card', () => {
    it('o approach é honesto: tipo spacecraft, sem diâmetro nem evento de aproximação', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const approach = knownSpacecraftToApproach(craft);
        expect(approach.objectType).toBe('spacecraft');
        expect(approach.diameterMeters).toBeNull();
        expect(approach.estimatedDiameterMinMeters).toBeNull();
        expect(approach.approachDate).toBeNull();
        expect(approach.nominalDistanceKm).toBeNull();
        expect(approach.hazardFlag).toBe(false);
        // O id casa com a lore (aba História): spacecraft:<horizonsId>.
        expect(approach.id).toBe(knownSpacecraftId(craft));
    });

    it('o ClosestNowObject traz a distância só como ordem de grandeza (não posição ao vivo)', () => {
        const craft = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 1')!;
        const obj = knownSpacecraftToClosestNowObject(craft);
        expect(obj.trajectory).toBeNull();
        expect(obj.hasRealCurrentDistance).toBe(false);
        expect(obj.currentDistanceKm).toBeGreaterThan(0);
        expect(obj.currentDistanceLD).toBeCloseTo(obj.currentDistanceKm! / 384_400, 6);
    });
});
