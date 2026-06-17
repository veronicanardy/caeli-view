/**
 * Firewall científico da projeção heliocêntrica da cena 3D (régua única em UA).
 *
 * Estes testes não cobrem um arquivo específico, cobrem INVARIANTES que protegem a ciência da cena
 * contra regressões sutis, mesmo que a implementação seja reescrita:
 *
 *  1. A projeção preserva a DIREÇÃO (só a magnitude escala); NUNCA distorce eixo a eixo.
 *  2. Objetos no mesmo frame heliocêntrico mantêm o alinhamento relativo (ângulos preservados).
 *  3. Um objeto na direção/distância de Júpiter cai na região visual de Júpiter.
 *  4. Unidades (UA) e a troca de eixos eclíptico→cena não são aplicadas duas vezes.
 *
 * A régua é LINEAR e fiel à UA: 1 UA cai exatamente em ORBIT_AU_SCALE unidades de cena. A
 * proximidade de uma aproximação é revelada por ZOOM de câmera, nunca distorcendo a escala.
 */

import { describe, expect, it } from 'vitest';
import {
    KM_PER_AU,
    KM_PER_LD,
    LINEAR_AU_SCALE,
    ORBIT_AU_SCALE,
    helioAUToSunCenteredScene,
} from '@/lib/sceneEphemeris';

/** Ângulo (radianos) entre dois vetores 3D. 0 = mesma direção. */
function angleBetween(a: readonly number[], b: readonly number[]): number {
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const la = Math.hypot(a[0], a[1], a[2]);
    const lb = Math.hypot(b[0], b[1], b[2]);
    if (la < 1e-12 || lb < 1e-12) return 0;
    return Math.acos(Math.min(1, Math.max(-1, dot / (la * lb))));
}

/**
 * Verifica que dois vetores apontam na MESMA direção comparando seus vetores unitários componente a
 * componente. Numericamente estável perto de ângulo zero (ao contrário de acos, cuja derivada explode
 * em 0), então mantém o teste rigoroso sem falso negativo de ponto flutuante.
 */
function expectSameDirection(a: readonly number[], b: readonly number[], digits = 9): void {
    const la = Math.hypot(a[0], a[1], a[2]);
    const lb = Math.hypot(b[0], b[1], b[2]);
    for (let i = 0; i < 3; i += 1) {
        expect(a[i] / la).toBeCloseTo(b[i] / lb, digits);
    }
}

// ─── 1. A projeção preserva direção (regra de ouro) ────────────────────────────

describe('a projeção heliocêntrica preserva direção (regra de ouro)', () => {
    // Vetores oblíquos: fora dos eixos é onde uma distorção eixo a eixo apareceria.
    const obliqueVectors: [number, number, number][] = [
        [1.0, 0.5, 0.2],
        [0.3, 0.4, 1.2],
        [-0.7, 0.9, -0.4],
        [2, 2, 2],
        [0.03, -0.07, 0.05],
    ];

    it.each(obliqueVectors)('mantém a direção (no frame de saída) para [%d, %d, %d]', (x, y, z) => {
        const scene = helioAUToSunCenteredScene({ x, y, z });
        // A saída troca eixos (x, z, −y) e escala; a direção no frame de SAÍDA deve casar com a
        // entrada após a mesma troca de eixos, sem distorção.
        const sameFrameRaw: [number, number, number] = [x, z, -y];
        expectSameDirection(sameFrameRaw, scene);
    });
});

// ─── 2. Alinhamento relativo no mesmo frame ────────────────────────────────────

describe('objetos no mesmo frame heliocêntrico mantêm alinhamento relativo', () => {
    it('o ângulo entre dois objetos é preservado pela projeção', () => {
        const a = helioAUToSunCenteredScene({ x: 5, y: 0, z: 0 });   // longe, em +x
        const b = helioAUToSunCenteredScene({ x: 0, y: 0.3, z: 0 }); // perto, em +y eclíptico
        const angleRaw = angleBetween([5, 0, 0], [0, 0, -0.3]);      // mesmo após troca (x, z, −y)
        expect(angleBetween(a, b)).toBeCloseTo(angleRaw, 9);
    });

    it('a ordem radial é preservada: mais longe no real → mais longe na cena', () => {
        const r = (v: number[]) => Math.hypot(v[0], v[1], v[2]);
        const near = helioAUToSunCenteredScene({ x: 0.5, y: 0, z: 0 });
        const mid = helioAUToSunCenteredScene({ x: 2, y: 0, z: 0 });
        const far = helioAUToSunCenteredScene({ x: 5, y: 0, z: 0 });
        expect(r(near)).toBeLessThan(r(mid));
        expect(r(mid)).toBeLessThan(r(far));
    });
});

// ─── 3. Objeto na região de Júpiter ────────────────────────────────────────────

describe('objeto perto de Júpiter cai na região visual de Júpiter', () => {
    const JUPITER_AU = 5.2;
    const jupiterScene = helioAUToSunCenteredScene({ x: JUPITER_AU, y: 0, z: 0 });

    it('um objeto a ~0,05 UA de Júpiter renderiza adjacente a Júpiter', () => {
        const nearJupiter = helioAUToSunCenteredScene({ x: JUPITER_AU - 0.05, y: 0.03, z: 0.01 });
        const dist = Math.hypot(
            nearJupiter[0] - jupiterScene[0],
            nearJupiter[1] - jupiterScene[1],
            nearJupiter[2] - jupiterScene[2],
        );
        const jupiterRadius = Math.hypot(...jupiterScene);
        expect(dist).toBeLessThan(jupiterRadius * 0.05);
    });

    it('um objeto a 5,2 UA heliocêntricas cai sobre Júpiter (vizinhança fiel à UA)', () => {
        const objScene = helioAUToSunCenteredScene({ x: JUPITER_AU, y: 0, z: 0 });
        expect(angleBetween(objScene, jupiterScene)).toBeCloseTo(0, 6);
        expect(Math.hypot(...objScene)).toBeCloseTo(Math.hypot(...jupiterScene), 6);
    });
});

// ─── 4. Unidades e eixos não são aplicados duas vezes ──────────────────────────

describe('unidades e eixos aplicados exatamente uma vez', () => {
    it('usa KM_PER_AU uma vez: 1 UA → 1 × ORBIT_AU_SCALE', () => {
        const s = helioAUToSunCenteredScene({ x: 1, y: 0, z: 0 });
        expect(s[0]).toBeCloseTo(ORBIT_AU_SCALE, 9);
    });

    it('a régua é fiel à distância: N UA caem em N × LINEAR_AU_SCALE', () => {
        const s = helioAUToSunCenteredScene({ x: 4.2, y: 0, z: 0 });
        expect(Math.hypot(...s)).toBeCloseTo(4.2 * LINEAR_AU_SCALE, 6);
    });

    it('a troca de eixos eclíptico→cena (x, z, −y) ocorre uma vez, sem inversão dupla', () => {
        // +y eclíptico deve virar −z na cena. Uma troca dupla devolveria +y.
        const s = helioAUToSunCenteredScene({ x: 0, y: 1, z: 0 });
        expect(Math.abs(s[0])).toBeLessThan(1e-9);
        expect(Math.abs(s[1])).toBeLessThan(1e-9);
        expect(s[2]).toBeCloseTo(-ORBIT_AU_SCALE, 9);
    });

    it('sanidade de unidades: 1 UA = KM_PER_AU/KM_PER_LD distâncias lunares (~389)', () => {
        expect(KM_PER_AU / KM_PER_LD).toBeGreaterThan(388);
        expect(KM_PER_AU / KM_PER_LD).toBeLessThan(390);
    });
});
