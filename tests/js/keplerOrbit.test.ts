import { describe, expect, it } from 'vitest';
import type { OrbitalElements } from '@/types';
import {
    GAUSS_K,
    GM_SUN_AU3_PER_DAY2,
    heliocentricArcAU,
    heliocentricPositionAU,
    julianDayUtc,
    runKeplerOrbitAssertions,
    solveKeplerEquation,
} from '@/lib/keplerOrbit';

const circularEarth: OrbitalElements = {
    ec: 0,
    qrAu: 1,
    inDeg: 0,
    omDeg: 0,
    wDeg: 0,
    tpJd: 2451545.0, // J2000
    epochJd: 2451545.0,
};

describe('runKeplerOrbitAssertions', () => {
    it('passes all built-in scientific invariants', () => {
        expect(() => runKeplerOrbitAssertions()).not.toThrow();
    });
});

describe('GM_SUN_AU3_PER_DAY2', () => {
    it('is the square of the Gaussian constant k', () => {
        expect(GM_SUN_AU3_PER_DAY2).toBeCloseTo(GAUSS_K * GAUSS_K, 18);
    });
});

describe('julianDayUtc', () => {
    it('returns 2440587.5 for the Unix epoch', () => {
        expect(julianDayUtc(new Date(0))).toBeCloseTo(2440587.5, 9);
    });

    it('advances by exactly 1 per 86400 seconds', () => {
        const a = julianDayUtc(new Date('2026-01-01T00:00:00Z'));
        const b = julianDayUtc(new Date('2026-01-02T00:00:00Z'));
        expect(b - a).toBeCloseTo(1, 12);
    });
});

describe('solveKeplerEquation', () => {
    it('residual E - e·sin(E) - M is ~0 at high eccentricity', () => {
        const cases: Array<[number, number]> = [
            [0.1, 0.0],
            [1.2, 0.5],
            [3.5, 0.7],
            [0.01, 0.95],
        ];
        for (const [M, e] of cases) {
            const E = solveKeplerEquation(M, e);
            expect(E - e * Math.sin(E) - M).toBeCloseTo(0, 12);
        }
    });

    it('returns M unchanged for e=0 (circular orbit)', () => {
        expect(solveKeplerEquation(1.234, 0)).toBeCloseTo(1.234, 12);
    });
});

describe('heliocentricPositionAU', () => {
    it('returns null for hyperbolic eccentricity', () => {
        expect(heliocentricPositionAU({ ...circularEarth, ec: 1.0 })).toBeNull();
        expect(heliocentricPositionAU({ ...circularEarth, ec: 1.5 })).toBeNull();
    });

    it('returns null for negative eccentricity', () => {
        expect(heliocentricPositionAU({ ...circularEarth, ec: -0.1 })).toBeNull();
    });

    it('returns null for non-positive perihelion', () => {
        expect(heliocentricPositionAU({ ...circularEarth, qrAu: 0 })).toBeNull();
        expect(heliocentricPositionAU({ ...circularEarth, qrAu: -1 })).toBeNull();
    });

    it('returns null when tpJd is missing (zero)', () => {
        expect(heliocentricPositionAU({ ...circularEarth, tpJd: 0 })).toBeNull();
    });

    it('returns null when tpJd is not finite', () => {
        expect(heliocentricPositionAU({ ...circularEarth, tpJd: Number.NaN })).toBeNull();
    });

    it('places the asteroid at heliocentric distance q at perihelion (M=0)', () => {
        const elements: OrbitalElements = {
            ec: 0.5,
            qrAu: 1,
            inDeg: 0,
            omDeg: 0,
            wDeg: 0,
            tpJd: julianDayUtc(new Date()),
            epochJd: 0,
        };
        const p = heliocentricPositionAU(elements, new Date());
        expect(p).not.toBeNull();
        const r = Math.hypot(p!.x, p!.y, p!.z);
        expect(r).toBeCloseTo(1, 9);
    });

    it('keeps |p|=1 AU around a circular Earth orbit at any phase', () => {
        const start = julianDayUtc(new Date('2026-01-01T00:00:00Z'));
        const samples = [0, 30, 90, 180, 270];
        for (const dayOffset of samples) {
            const p = heliocentricPositionAU(
                { ...circularEarth, tpJd: start },
                new Date(Date.UTC(2026, 0, 1) + dayOffset * 86_400_000),
            );
            expect(p).not.toBeNull();
            const r = Math.hypot(p!.x, p!.y, p!.z);
            expect(r).toBeCloseTo(1, 6);
        }
    });
});

describe('heliocentricArcAU', () => {
    it('returns null for invalid elements (same gate as the single-position helper)', () => {
        expect(heliocentricArcAU({ ...circularEarth, ec: 1.5 })).toBeNull();
        expect(heliocentricArcAU({ ...circularEarth, tpJd: 0 })).toBeNull();
    });

    it('returns samples + 1 points and is deterministic at the anchor', () => {
        const anchor = new Date('2026-06-15T12:00:00Z');
        const arc = heliocentricArcAU(circularEarth, anchor, 10, 20, 12);
        expect(arc).not.toBeNull();
        expect(arc!.length).toBe(13);
        // Every sample on a circular orbit must sit at |p| = q = 1 AU.
        for (const p of arc!) {
            expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 6);
        }
    });

    it('returns null when the time window is degenerate (samples<2 or window<=0)', () => {
        expect(heliocentricArcAU(circularEarth, new Date(), 0, 0)).toBeNull();
        expect(heliocentricArcAU(circularEarth, new Date(), 1, 1, 1)).toBeNull();
    });
});
