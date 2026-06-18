/**
 * Testes de resolveObjectLimit: o sentinela "Todos" do radar precisa virar o
 * teto numérico aceito pelo backend, e as quantidades fixas precisam passar
 * intactas.
 *
 * Responsabilidade: garantir o contrato entre o controle de quantidade (que
 * pode emitir 'all') e a camada de fetch (que só fala em número).
 */
import { describe, expect, it } from 'vitest';
import { OBJECT_LIMITS, OBJECT_LIMIT_MAX, resolveObjectLimit } from '@/types';

describe('resolveObjectLimit', () => {
    it('resolve o sentinela "all" para o teto do backend', () => {
        expect(resolveObjectLimit('all')).toBe(OBJECT_LIMIT_MAX);
    });

    it('mantém as quantidades numéricas inalteradas', () => {
        expect(resolveObjectLimit(5)).toBe(5);
        expect(resolveObjectLimit(15)).toBe(15);
        expect(resolveObjectLimit(30)).toBe(30);
    });

    it('nunca devolve um valor acima do teto aceito pelo backend', () => {
        for (const limit of OBJECT_LIMITS) {
            expect(resolveObjectLimit(limit)).toBeLessThanOrEqual(OBJECT_LIMIT_MAX);
        }
    });

    it('"all" resolve para mais que o chip 30', () => {
        expect(resolveObjectLimit('all')).toBeGreaterThan(resolveObjectLimit(30));
    });
});
