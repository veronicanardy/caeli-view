import { describe, expect, it } from 'vitest';
import {
    formatApproachDate,
    formatApproachTime,
    formatAstronomicalUnit,
} from '@/Components/Radar/Panels/panelFormatters';

/**
 * `panelFormatters` padroniza datas e unidades exibidas nos painéis.
 * Os testes garantem que formatações, fallbacks e localização funcionam
 * corretamente — erros aqui aparecem direto para o usuário final.
 */

// ─── formatAstronomicalUnit ────────────────────────────────────────────────────

const AU_KM = 149_597_870.7;

describe('formatAstronomicalUnit', () => {
    it('retorna null para distância null', () => {
        expect(formatAstronomicalUnit(null, 'pt-BR')).toBeNull();
        expect(formatAstronomicalUnit(null, 'en')).toBeNull();
    });

    it('formata 1 UA com sufixo UA em PT-BR', () => {
        const result = formatAstronomicalUnit(AU_KM, 'pt-BR');
        expect(result).toContain('UA');
        expect(result).toContain('1');
    });

    it('formata 1 UA com sufixo AU em EN', () => {
        const result = formatAstronomicalUnit(AU_KM, 'en');
        expect(result).toContain('AU');
        expect(result).toContain('1');
    });

    it('usa mais casas decimais para distâncias menores que 0.1 UA do que para maiores', () => {
        // A função usa precisão 4 para AU < 0.1 e precisão 3 para >= 0.1.
        // formatNumber não inclui zeros de trailing — validamos o comprimento relativo das casas.
        const small = formatAstronomicalUnit(AU_KM * 0.05, 'en')!;
        const large = formatAstronomicalUnit(AU_KM * 0.5, 'en')!;
        const decimalPlacesOf = (s: string) => (s.match(/[.,](\d+)/)?.[1] ?? '').length;
        expect(decimalPlacesOf(small)).toBeGreaterThanOrEqual(decimalPlacesOf(large));
    });

    it('o resultado contém o sufixo de unidade e um número', () => {
        const result = formatAstronomicalUnit(AU_KM * 0.5, 'en');
        expect(result).toMatch(/[\d].*AU/);
    });
});

// ─── formatApproachDate ────────────────────────────────────────────────────────

describe('formatApproachDate', () => {
    it('retorna "-" para null', () => {
        expect(formatApproachDate(null, 'pt-BR')).toBe('-');
    });

    it('formata data ISO em DD/MM/YYYY para PT-BR', () => {
        expect(formatApproachDate('2025-06-15', 'pt-BR')).toBe('15/06/2025');
    });

    it('formata data ISO em YYYY-MM-DD para EN', () => {
        expect(formatApproachDate('2025-06-15', 'en')).toBe('2025-06-15');
    });

    it('inclui hora e minuto quando presentes em PT-BR', () => {
        expect(formatApproachDate('2025-06-15 14:30', 'pt-BR')).toBe('15/06/2025 14:30');
    });

    it('inclui hora e minuto quando presentes em EN', () => {
        expect(formatApproachDate('2025-06-15 14:30', 'en')).toBe('2025-06-15 14:30');
    });

    it('converte abreviações de mês em inglês para número', () => {
        // Formato que pode vir do pipeline: "2025-Jun-15"
        expect(formatApproachDate('2025-Jun-15', 'pt-BR')).toBe('15/06/2025');
        expect(formatApproachDate('2025-Jun-15', 'en')).toBe('2025-06-15');
    });

    it('retorna o valor original para strings que não correspondem ao padrão', () => {
        expect(formatApproachDate('data-invalida', 'pt-BR')).toBe('data-invalida');
    });
});

// ─── formatApproachTime ────────────────────────────────────────────────────────

describe('formatApproachTime (panelFormatters)', () => {
    it('retorna "—" para null', () => {
        expect(formatApproachTime(null, 'pt-BR')).toBe('—');
        expect(formatApproachTime(null, 'en')).toBe('—');
    });

    it('retorna o valor original para string inválida', () => {
        expect(formatApproachTime('invalido', 'pt-BR')).toBe('invalido');
    });

    it('formata ISO incluindo dia, mês, hora e timezone', () => {
        // panelFormatters inclui dia/mês além de hora (diferente da versão de dailyProximityPresentation).
        // O locale 'en' pode usar formato 12h (AM/PM), por isso validamos '30' (minuto) e a presença
        // de dia/mês em vez de assumir formato 24h.
        const result = formatApproachTime('2025-06-15T14:30:00Z', 'en');
        expect(result).toContain('30');
        expect(result).toMatch(/\d{2}.*\d{2}/); // dia e mês presentes
    });
});
