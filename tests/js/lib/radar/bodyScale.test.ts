import { describe, expect, it } from 'vitest';
import {
    EARTH_HITBOX_DL,
    EARTH_RADIUS_DL,
    MOON_HITBOX_DL,
    MOON_RADIUS_DL,
} from '@/lib/radar/bodyScale';

// ─── Invariantes de escala ─────────────────────────────────────────────────────
// Os hitboxes devem ser SEMPRE maiores que os raios visuais. Se alguém ajustar os
// raios e esquecer os hitboxes, esses testes capturam a regressão.

describe('bodyScale — invariantes de hitbox', () => {
    it('EARTH_HITBOX_DL é maior que EARTH_RADIUS_DL', () => {
        expect(EARTH_HITBOX_DL).toBeGreaterThan(EARTH_RADIUS_DL);
    });

    it('MOON_HITBOX_DL é maior que MOON_RADIUS_DL', () => {
        expect(MOON_HITBOX_DL).toBeGreaterThan(MOON_RADIUS_DL);
    });

    it('EARTH_HITBOX_DL é exatamente 1,8× EARTH_RADIUS_DL', () => {
        expect(EARTH_HITBOX_DL).toBeCloseTo(EARTH_RADIUS_DL * 1.8, 12);
    });

    it('MOON_HITBOX_DL é exatamente 3× MOON_RADIUS_DL', () => {
        expect(MOON_HITBOX_DL).toBeCloseTo(MOON_RADIUS_DL * 3, 12);
    });

    it('EARTH_RADIUS_DL é maior que MOON_RADIUS_DL — Terra maior que Lua', () => {
        expect(EARTH_RADIUS_DL).toBeGreaterThan(MOON_RADIUS_DL);
    });
});
