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
    knownSpacecraftEarthDistanceKm,
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
    it('tem as nove naves famosas', () => {
        const names = KNOWN_SPACECRAFT.map((c) => c.name);
        expect(names).toEqual(
            expect.arrayContaining([
                'Voyager 1', 'Voyager 2', 'Pioneer 10', 'Pioneer 11', 'New Horizons', 'Juno',
                'James Webb', 'Parker Solar Probe', 'Europa Clipper',
            ]),
        );
        expect(KNOWN_SPACECRAFT).toHaveLength(9);
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
        expect(knownSpacecraftPlacements()).toHaveLength(9);
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

    it('cada nave cai na região heliocêntrica real (Voyager além de Netuno, Juno em Júpiter, Webb em ~1 UA)', () => {
        const v1 = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 1')!;
        const v2 = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 2')!;
        const p11 = KNOWN_SPACECRAFT.find((c) => c.name === 'Pioneer 11')!;
        const juno = KNOWN_SPACECRAFT.find((c) => c.name === 'Juno')!;
        const webb = KNOWN_SPACECRAFT.find((c) => c.name === 'James Webb')!;
        const parker = KNOWN_SPACECRAFT.find((c) => c.name === 'Parker Solar Probe')!;
        const clipper = KNOWN_SPACECRAFT.find((c) => c.name === 'Europa Clipper')!;

        const auOf = (c: typeof v1) => knownSpacecraftHeliocentricDistanceKm(c) / KM_PER_AU;
        expect(auOf(v1)).toBeGreaterThan(150);
        expect(auOf(v2)).toBeGreaterThan(120);
        // Pioneer 11: bem além de Netuno, mas atrás das Voyager (mais lenta e lançada depois da 10).
        expect(auOf(p11)).toBeGreaterThan(100);
        expect(auOf(p11)).toBeLessThan(auOf(v2));
        // Juno orbita Júpiter: fica perto de 5 UA, muito mais perto que os Voyager.
        expect(auOf(juno)).toBeGreaterThan(4);
        expect(auOf(juno)).toBeLessThan(6);
        expect(auOf(juno)).toBeLessThan(auOf(v1));
        // James Webb acompanha a Terra (L2): ~1 UA do Sol.
        expect(auOf(webb)).toBeGreaterThan(0.9);
        expect(auOf(webb)).toBeLessThan(1.1);
        // Parker: sempre dentro da órbita da Terra.
        expect(auOf(parker)).toBeLessThan(1);
        // Europa Clipper em cruzeiro: entre a Terra e o cinturão de asteroides.
        expect(auOf(clipper)).toBeGreaterThan(1);
        expect(auOf(clipper)).toBeLessThan(3);
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
        const live = { [craft.horizonsId]: { helioAU: { x: 1, y: 2, z: 3 } } };
        const resolved = resolveSpacecraftHelioAU(craft, live);
        expect(resolved.live).toBe(true);
        expect(resolved.helioAU).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('com geoAU e Terra exata, a posição é Terra + geocêntrico (caminho preciso)', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const earth = { x: 0.2, y: -1.0, z: 0 };
        const live = {
            [craft.horizonsId]: {
                helioAU: { x: 99, y: 99, z: 99 }, // não deve ser usado quando há geoAU + Terra
                geoAU: { x: 0.005, y: -0.01, z: 0.001 },
            },
        };
        const resolved = resolveSpacecraftHelioAU(craft, live, earth);
        expect(resolved.live).toBe(true);
        expect(resolved.helioAU.x).toBeCloseTo(0.205, 10);
        expect(resolved.helioAU.y).toBeCloseTo(-1.01, 10);
        expect(resolved.helioAU.z).toBeCloseTo(0.001, 10);
    });

    it('cai no vetor fixo quando a nave não está no mapa ao vivo (live=false)', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const resolved = resolveSpacecraftHelioAU(craft, {});
        expect(resolved.live).toBe(false);
        expect(resolved.helioAU).toEqual(craft.helioAU);
    });

    it('o fallback do James Webb ancora na Terra atual (ponto antissolar + offset L2)', () => {
        const webb = KNOWN_SPACECRAFT.find((c) => c.name === 'James Webb')!;
        expect(webb.earthL2OffsetAU).toBeGreaterThan(0);
        const earth = { x: 0.6, y: -0.8, z: 0 }; // |Terra| = 1 UA
        const resolved = resolveSpacecraftHelioAU(webb, undefined, earth);
        expect(resolved.live).toBe(false);
        // L2 fica na reta Sol→Terra, além da Terra: mesmo rumo, 1 + offset de distância.
        const factor = 1 + webb.earthL2OffsetAU!;
        expect(resolved.helioAU.x).toBeCloseTo(0.6 * factor, 10);
        expect(resolved.helioAU.y).toBeCloseTo(-0.8 * factor, 10);
        expect(resolved.helioAU.z).toBeCloseTo(0, 10);
        // Distância à Terra = exatamente o offset L2.
        const dist = Math.hypot(
            resolved.helioAU.x - earth.x,
            resolved.helioAU.y - earth.y,
            resolved.helioAU.z - earth.z,
        );
        expect(dist).toBeCloseTo(webb.earthL2OffsetAU!, 10);
    });

    it('sem Terra, o fallback do James Webb ainda é o vetor fixo (nunca some da cena)', () => {
        const webb = KNOWN_SPACECRAFT.find((c) => c.name === 'James Webb')!;
        const resolved = resolveSpacecraftHelioAU(webb, undefined, null);
        expect(resolved.live).toBe(false);
        expect(resolved.helioAU).toEqual(webb.helioAU);
    });

    it('placements refletem live por nave (uma ao vivo, as outras fixas)', () => {
        const craft = KNOWN_SPACECRAFT[1];
        const live = { [craft.horizonsId]: { helioAU: { x: 10, y: 0, z: 0 } } };
        const placements = knownSpacecraftPlacements(undefined, live);
        const liveOnes = placements.filter((p) => p.live);
        expect(liveOnes).toHaveLength(1);
        expect(liveOnes[0].craft.horizonsId).toBe(craft.horizonsId);
    });

    it('o card marca hasRealCurrentDistance=true quando a posição é ao vivo', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const live = { [craft.horizonsId]: { helioAU: { x: 30, y: 0, z: 0 } } };
        const obj = knownSpacecraftToClosestNowObject(craft, live);
        expect(obj.hasRealCurrentDistance).toBe(true);
        // Sem geoAU nem Terra, a distância exibida cai na heliocêntrica (30 UA, honesta tão longe).
        expect(obj.currentDistanceKm).toBeCloseTo(30 * KM_PER_AU, 0);
    });
});

describe('distância da Terra (a métrica do card)', () => {
    it('com geoAU ao vivo, a distância é o módulo do vetor geocêntrico (exata)', () => {
        const craft = KNOWN_SPACECRAFT[0];
        const live = {
            [craft.horizonsId]: {
                helioAU: { x: 99, y: 0, z: 0 },
                geoAU: { x: 0.006, y: 0.008, z: 0 }, // |geo| = 0,01 UA
            },
        };
        expect(knownSpacecraftEarthDistanceKm(craft, live)).toBeCloseTo(0.01 * KM_PER_AU, 0);
    });

    it('no fallback com Terra exata, a distância é o vetor efetivo menos a Terra', () => {
        const voyager1 = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 1')!;
        const earth = { x: 1, y: 0, z: 0 };
        const expected = Math.hypot(
            voyager1.helioAU.x - 1,
            voyager1.helioAU.y,
            voyager1.helioAU.z,
        ) * KM_PER_AU;
        expect(knownSpacecraftEarthDistanceKm(voyager1, undefined, earth)).toBeCloseTo(expected, 0);
    });

    it('sem Terra, a heliocêntrica só vale para naves distantes; perto é null (nunca um número 100x errado)', () => {
        const voyager1 = KNOWN_SPACECRAFT.find((c) => c.name === 'Voyager 1')!;
        // Voyager a ~171 UA: heliocêntrica como ordem de grandeza é honesta.
        expect(knownSpacecraftEarthDistanceKm(voyager1)).toBeGreaterThan(100 * KM_PER_AU);

        // James Webb a ~1 UA do Sol e 0,01 UA da Terra: heliocêntrica erraria por 100 vezes.
        const webb = KNOWN_SPACECRAFT.find((c) => c.name === 'James Webb')!;
        expect(knownSpacecraftEarthDistanceKm(webb)).toBeNull();
    });

    it('o James Webb com Terra exata fica a ~0,01 UA dela (fallback L2)', () => {
        const webb = KNOWN_SPACECRAFT.find((c) => c.name === 'James Webb')!;
        const earth = { x: 0.19, y: -0.98, z: 0 };
        const dist = knownSpacecraftEarthDistanceKm(webb, undefined, earth)!;
        expect(dist).toBeCloseTo(webb.earthL2OffsetAU! * KM_PER_AU, 0);
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
