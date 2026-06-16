/**
 * VALIDAÇÃO NUMÉRICA da matemática orbital contra uma efeméride independente (astronomy-engine).
 *
 * Por que existe: os testes de invariante (compressRadial, planetOnEllipse, runKeplerOrbitAssertions)
 * provam PROPRIEDADES — monotonicidade, direção preservada, resíduo de Kepler ~0, corpo sobre a linha.
 * Nenhum deles prova VALOR ABSOLUTO. Um sinal trocado em Ω, ω ou i, ou um fator de unidade errado,
 * passaria em todos eles e ainda assim poria o planeta no octante errado do céu.
 *
 * Estratégia: o astronomy-engine (já é dependência, usado em sceneEphemeris) é a fonte de verdade.
 * Para cada planeta:
 *   1. Derivamos os elementos osculadores do state vector REAL (mesma matemática de sceneEphemeris),
 *      em eclíptico J2000.
 *   2. Alimentamos esses elementos no propagador 2-corpos INDEPENDENTE do projeto
 *      (heliocentricPositionAU → solveKeplerEquation → perifocalToEclipticAU).
 *   3. Comparamos a posição propagada com HelioVector (efeméride completa) NO MESMO instante,
 *      convertida EQJ→ECL pela mesma rotação que o app usa.
 *
 * Como é a MESMA época, a posição osculadora 2-corpos deve coincidir com a efeméride perturbada
 * (a deriva osculadora-vs-perturbada é desprezível no instante da época). Uma divergência grande
 * delata sinal/quadrante/unidade — exatamente o que queremos pegar.
 */

import { describe, expect, it } from 'vitest';
import * as A from 'astronomy-engine';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { perifocalToEclipticAU } from '@/lib/sceneEphemeris';
import { julianDayUtc } from '@/lib/keplerOrbit';
import type { OrbitalElements } from '@/types';

const GM = 2.959122082855911e-4; // GM_sol em UA³/dia² (mesmo valor de sceneEphemeris.planetData)
const DATE = new Date('2026-06-16T00:00:00Z');

const eqjToEcl = A.Rotation_EQJ_ECL();

/** Posição heliocêntrica eclíptica J2000 (UA) da efeméride completa — a verdade de referência. */
function helioEclTruth(body: A.Body): { x: number; y: number; z: number } {
    const eqj = A.HelioVector(body, DATE);
    const ecl = A.RotateVector(eqjToEcl, eqj);
    return { x: ecl.x, y: ecl.y, z: ecl.z };
}

/**
 * Deriva os elementos osculadores (eclíptico J2000) do state vector real do astronomy-engine.
 * Replica EXATAMENTE a matemática de planetData() em sceneEphemeris.ts, de forma independente,
 * para alimentar o propagador do projeto com elementos que ele teria recebido em produção.
 */
function osculatingElements(body: A.Body): OrbitalElements {
    const state = A.HelioState(body, DATE);
    const pos = A.RotateVector(eqjToEcl, new A.Vector(state.x, state.y, state.z, state.t));
    const vel = A.RotateVector(eqjToEcl, new A.Vector(state.vx, state.vy, state.vz, state.t));

    const r = Math.hypot(pos.x, pos.y, pos.z);
    const v2 = vel.x ** 2 + vel.y ** 2 + vel.z ** 2;
    const a = 1 / (2 / r - v2 / GM);
    const rdotv = pos.x * vel.x + pos.y * vel.y + pos.z * vel.z;

    const exv = (v2 / GM - 1 / r) * pos.x - (rdotv / GM) * vel.x;
    const eyv = (v2 / GM - 1 / r) * pos.y - (rdotv / GM) * vel.y;
    const ezv = (v2 / GM - 1 / r) * pos.z - (rdotv / GM) * vel.z;
    const ec = Math.hypot(exv, eyv, ezv);

    const hx = pos.y * vel.z - pos.z * vel.y;
    const hy = pos.z * vel.x - pos.x * vel.z;
    const hz = pos.x * vel.y - pos.y * vel.x;
    const hLen = Math.hypot(hx, hy, hz);
    const inDeg = (Math.acos(Math.min(1, Math.max(-1, hz / hLen))) * 180) / Math.PI;
    const omDeg = ((Math.atan2(hx, -hy) * 180) / Math.PI + 360) % 360;

    const nx = -hy;
    const ny = hx;
    const nLen = Math.hypot(nx, ny);
    const cosArgP = (nx * exv + ny * eyv) / (nLen * ec);
    const nCrossE_z = nx * eyv - ny * exv;
    const sinArgP = (nCrossE_z * (hz / hLen)) / (nLen * ec);
    const wDeg = ((Math.atan2(sinArgP, cosArgP) * 180) / Math.PI + 360) % 360;

    // Tempo de passagem pelo periélio: voltamos da anomalia verdadeira atual à média, e daí a tpJd.
    const cosNu = (exv * pos.x + eyv * pos.y + ezv * pos.z) / (ec * r);
    const nu = Math.atan2(
        rdotv >= 0 ? Math.sqrt(Math.max(0, 1 - cosNu * cosNu)) : -Math.sqrt(Math.max(0, 1 - cosNu * cosNu)),
        Math.min(1, Math.max(-1, cosNu)),
    );
    const E = 2 * Math.atan2(Math.sqrt(1 - ec) * Math.sin(nu / 2), Math.sqrt(1 + ec) * Math.cos(nu / 2));
    const M = E - ec * Math.sin(E); // rad
    const n = Math.sqrt(GM / (a * a * a)); // rad/dia
    const tpJd = julianDayUtc(DATE) - M / n;

    return { ec, qrAu: a * (1 - ec), inDeg, omDeg, wDeg, tpJd, epochJd: julianDayUtc(DATE) };
}

const PLANETS: [string, A.Body][] = [
    ['Mercury', A.Body.Mercury],
    ['Venus', A.Body.Venus],
    ['Earth', A.Body.Earth],
    ['Mars', A.Body.Mars],
    ['Jupiter', A.Body.Jupiter],
    ['Saturn', A.Body.Saturn],
    ['Uranus', A.Body.Uranus],
    ['Neptune', A.Body.Neptune],
];

describe('propagador de Kepler vs efeméride independente (astronomy-engine)', () => {
    it.each(PLANETS)(
        '%s: a posição propagada coincide com HelioVector no mesmo instante',
        (_name, body) => {
            const els = osculatingElements(body);
            const propagated = heliocentricPositionAU(els, DATE);
            const truth = helioEclTruth(body);
            expect(propagated).not.toBeNull();

            const r = Math.hypot(truth.x, truth.y, truth.z);
            // Tolerância relativa de 1%. Este teste pega ERRO ESTRUTURAL (sinal/quadrante/unidade
            // trocados), que jogaria a posição para ~r de distância (erro de ~100%). NÃO mede
            // precisão de efeméride: a propagação 2-corpos osculadora difere da efeméride perturbada
            // por perturbações planetárias reais (medido: <0,2% no instante da época; Júpiter/Saturno
            // são os maiores por se perturbarem mutuamente). 1%·r aceita essa deriva física e ainda
            // separa um bug de sinal por duas ordens de grandeza.
            const tol = 1e-2 * r;
            expect(Math.abs(propagated!.x - truth.x)).toBeLessThan(tol);
            expect(Math.abs(propagated!.y - truth.y)).toBeLessThan(tol);
            expect(Math.abs(propagated!.z - truth.z)).toBeLessThan(tol);
        },
    );

    it.each(PLANETS)('%s: distância heliocêntrica propagada bate com a real', (_name, body) => {
        const els = osculatingElements(body);
        const propagated = heliocentricPositionAU(els, DATE)!;
        const truth = helioEclTruth(body);
        const rProp = Math.hypot(propagated.x, propagated.y, propagated.z);
        const rTruth = Math.hypot(truth.x, truth.y, truth.z);
        // 0,5% relativo: pega fator de unidade errado (AU/km, e²) sem reprovar a deriva osculadora.
        expect(Math.abs(rProp - rTruth) / rTruth).toBeLessThan(5e-3);
    });
});

describe('rotação perifocal → eclíptico: sinal e quadrante (closed-form)', () => {
    it('Ω=90°, i=0: periélio (xp=+1) aponta para +y eclíptico (rotação no sentido anti-horário)', () => {
        const p = perifocalToEclipticAU(1, 0, 0, 90, 0);
        expect(p.x).toBeCloseTo(0, 9);
        expect(p.y).toBeCloseTo(1, 9);
        expect(p.z).toBeCloseTo(0, 9);
    });

    it('ω=90°, i=0: o eixo perifocal +x cai sobre +y eclíptico', () => {
        const p = perifocalToEclipticAU(1, 0, 0, 0, 90);
        expect(p.x).toBeCloseTo(0, 9);
        expect(p.y).toBeCloseTo(1, 9);
        expect(p.z).toBeCloseTo(0, 9);
    });

    it('i=90°, Ω=0: o eixo perifocal +y sobe para +z eclíptico (inclinação levanta o plano)', () => {
        const p = perifocalToEclipticAU(0, 1, 90, 0, 0);
        expect(p.x).toBeCloseTo(0, 9);
        expect(p.y).toBeCloseTo(0, 9);
        expect(p.z).toBeCloseTo(1, 9);
    });

    it('i=90°, Ω=90°: +y perifocal ainda sobe para +z (linha dos nós no eixo y)', () => {
        const p = perifocalToEclipticAU(0, 1, 90, 90, 0);
        expect(p.z).toBeCloseTo(1, 9);
    });

    it('preserva norma sob rotação pura (sem escala embutida na fórmula perifocal)', () => {
        const p = perifocalToEclipticAU(0.6, 0.8, 37, 211, 123);
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 9);
    });
});
