import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/observatory/moonTextures';

describe('mulberry32', () => {
    it('is deterministic for the same seed', () => {
        const a = mulberry32(0xd4e5f6);
        const b = mulberry32(0xd4e5f6);
        for (let i = 0; i < 32; i += 1) {
            expect(a()).toBe(b());
        }
    });

    it('returns values in [0, 1)', () => {
        const rng = mulberry32(42);
        for (let i = 0; i < 1000; i += 1) {
            const v = rng();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('different seeds produce different sequences', () => {
        const a = mulberry32(1);
        const b = mulberry32(2);
        const diff = Array.from({ length: 16 }, () => a() !== b()).filter(Boolean).length;
        expect(diff).toBeGreaterThan(10);
    });
});
