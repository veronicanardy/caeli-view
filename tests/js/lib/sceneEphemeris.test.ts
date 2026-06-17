import { describe, expect, it } from 'vitest';
import {
    AU_IN_DL,
    KM_PER_AU,
    KM_PER_LD,
    LINEAR_AU_SCALE,
    ORBIT_AU_SCALE,
    SUN_DISPLAY_DL,
    buildHeliocentricOrbit,
    compressDistanceDl,
    compressSceneVector,
    helioAUToSunCenteredScene,
    perifocalToEclipticAU,
    runSceneEphemerisAssertions,
} from '@/lib/sceneEphemeris';

describe('runSceneEphemerisAssertions', () => {
    it('passes all built-in scientific invariants', () => {
        expect(() => runSceneEphemerisAssertions()).not.toThrow();
    });
});

describe('compressDistanceDl', () => {
    it('maps the Moon (1 DL) to exactly 1 scene unit', () => {
        expect(compressDistanceDl(1)).toBeCloseTo(1, 9);
    });

    it('maps zero and negative inputs to zero', () => {
        expect(compressDistanceDl(0)).toBe(0);
        expect(compressDistanceDl(-5)).toBe(0);
    });

    it('is strictly monotonic across the full near-Earth-to-Sun range', () => {
        const samples = [0.1, 0.5, 1, 2, 10, 50, 100, AU_IN_DL];
        for (let i = 1; i < samples.length; i += 1) {
            expect(compressDistanceDl(samples[i])).toBeGreaterThan(compressDistanceDl(samples[i - 1]));
        }
    });

    it('SUN_DISPLAY_DL is an alias of the single linear ruler (LINEAR_AU_SCALE)', () => {
        // 1 AU in scene units = the single ruler. The legacy log value (~96) is gone.
        expect(SUN_DISPLAY_DL).toBeCloseTo(LINEAR_AU_SCALE, 9);
    });
});

describe('compressSceneVector', () => {
    it('preserves direction — only magnitude is rescaled', () => {
        const v: [number, number, number] = [10, 5, 2];
        const c = compressSceneVector(v);
        const r0 = Math.hypot(...v);
        const r1 = Math.hypot(...c);
        expect(c[0] / r1).toBeCloseTo(v[0] / r0, 12);
        expect(c[1] / r1).toBeCloseTo(v[1] / r0, 12);
        expect(c[2] / r1).toBeCloseTo(v[2] / r0, 12);
    });

    it('returns zero vector for zero input', () => {
        expect(compressSceneVector([0, 0, 0])).toEqual([0, 0, 0]);
    });

    it('compressed magnitude equals compressDistanceDl of the input magnitude', () => {
        const v: [number, number, number] = [3, 4, 0];
        const c = compressSceneVector(v);
        expect(Math.hypot(...c)).toBeCloseTo(compressDistanceDl(5), 12);
    });
});

describe('perifocalToEclipticAU', () => {
    it('maps perihelion to +x ecliptic when i=Ω=ω=0', () => {
        const p = perifocalToEclipticAU(1, 0, 0, 0, 0);
        expect(p.x).toBeCloseTo(1, 12);
        expect(p.y).toBeCloseTo(0, 12);
        expect(p.z).toBeCloseTo(0, 12);
    });

    it('lifts the +y perifocal axis to +z ecliptic for i=90°', () => {
        const q = perifocalToEclipticAU(0, 1, 90, 0, 0);
        expect(q.x).toBeCloseTo(0, 12);
        expect(q.y).toBeCloseTo(0, 12);
        expect(q.z).toBeCloseTo(1, 12);
    });

    it('rotates by Ω around the ecliptic Z axis', () => {
        // i=ω=0 keeps the orbit in the ecliptic. Ω=90° turns the perihelion direction
        // from +x to +y.
        const p = perifocalToEclipticAU(1, 0, 0, 90, 0);
        expect(p.x).toBeCloseTo(0, 12);
        expect(p.y).toBeCloseTo(1, 12);
        expect(p.z).toBeCloseTo(0, 12);
    });
});

describe('buildHeliocentricOrbit', () => {
    const earthCircular = { ec: 0, qrAu: 1, inDeg: 0, omDeg: 0, wDeg: 0 };

    it('returns null for hyperbolic eccentricity', () => {
        expect(buildHeliocentricOrbit({ ...earthCircular, ec: 1.2 }, 64)).toBeNull();
    });

    it('returns null for non-finite eccentricity', () => {
        expect(buildHeliocentricOrbit({ ...earthCircular, ec: Number.NaN }, 64)).toBeNull();
    });

    it('returns null for non-positive perihelion', () => {
        expect(buildHeliocentricOrbit({ ...earthCircular, qrAu: 0 }, 64)).toBeNull();
        expect(buildHeliocentricOrbit({ ...earthCircular, qrAu: -1 }, 64)).toBeNull();
    });

    it('produces a closed loop: first and last point coincide', () => {
        const pts = buildHeliocentricOrbit(earthCircular, 256)!;
        expect(pts).not.toBeNull();
        const n = pts.length;
        // Float32 storage: ~7 significant digits.
        expect(pts[0]).toBeCloseTo(pts[n - 3], 4);
        expect(pts[1]).toBeCloseTo(pts[n - 2], 4);
        expect(pts[2]).toBeCloseTo(pts[n - 1], 4);
    });

    it('Earth-circular orbit centered on the Sun keeps |p| ≈ ORBIT_AU_SCALE for every sample', () => {
        const pts = buildHeliocentricOrbit(earthCircular, 128)!;
        // Tolerance reflects Float32Array storage (~7 significant digits), not the math itself.
        for (let i = 0; i < pts.length; i += 3) {
            const r = Math.hypot(pts[i], pts[i + 1], pts[i + 2]);
            expect(r).toBeCloseTo(ORBIT_AU_SCALE, 4);
        }
    });
});

describe('helioAUToSunCenteredScene', () => {
    it('aplica o swap de eixos (x, z, −y) e o fator linear ORBIT_AU_SCALE', () => {
        // eclíptico (1, 2, 3) → cena (1*s, 3*s, -2*s)
        const s = helioAUToSunCenteredScene({ x: 1, y: 2, z: 3 });
        expect(s[0]).toBeCloseTo(1 * ORBIT_AU_SCALE, 12);
        expect(s[1]).toBeCloseTo(3 * ORBIT_AU_SCALE, 12);
        expect(s[2]).toBeCloseTo(-2 * ORBIT_AU_SCALE, 12);
    });

    it('coloca o Sol (origem) na origem da cena', () => {
        const s = helioAUToSunCenteredScene({ x: 0, y: 0, z: 0 });
        expect(s[0]).toBeCloseTo(0, 12);
        expect(s[1]).toBeCloseTo(0, 12);
        expect(s[2]).toBeCloseTo(0, 12);
    });

    it('convenção de eixos: polo norte eclíptico (z > 0) mapeia para Y positivo na cena', () => {
        // eclíptico (x, y, z) → cena (x, z, −y): z=1 → scene Y = 1*scale > 0
        const s = helioAUToSunCenteredScene({ x: 0, y: 0, z: 1 });
        expect(s[1]).toBeGreaterThan(0);
        expect(s[0]).toBeCloseTo(0, 12);
        expect(s[2]).toBeCloseTo(0, 12);
    });

    it('convenção de eixos: eclíptico +x mapeia para cena +x (inalterado)', () => {
        const s = helioAUToSunCenteredScene({ x: 1, y: 0, z: 0 });
        expect(s[0]).toBeGreaterThan(0);
        expect(s[1]).toBeCloseTo(0, 12);
        expect(s[2]).toBeCloseTo(0, 12);
    });

    it('convenção de eixos: eclíptico +y mapeia para cena −z', () => {
        // eclíptico (0, 1, 0) → cena (0, 0, -1*scale)
        const s = helioAUToSunCenteredScene({ x: 0, y: 1, z: 0 });
        expect(s[0]).toBeCloseTo(0, 12);
        expect(s[1]).toBeCloseTo(0, 12);
        expect(s[2]).toBeCloseTo(-1 * ORBIT_AU_SCALE, 12);
    });
});

describe('unit constants', () => {
    it('AU_IN_DL equals KM_PER_AU / KM_PER_LD', () => {
        expect(AU_IN_DL).toBeCloseTo(KM_PER_AU / KM_PER_LD, 9);
        // Sanity: 1 AU is ~389 lunar distances.
        expect(AU_IN_DL).toBeGreaterThan(388);
        expect(AU_IN_DL).toBeLessThan(390);
    });
});
