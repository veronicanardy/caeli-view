import { describe, expect, it } from 'vitest';
import {
    allBodyTexturesSettled,
    getBodyTextureProgress,
    registerBodyTexture,
} from '@/lib/radar/bodyTextureRegistry';

// ─── allBodyTexturesSettled (pura) ─────────────────────────────────────────────

describe('allBodyTexturesSettled', () => {
    it('não está pronto quando nada se registrou (cena ainda não montou corpos)', () => {
        expect(allBodyTexturesSettled({ registered: 0, settled: 0 })).toBe(false);
    });

    it('não está pronto enquanto faltam texturas resolverem', () => {
        expect(allBodyTexturesSettled({ registered: 3, settled: 1 })).toBe(false);
        expect(allBodyTexturesSettled({ registered: 3, settled: 2 })).toBe(false);
    });

    it('está pronto quando todas as registradas resolveram', () => {
        expect(allBodyTexturesSettled({ registered: 3, settled: 3 })).toBe(true);
    });

    it('continua pronto se o resolvido passar do registrado (defensivo)', () => {
        expect(allBodyTexturesSettled({ registered: 2, settled: 5 })).toBe(true);
    });
});

// ─── registerBodyTexture (store) ───────────────────────────────────────────────

describe('registerBodyTexture', () => {
    it('incrementa registrados ao registrar e resolvidos ao concluir', () => {
        const before = getBodyTextureProgress();

        const settle = registerBodyTexture();
        expect(getBodyTextureProgress().registered).toBe(before.registered + 1);
        expect(getBodyTextureProgress().settled).toBe(before.settled);

        settle();
        expect(getBodyTextureProgress().settled).toBe(before.settled + 1);
    });

    it('é idempotente: concluir mais de uma vez conta só uma resolução', () => {
        const settle = registerBodyTexture();
        const afterRegister = getBodyTextureProgress();

        settle();
        const afterFirstSettle = getBodyTextureProgress().settled;
        settle();
        settle();

        expect(getBodyTextureProgress().settled).toBe(afterFirstSettle);
        expect(afterFirstSettle).toBe(afterRegister.settled + 1);
    });
});
