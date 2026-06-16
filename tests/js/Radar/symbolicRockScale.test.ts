/**
 * Contrato científico da escala visual SIMBÓLICA dos asteroides do feed.
 *
 * Por que existe: o tamanho dos asteroides na cena NÃO é proporcional ao diâmetro real (seria
 * sub-pixel). É uma escala simbólica em degraus por classe de tamanho. Estes testes travam os
 * invariantes que mantêm essa escala honesta e não enganosa, mesmo que os degraus sejam reajustados:
 *
 *  1. Monotonicidade: diâmetro maior nunca produz raio visual menor.
 *  2. Teto de honestidade: o maior asteroide ainda é inequivocamente MENOR que a Terra na cena
 *     (senão a escala mentiria, sugerindo uma rocha maior que o planeta).
 *  3. A estimativa de diâmetro a partir da magnitude absoluta H segue a relação astronômica padrão.
 */

import { describe, expect, it } from 'vitest';
import { symbolicRockRadiusForApproach } from '@/Components/Radar/Bodies/Asteroid/AsteroidMarker';
import { EARTH_RADIUS_DL } from '@/lib/radar/bodyScale';
import type { UnifiedApproach } from '@/types';

/** Monta um UnifiedApproach mínimo com um diâmetro fixo (metros). */
function approachWithDiameter(diameterMeters: number | null): UnifiedApproach {
    return {
        diameterMeters,
        estimatedDiameterMinMeters: null,
        estimatedDiameterMaxMeters: null,
        absoluteMagnitude: null,
    } as UnifiedApproach;
}

/** Monta um UnifiedApproach que só carrega a magnitude absoluta H (sem diâmetro do feed). */
function approachWithMagnitude(absoluteMagnitude: number): UnifiedApproach {
    return {
        diameterMeters: null,
        estimatedDiameterMinMeters: null,
        estimatedDiameterMaxMeters: null,
        absoluteMagnitude,
    } as UnifiedApproach;
}

describe('symbolicRockRadiusForApproach — invariantes da escala simbólica', () => {
    it('é monotônica: diâmetro maior nunca dá raio menor', () => {
        const diameters = [5, 30, 100, 300, 750, 1500, 5000];
        const radii = diameters.map((d) => symbolicRockRadiusForApproach(approachWithDiameter(d)));
        for (let i = 1; i < radii.length; i += 1) {
            expect(radii[i]).toBeGreaterThanOrEqual(radii[i - 1]);
        }
    });

    it('o maior asteroide ainda é menor que a Terra na cena (teto de honestidade)', () => {
        // Um corpo gigante (5 km) cai no maior degrau; deve ficar abaixo do raio visual da Terra,
        // senão a cena sugeriria uma rocha maior que o planeta.
        const biggest = symbolicRockRadiusForApproach(approachWithDiameter(5000));
        expect(biggest).toBeLessThan(EARTH_RADIUS_DL);
    });

    it('todos os degraus são raios visuais pequenos e positivos', () => {
        for (const d of [null, 1, 30, 100, 300, 750, 2000]) {
            const r = symbolicRockRadiusForApproach(approachWithDiameter(d));
            expect(r).toBeGreaterThan(0);
            expect(r).toBeLessThan(EARTH_RADIUS_DL);
        }
    });

    it('diâmetro ausente cai num degrau intermediário válido (não quebra)', () => {
        const r = symbolicRockRadiusForApproach(approachWithDiameter(null));
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThan(0);
    });
});

describe('estimativa de diâmetro a partir da magnitude absoluta H', () => {
    // D[km] = 1329 / sqrt(albedo) · 10^(−H/5). Com a faixa de albedo do JPL (0,05–0,25),
    // a média dos extremos é o diâmetro usado. Verificamos que H menor (objeto mais brilhante/maior)
    // nunca produz raio menor que H maior — a relação H→tamanho não está invertida.
    it('H menor (mais brilhante) dá raio visual >= H maior (mais fraco)', () => {
        const bright = symbolicRockRadiusForApproach(approachWithMagnitude(17)); // grande
        const faint = symbolicRockRadiusForApproach(approachWithMagnitude(26));  // pequeno
        expect(bright).toBeGreaterThanOrEqual(faint);
    });

    it('um H típico de NEO pequeno (H≈26) cai num degrau pequeno', () => {
        // H=26 → diâmetro ~20–50 m: deve cair num dos degraus mais baixos.
        const r = symbolicRockRadiusForApproach(approachWithMagnitude(26));
        expect(r).toBeLessThanOrEqual(0.010);
    });
});
