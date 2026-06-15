/**
 * Garante que os asteroides conhecidos caem na régua LINEAR dos planetas, na região real deles,
 * e que cada um tem modelo 3D exclusivo. Protege a promessa: "se está perto de Júpiter/no cinturão,
 * aparece lá" — usando a mesma escala dos planetas, nunca a compressão log do radar.
 */

import { describe, expect, it } from 'vitest';
import {
    KNOWN_ASTEROIDS,
    isKnownAsteroidId,
    knownAsteroidById,
    knownAsteroidId,
    knownAsteroidPlacements,
    knownAsteroidScenePosition,
    knownAsteroidToClosestNowObject,
    modelAssetForKnown,
} from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';

const FIXED_DATE = new Date('2026-06-15T00:00:00Z');

describe('catálogo de asteroides conhecidos', () => {
    it('tem os cinco com modelo 3D exclusivo', () => {
        const names = KNOWN_ASTEROIDS.map((k) => k.name);
        expect(names).toEqual(expect.arrayContaining(['Ceres', 'Vesta', 'Eros', 'Bennu', 'Itokawa']));
        expect(KNOWN_ASTEROIDS).toHaveLength(5);
    });

    it('cada conhecido tem um asset GLB correspondente', () => {
        for (const known of KNOWN_ASTEROIDS) {
            const asset = modelAssetForKnown(known);
            expect(asset.key).toBe(known.modelKey);
            expect(asset.url).toBeTruthy();
        }
    });

    it('número de catálogo bate com o do registry de modelos', () => {
        for (const known of KNOWN_ASTEROIDS) {
            const asset = modelAssetForKnown(known);
            expect(asset.numbers).toContain(known.number);
        }
    });
});

describe('posicionamento na régua linear', () => {
    it('todos os cinco produzem uma posição ancorável', () => {
        const placements = knownAsteroidPlacements(FIXED_DATE);
        expect(placements).toHaveLength(5);
    });

    it('cada um cai no raio heliocêntrico real (escala linear ORBIT_AU_SCALE)', () => {
        // Raio de cena esperado ≈ semieixo maior (a = q/(1-e)) × ORBIT_AU_SCALE, com tolerância
        // ampla porque a posição instantânea varia entre periélio e afélio.
        for (const known of KNOWN_ASTEROIDS) {
            const pos = knownAsteroidScenePosition(known, FIXED_DATE)!;
            expect(pos).not.toBeNull();
            const r = Math.hypot(pos[0], pos[1], pos[2]);
            const a = known.elements.qrAu / (1 - known.elements.ec);
            const expectedR = a * ORBIT_AU_SCALE;
            // Entre periélio (q) e afélio (2a-q): r/scale ∈ [q, 2a-q]. Checa que está nessa faixa.
            const rAu = r / ORBIT_AU_SCALE;
            const aphelion = 2 * a - known.elements.qrAu;
            expect(rAu).toBeGreaterThanOrEqual(known.elements.qrAu - 1e-6);
            expect(rAu).toBeLessThanOrEqual(aphelion + 1e-6);
            // E que a ordem de grandeza bate com o semieixo (sanidade da escala linear).
            expect(r).toBeGreaterThan(expectedR * 0.4);
            expect(r).toBeLessThan(expectedR * 1.6);
        }
    });

    it('Ceres e Vesta caem na região do cinturão (entre Marte ~1,5 e Júpiter ~5,2 UA)', () => {
        for (const name of ['Ceres', 'Vesta']) {
            const known = KNOWN_ASTEROIDS.find((k) => k.name === name)!;
            const r = Math.hypot(...knownAsteroidScenePosition(known, FIXED_DATE)!);
            const rAu = r / ORBIT_AU_SCALE;
            expect(rAu).toBeGreaterThan(1.5);
            expect(rAu).toBeLessThan(5.2);
        }
    });

    it('Bennu e Eros ficam próximos da órbita da Terra (NEOs, ~1 UA)', () => {
        for (const name of ['Bennu', 'Eros']) {
            const known = KNOWN_ASTEROIDS.find((k) => k.name === name)!;
            const rAu = Math.hypot(...knownAsteroidScenePosition(known, FIXED_DATE)!) / ORBIT_AU_SCALE;
            expect(rAu).toBeGreaterThan(0.8);
            expect(rAu).toBeLessThan(2.2);
        }
    });

    it('asteroides inclinados preservam a altura fora do plano (Y ≠ 0)', () => {
        // O 3D existe justamente para mostrar a inclinação: Ceres (i≈10,6°) e Eros (i≈10,8°)
        // não podem ser achatados no plano dos planetas. A componente Y (altura eclíptica) é a prova.
        // Como |Y| zera nos nós da órbita, amostramos várias datas ao longo do ano e exigimos que
        // a altura seja relevante em ALGUM ponto — uma órbita inclinada necessariamente sai do plano.
        for (const name of ['Ceres', 'Eros']) {
            const known = KNOWN_ASTEROIDS.find((k) => k.name === name)!;
            let maxRatio = 0;
            for (let month = 0; month < 12; month += 1) {
                const date = new Date(Date.UTC(2026, month, 1));
                const pos = knownAsteroidScenePosition(known, date)!;
                const r = Math.hypot(...pos) || 1;
                maxRatio = Math.max(maxRatio, Math.abs(pos[1]) / r);
            }
            // Para i≈10° o pico de |Y|/r se aproxima de sin(10°)≈0,17; 0,05 é folga segura.
            expect(maxRatio).toBeGreaterThan(0.05);
        }
    });

    it('a posição evolui no tempo (não é estática)', () => {
        const known = KNOWN_ASTEROIDS.find((k) => k.name === 'Bennu')!;
        const a = knownAsteroidScenePosition(known, new Date('2026-01-01T00:00:00Z'))!;
        const b = knownAsteroidScenePosition(known, new Date('2026-07-01T00:00:00Z'))!;
        const moved = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        expect(moved).toBeGreaterThan(0.01);
    });
});

describe('régua única (planetas) para todos os conhecidos', () => {
    it('os distantes ficam em ordem heliocêntrica correta (Ceres além de Vesta)', () => {
        const ceres = Math.hypot(...knownAsteroidScenePosition(KNOWN_ASTEROIDS.find((k) => k.name === 'Ceres')!, FIXED_DATE)!);
        const vesta = Math.hypot(...knownAsteroidScenePosition(KNOWN_ASTEROIDS.find((k) => k.name === 'Vesta')!, FIXED_DATE)!);
        // Ceres tem semieixo maior que Vesta; na régua heliocêntrica a ordem é preservada.
        expect(ceres).toBeGreaterThan(vesta);
    });

    it('todos os cinco aparecem (nenhuma troca de régua, nenhum some)', () => {
        expect(knownAsteroidPlacements(FIXED_DATE)).toHaveLength(5);
    });
});

describe('conversão para o card de rocha (ClosestNowObject)', () => {
    it('produz um id sintético reconhecível e estável', () => {
        for (const known of KNOWN_ASTEROIDS) {
            const id = knownAsteroidId(known);
            expect(id).toContain(known.number);
            expect(isKnownAsteroidId(id)).toBe(true);
        }
        // Um id de feed comum NÃO é reconhecido como conhecido.
        expect(isKnownAsteroidId('2024 AB')).toBe(false);
        expect(isKnownAsteroidId(null)).toBe(false);
    });

    it('resolve o conhecido a partir do id sintético (ida e volta), e ignora ids estranhos', () => {
        for (const known of KNOWN_ASTEROIDS) {
            expect(knownAsteroidById(knownAsteroidId(known))).toBe(known);
        }
        expect(knownAsteroidById('known:999')).toBeNull();
        expect(knownAsteroidById('2024 AB')).toBeNull();
        expect(knownAsteroidById(null)).toBeNull();
    });

    it('mapeia identidade e diâmetro, sem inventar aproximação', () => {
        const ceres = KNOWN_ASTEROIDS.find((k) => k.name === 'Ceres')!;
        const obj = knownAsteroidToClosestNowObject(ceres);

        expect(obj.approach.id).toBe(knownAsteroidId(ceres));
        expect(obj.approach.name).toBe('Ceres');
        expect(obj.approach.permanentNumber).toBe('1');
        expect(obj.approach.diameterMeters).toBe(ceres.diameterMeters);

        // Sem aproximação: o card já trata estes nulos (esconde data/distância/trajetória).
        expect(obj.trajectory).toBeNull();
        expect(obj.approach.approachDate).toBeNull();
        expect(obj.currentDistanceKm).toBeNull();
        expect(obj.hasRealCurrentDistance).toBe(false);
        expect(obj.approach.hazardFlag).toBe(false);
    });
});
