import { describe, expect, it } from 'vitest';
import { formatDistanceAU, formatTimestamp } from '@/lib/radar/format';
import { KM_PER_AU } from '@/lib/sceneEphemeris';

// ─── formatTimestamp ──────────────────────────────────────────────────────────

describe('formatTimestamp', () => {
    it('formata data ISO 8601 em DD/MM HH:MM (pt-BR)', () => {
        const result = formatTimestamp('2026-03-15T14:30:00Z', 'pt-BR');
        expect(result).toContain('15');
        expect(result).toContain('03');
        expect(result).toContain('14');
        expect(result).toContain('30');
    });

    it('formata data ISO 8601 em MM/DD HH:MM (en)', () => {
        const result = formatTimestamp('2026-03-15T14:30:00Z', 'en');
        expect(result).toContain('03');
        expect(result).toContain('15');
    });

    it('retorna o valor original para string inválida', () => {
        const invalid = 'nao-e-uma-data';
        expect(formatTimestamp(invalid, 'pt-BR')).toBe(invalid);
    });

    it('trata data com hora zero sem erro', () => {
        const result = formatTimestamp('2026-01-01T00:00:00Z', 'pt-BR');
        expect(result).toContain('01');
        expect(result).toContain('00');
    });

    it('usa UTC — hora não muda por fuso local', () => {
        // 23:00 UTC deve exibir 23, não a hora local do ambiente de teste
        const result = formatTimestamp('2026-06-15T23:00:00Z', 'pt-BR');
        expect(result).toContain('23');
    });
});

// ─── formatDistanceAU ─────────────────────────────────────────────────────────

describe('formatDistanceAU', () => {
    it('retorna "—" para null', () => {
        expect(formatDistanceAU(null, 'pt-BR')).toBe('—');
    });

    it('retorna "—" para undefined', () => {
        expect(formatDistanceAU(undefined, 'pt-BR')).toBe('—');
    });

    it('retorna "—" para NaN', () => {
        expect(formatDistanceAU(NaN, 'pt-BR')).toBe('—');
    });

    it('retorna "—" para Infinity', () => {
        expect(formatDistanceAU(Infinity, 'pt-BR')).toBe('—');
    });

    it('usa sufixo "UA" para pt-BR', () => {
        expect(formatDistanceAU(KM_PER_AU, 'pt-BR')).toContain('UA');
    });

    it('usa sufixo "AU" para en', () => {
        expect(formatDistanceAU(KM_PER_AU, 'en')).toContain('AU');
    });

    it('formata exatamente 1 AU como "1 UA" (zeros finais desnecessários são omitidos pelo Intl)', () => {
        const result = formatDistanceAU(KM_PER_AU, 'pt-BR');
        expect(result).toContain('1');
        expect(result).toContain('UA');
    });

    it('usa até 5 casas para distâncias < 0,01 AU (NEO muito próximo)', () => {
        // 0,00123 AU — tem 5 algarismos significativos necessários
        const result = formatDistanceAU(KM_PER_AU * 0.00123, 'en');
        // maximumFractionDigits=5 → deve preservar os 5 dígitos de 0.00123
        expect(result).toContain('0.00123');
    });

    it('usa até 4 casas para distâncias entre 0,01 e 0,1 AU', () => {
        // 0,0123 AU — precisa de 4 casas para não perder precisão
        const result = formatDistanceAU(KM_PER_AU * 0.0123, 'en');
        expect(result).toContain('0.0123');
    });

    it('usa até 3 casas para distâncias >= 0,1 AU', () => {
        // 1,234 AU — maximumFractionDigits=3 deve preservar 3 casas
        const result = formatDistanceAU(KM_PER_AU * 1.234, 'en');
        expect(result).toContain('1.234');
    });

    it('trunca além de 3 casas para distâncias >= 0,1 AU', () => {
        // 1,23456 AU — com maximumFractionDigits=3, o resultado deve ser 1.235 (arredondado)
        const result = formatDistanceAU(KM_PER_AU * 1.23456, 'en');
        expect(result).toContain('1.235');
    });
});
