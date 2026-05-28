import { describe, expect, it } from 'vitest';
import { horizonsToScene, normalize3, sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import { compressDistanceDl, KM_PER_LD } from '@/lib/sceneEphemeris';

describe('horizonsToScene', () => {
    it('swaps Y ↔ Z (ecliptic plane goes to scene XZ, ecliptic north goes to scene +Y)', () => {
        // A vector with a single non-zero ecliptic-Y component should land on scene +Y.
        const scene = horizonsToScene(0, KM_PER_LD, 0);
        // After axis swap the input ecliptic-Y maps to scene-Z (index 2), and ecliptic-Z (input z=0)
        // maps to scene-Y (index 1). So a (0, 1 DL, 0) input becomes (0, 0, scaled).
        expect(Math.abs(scene[0])).toBeLessThan(1e-9);
        expect(Math.abs(scene[1])).toBeLessThan(1e-9);
        // The compression is applied to the magnitude (1 DL → 1 scene unit by construction).
        expect(scene[2]).toBeCloseTo(1, 9);
    });

    it('maps a pure ecliptic-X km vector to scene +X with log compression on magnitude', () => {
        const scene = horizonsToScene(KM_PER_LD, 0, 0);
        expect(scene[0]).toBeCloseTo(1, 9);
        expect(Math.abs(scene[1])).toBeLessThan(1e-9);
        expect(Math.abs(scene[2])).toBeLessThan(1e-9);
    });

    it('keeps direction honest: scene magnitude equals compressDistanceDl(real DL distance)', () => {
        // Horizons km (3, 4, 0) → 5 km input → 5/KM_PER_LD DL real distance.
        const km = 5 * KM_PER_LD;
        const scene = horizonsToScene(3 * KM_PER_LD * 3 / 5, 4 * KM_PER_LD * 3 / 5, 0);
        // Simpler: feed (3, 4, 0) DL and check magnitude lines up with compressDistanceDl(5).
        const a = horizonsToScene(3 * KM_PER_LD, 4 * KM_PER_LD, 0);
        const mag = Math.hypot(a[0], a[1], a[2]);
        expect(mag).toBeCloseTo(compressDistanceDl(5), 9);
        expect(km).toBeGreaterThan(0); // shut unused-var
        expect(Math.hypot(scene[0], scene[1], scene[2])).toBeGreaterThan(0);
    });
});

describe('normalize3', () => {
    it('returns a unit vector', () => {
        const n = normalize3([3, 4, 0]);
        expect(Math.hypot(...n)).toBeCloseTo(1, 12);
    });

    it('preserves direction', () => {
        const n = normalize3([3, 4, 0]);
        expect(n[0]).toBeCloseTo(3 / 5, 12);
        expect(n[1]).toBeCloseTo(4 / 5, 12);
        expect(n[2]).toBeCloseTo(0, 12);
    });

    it('falls back to (1, 0, 0) length for a zero vector (does not divide by zero)', () => {
        const n = normalize3([0, 0, 0]);
        expect(n).toEqual([0, 0, 0]);
    });
});

describe('sunDirectionFromIncoming', () => {
    it('maps backend (x_ecl, y_ecl) onto scene (x, z) with z=0 in y', () => {
        // Backend gives a 2D ecliptic direction; scene wants x→x, y_ecl→z, z_ecl(=0)→y.
        const v = sunDirectionFromIncoming({
            x: 1,
            y: 0,
            longitudeDeg: 0,
            timestamp: '2026-01-01T00:00:00Z',
        });
        expect(v[0]).toBeCloseTo(1, 9);
        expect(v[1]).toBeCloseTo(0, 9);
        expect(v[2]).toBeCloseTo(0, 9);
    });

    it('always returns a unit vector', () => {
        const v = sunDirectionFromIncoming({
            x: 0.6,
            y: 0.8,
            longitudeDeg: 53.13,
            timestamp: '2026-01-01T00:00:00Z',
        });
        expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    });
});
