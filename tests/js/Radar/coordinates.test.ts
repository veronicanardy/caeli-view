import { describe, expect, it } from 'vitest';
import { horizonsToScene, normalize3, sunDirectionFromIncoming } from '@/lib/observatory/coordinates';
import { compressDistanceDl, KM_PER_LD } from '@/lib/sceneEphemeris';

describe('horizonsToScene', () => {
    it('mapeia +Y da eclíptica para -Z da cena para manter o plano da eclíptica em XZ', () => {
        // The scene convention is x -> x, z -> y, and -y -> z.
        const scene = horizonsToScene(0, KM_PER_LD, 0);
        // So a pure +Y ecliptic vector becomes a pure -Z scene vector after compression.
        expect(Math.abs(scene[0])).toBeLessThan(1e-9);
        expect(Math.abs(scene[1])).toBeLessThan(1e-9);
        // The compression is applied to the magnitude (1 DL -> 1 scene unit by construction).
        expect(scene[2]).toBeCloseTo(-1, 9);
    });

    it('mapeia um vetor puro em X da eclíptica para +X da cena com compressão logarítmica na magnitude', () => {
        const scene = horizonsToScene(KM_PER_LD, 0, 0);
        expect(scene[0]).toBeCloseTo(1, 9);
        expect(Math.abs(scene[1])).toBeLessThan(1e-9);
        expect(Math.abs(scene[2])).toBeLessThan(1e-9);
    });

    it('preserva a direção: a magnitude na cena equivale a compressDistanceDl da distância real em DL', () => {
        // Horizons km (3, 4, 0) -> 5 km input -> 5/KM_PER_LD DL real distance.
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
    it('retorna um vetor unitário', () => {
        const n = normalize3([3, 4, 0]);
        expect(Math.hypot(...n)).toBeCloseTo(1, 12);
    });

    it('preserva a direção', () => {
        const n = normalize3([3, 4, 0]);
        expect(n[0]).toBeCloseTo(3 / 5, 12);
        expect(n[1]).toBeCloseTo(4 / 5, 12);
        expect(n[2]).toBeCloseTo(0, 12);
    });

    it('retorna [0, 0, 0] para vetor nulo sem dividir por zero', () => {
        const n = normalize3([0, 0, 0]);
        expect(n).toEqual([0, 0, 0]);
    });
});

describe('sunDirectionFromIncoming', () => {
    it('mapeia as coordenadas do backend (x_ecl, y_ecl) para a cena em (x, z), com y zerado', () => {
        // Backend gives a 2D ecliptic direction; scene wants x -> x, y_ecl -> z, z_ecl (=0) -> y.
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

    it('sempre retorna um vetor unitário', () => {
        const v = sunDirectionFromIncoming({
            x: 0.6,
            y: 0.8,
            longitudeDeg: 53.13,
            timestamp: '2026-01-01T00:00:00Z',
        });
        expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    });
});
