import { describe, expect, it } from 'vitest';
import { formatDistanceAU, formatRelativeDayLabel, formatTimestamp } from '@/lib/radar/format';
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

// ─── formatRelativeDayLabel ───────────────────────────────────────────────────

describe('formatRelativeDayLabel', () => {
    // 2026-06-11T12:00Z como "agora" de referência
    const NOW = Date.UTC(2026, 5, 11, 12, 0, 0);

    it('retorna "hoje" para evento no mesmo dia UTC', () => {
        expect(formatRelativeDayLabel('2026-06-11T23:00:00Z', NOW, 'pt-BR')).toBe('hoje');
        expect(formatRelativeDayLabel('2026-06-11T23:00:00Z', NOW, 'en')).toBe('today');
    });

    it('retorna "amanhã" para evento no dia seguinte UTC', () => {
        expect(formatRelativeDayLabel('2026-06-12T01:00:00Z', NOW, 'pt-BR')).toBe('amanhã');
        expect(formatRelativeDayLabel('2026-06-12T01:00:00Z', NOW, 'en')).toBe('tomorrow');
    });

    it('retorna "em N dias" para 2+ dias', () => {
        expect(formatRelativeDayLabel('2026-06-13T00:43:00Z', NOW, 'pt-BR')).toBe('em 2 dias');
        expect(formatRelativeDayLabel('2026-06-14T00:43:00Z', NOW, 'en')).toBe('in 3 days');
    });

    it('compara dias de calendário, não janelas de 24h', () => {
        // 23:50 de hoje → evento às 00:30 de amanhã é "amanhã", mesmo faltando 40 min
        const lateNow = Date.UTC(2026, 5, 11, 23, 50, 0);
        expect(formatRelativeDayLabel('2026-06-12T00:30:00Z', lateNow, 'pt-BR')).toBe('amanhã');
    });

    it('retorna null para data no passado (dia anterior)', () => {
        expect(formatRelativeDayLabel('2026-06-10T23:00:00Z', NOW, 'pt-BR')).toBeNull();
    });

    it('retorna null para string inválida', () => {
        expect(formatRelativeDayLabel('nao-e-uma-data', NOW, 'pt-BR')).toBeNull();
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

    it('usa até 4 casas para distâncias < 0,01 AU (NEO muito próximo)', () => {
        // 0,00123 AU — com maximumFractionDigits=4, exibe 0.0012
        const result = formatDistanceAU(KM_PER_AU * 0.00123, 'en');
        expect(result).toContain('0.0012');
    });

    it('usa até 3 casas para distâncias entre 0,01 e 0,1 AU', () => {
        // 0,0123 AU — com maximumFractionDigits=3, exibe 0.012
        const result = formatDistanceAU(KM_PER_AU * 0.0123, 'en');
        expect(result).toContain('0.012');
    });

    it('usa até 2 casas para distâncias >= 0,1 AU', () => {
        // 1,23 AU — maximumFractionDigits=2 deve preservar 2 casas
        const result = formatDistanceAU(KM_PER_AU * 1.23, 'en');
        expect(result).toContain('1.23');
    });

    it('arredonda além de 2 casas para distâncias >= 0,1 AU', () => {
        // 1,237 AU — com maximumFractionDigits=2, o resultado deve ser 1.24 (arredondado)
        const result = formatDistanceAU(KM_PER_AU * 1.237, 'en');
        expect(result).toContain('1.24');
    });
});
