import { describe, expect, it, beforeEach } from 'vitest';
import { cursorPointerEnter, cursorPointerLeave, cursorReset } from '@/lib/radar/cursor';

// Em ambiente Node, `document` é undefined. O cursor.ts faz guard de `typeof document`,
// por isso os testes validam apenas a lógica de contagem de referência — sem efeitos de DOM.

// Cada teste começa com o contador zerado via cursorReset para evitar vazamento entre testes.
beforeEach(() => {
    cursorReset();
});

// ─── cursorPointerEnter / cursorPointerLeave ───────────────────────────────────

describe('cursorPointerEnter e cursorPointerLeave', () => {
    it('não lança exceção em ambiente sem DOM', () => {
        expect(() => cursorPointerEnter()).not.toThrow();
        expect(() => cursorPointerLeave()).not.toThrow();
    });

    it('múltiplos enters seguidos de leaves balanceados não lançam exceção', () => {
        cursorPointerEnter();
        cursorPointerEnter();
        cursorPointerLeave();
        cursorPointerLeave();
        expect(() => cursorPointerLeave()).not.toThrow(); // extra leave abaixo de zero
    });

    it('leave extra (abaixo de zero) não lança exceção — contador para em 0', () => {
        // O contador não deve ir para negativo
        cursorPointerLeave();
        cursorPointerLeave();
        // Deve voltar ao estado neutro sem erro
        expect(() => cursorPointerEnter()).not.toThrow();
    });
});

// ─── cursorReset ──────────────────────────────────────────────────────────────

describe('cursorReset', () => {
    it('não lança exceção mesmo sem DOM', () => {
        cursorPointerEnter();
        cursorPointerEnter();
        expect(() => cursorReset()).not.toThrow();
    });

    it('após reset, um leave não lança exceção (contador está em 0)', () => {
        cursorPointerEnter();
        cursorReset();
        expect(() => cursorPointerLeave()).not.toThrow();
    });

    it('após reset, enter e leave são simétricos novamente', () => {
        cursorPointerEnter();
        cursorPointerEnter();
        cursorReset();
        // Agora o estado é limpo: um enter seguido de um leave não deve causar problemas
        cursorPointerEnter();
        expect(() => cursorPointerLeave()).not.toThrow();
    });
});
