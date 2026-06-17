import { describe, expect, it } from 'vitest';
import { normalize3, sunDirectionFromIncoming } from '@/lib/radar/coordinates';

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
