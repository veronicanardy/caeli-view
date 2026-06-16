/**
 * Trava o contrato da escala visual dos asteroides conhecidos (régua "famosos").
 *
 * Decisão de produto (revisada): o tamanho 3D dos conhecidos usa a MESMA política simbólica dos
 * asteroides do feed, agora a partir do diâmetro real de cada corpo. Antes era um tamanho fixo
 * igual ao de Marte, que fazia rochas de centenas de metros parecerem planetas e igualava Ceres
 * (939 km) a Bennu (490 m). Estes testes garantem que:
 *  - o tamanho varia com o diâmetro real (Ceres > Vesta > Eros > Bennu ≥ Itokawa);
 *  - nenhum conhecido ultrapassa o menor planeta (Mercúrio);
 *  - o resultado é exatamente o da política central (sem regra paralela).
 */

import { describe, expect, it } from 'vitest';
import { KNOWN_ASTEROIDS, knownAsteroidVisualScale } from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { MAX_ROCK_RADIUS_DL, MIN_ROCK_RADIUS_DL, symbolicRockRadiusFromDiameter } from '@/lib/radar/asteroidScale';
import { MERCURY } from '@/lib/radar/planetData';

const byNumber = (n: string) => KNOWN_ASTEROIDS.find((k) => k.number === n)!;

describe('knownAsteroidVisualScale', () => {
    it('usa a política central a partir do diâmetro real (sem regra paralela)', () => {
        for (const known of KNOWN_ASTEROIDS) {
            expect(knownAsteroidVisualScale(known)).toBe(symbolicRockRadiusFromDiameter(known.diameterMeters));
        }
    });

    it('todos os conhecidos ficam dentro dos limites da escala simbólica', () => {
        for (const known of KNOWN_ASTEROIDS) {
            const scale = knownAsteroidVisualScale(known);
            expect(scale).toBeGreaterThanOrEqual(MIN_ROCK_RADIUS_DL);
            expect(scale).toBeLessThanOrEqual(MAX_ROCK_RADIUS_DL);
        }
    });

    it('nenhum conhecido compete visualmente com um planeta (< Mercúrio)', () => {
        for (const known of KNOWN_ASTEROIDS) {
            expect(knownAsteroidVisualScale(known)).toBeLessThan(MERCURY.visualRadiusDl);
        }
    });

    it('o tamanho reflete a ordem dos diâmetros reais: Ceres ≥ Vesta ≥ Eros ≥ Bennu ≥ Itokawa', () => {
        const ceres = knownAsteroidVisualScale(byNumber('1'));      // 939 km
        const vesta = knownAsteroidVisualScale(byNumber('4'));      // 525 km
        const eros = knownAsteroidVisualScale(byNumber('433'));     // 17 km
        const bennu = knownAsteroidVisualScale(byNumber('101955')); // 490 m
        const itokawa = knownAsteroidVisualScale(byNumber('25143'));// 330 m
        expect(ceres).toBeGreaterThanOrEqual(vesta);
        expect(vesta).toBeGreaterThanOrEqual(eros);
        expect(eros).toBeGreaterThanOrEqual(bennu);
        expect(bennu).toBeGreaterThanOrEqual(itokawa);
        // E os extremos são genuinamente diferentes (não tudo no mesmo degrau, como era antes).
        expect(ceres).toBeGreaterThan(itokawa);
    });
});
