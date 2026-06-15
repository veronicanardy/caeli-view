/**
 * Trava a invariante que mais deu dor de cabeça no posicionamento heliocêntrico:
 * o PLANETA CAI SOBRE A SUA ELIPSE, mesmo com a órbita inclinada e mesmo longe do Sol.
 *
 * Causa raiz do sintoma que "sempre voltava": a elipse é um POLÍGONO (N segmentos) e o planeta era
 * um ponto na CURVA ideal. A distância da curva à corda (sagitta) é fixa em fração do raio, mas em
 * unidades de cena CRESCE com a distância — por isso Júpiter começava a desalinhar e Urano/Netuno
 * passavam pela linha. Aumentar segmentos só atenua; reescalar a cena ou adicionar um corpo mais
 * distante traz o sintoma de volta.
 *
 * Correção definitiva: a posição do planeta é AMOSTRADA NA MESMA POLILINHA desenhada
 * (sampleHeliocentricEllipseAtNu), não na curva ideal. Então o corpo está literalmente sobre a
 * aresta visível, com desvio ZERO independente de distância, escala ou número de segmentos.
 *
 * Estes testes provam (a) que o método antigo (curva ideal) divergia e a divergência crescia com a
 * distância, e (b) que o método novo (amostra da polilinha) tem desvio nulo para todos.
 */

import { describe, expect, it } from 'vitest';
import {
    ORBIT_AU_SCALE,
    ORBIT_ELLIPSE_SEGMENTS,
    buildHeliocentricEllipse,
    buildHeliocentricOrbit,
    orbitGeometryFromElements,
    perifocalToEclipticAU,
    sampleHeliocentricEllipseAtNu,
    type OrbitGeometry,
} from '@/lib/sceneEphemeris';

/** Elementos osculadores representativos (eclíptico J2000). a em UA; ângulos em graus. */
type Planet = { name: string; a: number; e: number; iDeg: number; omDeg: number; lonPeriDeg: number };

// ϖ (lonPeri) = Ω + ω. Valores J2000 aproximados; o que importa é a CONSISTÊNCIA interna
// (posição vs. elipse), não a efeméride exata, então valores de tabela bastam.
const PLANETS: Planet[] = [
    { name: 'Mercúrio', a: 0.3871, e: 0.2056, iDeg: 7.00, omDeg: 48.33, lonPeriDeg: 77.46 },  // e alto
    { name: 'Marte',    a: 1.5237, e: 0.0934, iDeg: 1.85, omDeg: 49.56, lonPeriDeg: 336.06 },
    { name: 'Júpiter',  a: 5.2026, e: 0.0489, iDeg: 1.30, omDeg: 100.49, lonPeriDeg: 14.73 },
    { name: 'Urano',    a: 19.191, e: 0.0472, iDeg: 0.77, omDeg: 74.00, lonPeriDeg: 170.96 }, // longe
    { name: 'Netuno',   a: 30.069, e: 0.0086, iDeg: 1.77, omDeg: 131.78, lonPeriDeg: 44.97 }, // longe + e baixo
];

function geomOf(p: Planet): OrbitGeometry {
    return { semiMajorAU: p.a, eccentricity: p.e, lonPerihelionDeg: p.lonPeriDeg, inclinationDeg: p.iDeg, lonAscNodeDeg: p.omDeg };
}

/** Posição AMOSTRADA NA POLILINHA — espelha exatamente o que sceneEphemeris.planetData faz hoje. */
function planetSceneAtNu(p: Planet, nu: number): [number, number, number] {
    return sampleHeliocentricEllipseAtNu(geomOf(p), nu, ORBIT_ELLIPSE_SEGMENTS);
}

/** Posição na CURVA IDEAL — o método antigo, mantido só para provar que ele divergia. */
function planetSceneAtNuIdealCurve(p: Planet, nu: number): [number, number, number] {
    const argPeriDeg = p.lonPeriDeg - p.omDeg;
    const semilatus = p.a * (1 - p.e * p.e);
    const r = semilatus / (1 + p.e * Math.cos(nu));
    const ecl = perifocalToEclipticAU(r * Math.cos(nu), r * Math.sin(nu), p.iDeg, p.omDeg, argPeriDeg);
    return [ecl.x * ORBIT_AU_SCALE, ecl.z * ORBIT_AU_SCALE, -ecl.y * ORBIT_AU_SCALE];
}

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

describe('planeta cai EXATAMENTE sobre a polilinha desenhada (desvio absoluto nulo)', () => {
    it.each(PLANETS)('$name: posição amostrada da polilinha tem desvio ~0 em qualquer distância', (p) => {
        const ellipse = buildHeliocentricEllipse(p.a, p.e, p.lonPeriDeg, p.iDeg, p.omDeg, ORBIT_ELLIPSE_SEGMENTS);
        for (const nu of [0, 0.7, Math.PI / 2, 1.9, Math.PI, 3.5, (3 * Math.PI) / 2, 5.6]) {
            const pos = planetSceneAtNu(p, nu);
            const r = Math.hypot(...pos) || 1;
            const dist = distanceToPolyline(pos, ellipse);
            // O desvio GEOMÉTRICO é zero (posição e linha são a mesma corda). O resíduo é só a
            // precisão de armazenamento da polilinha em Float32Array (~7 dígitos): a posição é
            // calculada em float64, a linha guardada em float32. 1e-5 do raio cobre isso com folga
            // e ainda é ~10⁴× menor que o desvio do método antigo — invisível em qualquer zoom.
            expect(dist).toBeLessThan(r * 1e-5);
        }
    });

    it('o método ANTIGO (curva ideal) divergia, e a divergência crescia com a distância', () => {
        // Prova de regressão reversa: confirma que o sintoma era real e dependente da distância,
        // justificando a correção. Júpiter desvia pouco; Netuno desvia visivelmente mais.
        const jup = PLANETS.find((p) => p.name === 'Júpiter')!;
        const nep = PLANETS.find((p) => p.name === 'Netuno')!;
        const worstIdeal = (p: Planet) => {
            const ellipse = buildHeliocentricEllipse(p.a, p.e, p.lonPeriDeg, p.iDeg, p.omDeg, ORBIT_ELLIPSE_SEGMENTS);
            let worst = 0;
            for (const nu of [0.37, 1.1, 2.6, 4.0, 5.5]) worst = Math.max(worst, distanceToPolyline(planetSceneAtNuIdealCurve(p, nu), ellipse));
            return worst;
        };
        const dJup = worstIdeal(jup);
        const dNep = worstIdeal(nep);
        expect(dNep).toBeGreaterThan(dJup);       // cresce com a distância
        expect(dNep).toBeGreaterThan(0.1);        // Netuno: desvio visível (sintoma real)
    });

    it('a elipse é 3D quando inclinada (não fica achatada no plano)', () => {
        // Mercúrio i=7°: a polilinha deve ter pontos com Y ≠ 0 (altura eclíptica preservada).
        const ellipse = buildHeliocentricEllipse(0.3871, 0.2056, 77.46, 7.0, 48.33, 64);
        let maxAbsY = 0;
        for (let i = 1; i < ellipse.length; i += 3) maxAbsY = Math.max(maxAbsY, Math.abs(ellipse[i]));
        expect(maxAbsY).toBeGreaterThan(0);
    });

    it('a elipse de uma órbita coplanar (i=0) permanece no plano (Y≈0)', () => {
        // Terra: i = 0 ao eclíptico por definição → elipse plana.
        const ellipse = buildHeliocentricEllipse(1.0, 0.0167, 102.94, 0, 0, 64);
        for (let i = 1; i < ellipse.length; i += 3) {
            expect(Math.abs(ellipse[i])).toBeLessThan(1e-6 * ORBIT_AU_SCALE);
        }
    });
});

describe('asteroide do modo órbita também cai sobre a sua própria linha', () => {
    // buildHeliocentricOrbit (elementos com periélio) e a posição amostrada compartilham o mesmo
    // gerador de vértice. Cobre um afélio distante (cometa) — o pior caso do sintoma antigo.
    const comet = { ec: 0.7, qrAu: 1.2, inDeg: 22, omDeg: 80, wDeg: 150 }; // afélio ~6,8 UA

    it('a posição amostrada da órbita do asteroide tem desvio absoluto ~0 mesmo no afélio', () => {
        const orbit = buildHeliocentricOrbit(comet, ORBIT_ELLIPSE_SEGMENTS)!;
        const g = orbitGeometryFromElements(comet)!;
        for (const nu of [0, Math.PI / 3, Math.PI, (4 * Math.PI) / 3, 5.9]) {
            const pos = sampleHeliocentricEllipseAtNu(g, nu, ORBIT_ELLIPSE_SEGMENTS);
            const r = Math.hypot(...pos) || 1;
            // Desvio geométrico zero; resíduo só do armazenamento Float32 da polilinha (ver acima).
            expect(distanceToPolyline(pos, orbit)).toBeLessThan(r * 1e-5);
        }
    });

    it('buildHeliocentricOrbit e buildHeliocentricEllipse produzem a MESMA geometria', () => {
        // Prova a unificação: a órbita do asteroide (q, ω, Ω) e a elipse do planeta (a, ϖ) são o
        // mesmo objeto quando descrevem a mesma órbita — um único gerador de vértice.
        const g = orbitGeometryFromElements(comet)!;
        const viaOrbit = buildHeliocentricOrbit(comet, 96)!;
        const viaEllipse = buildHeliocentricEllipse(g.semiMajorAU, g.eccentricity, g.lonPerihelionDeg, g.inclinationDeg, g.lonAscNodeDeg, 96);
        expect(viaOrbit.length).toBe(viaEllipse.length);
        for (let i = 0; i < viaOrbit.length; i += 1) {
            expect(viaOrbit[i]).toBeCloseTo(viaEllipse[i], 6);
        }
    });
});
