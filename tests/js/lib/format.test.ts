import { describe, expect, it } from 'vitest';
import {
    LUNAR_DISTANCE_KM,
    compactKm,
    compactMeters,
    formatNumber,
    lunarDistanceFromKm,
    lunarDistanceLabel,
} from '@/lib/format';

// No ambiente Node não há localStorage: todas as funções caem em pt-BR.

// ─── LUNAR_DISTANCE_KM ────────────────────────────────────────────────────────

describe('LUNAR_DISTANCE_KM', () => {
    it('é 384 400 km', () => {
        expect(LUNAR_DISTANCE_KM).toBe(384400);
    });
});

// ─── lunarDistanceFromKm ──────────────────────────────────────────────────────

describe('lunarDistanceFromKm', () => {
    it('converte 1 distância lunar para 1', () => {
        expect(lunarDistanceFromKm(LUNAR_DISTANCE_KM)).toBeCloseTo(1, 9);
    });

    it('converte metade da distância lunar para 0.5', () => {
        expect(lunarDistanceFromKm(LUNAR_DISTANCE_KM / 2)).toBeCloseTo(0.5, 9);
    });

    it('retorna null para null', () => expect(lunarDistanceFromKm(null)).toBeNull());
    it('retorna null para undefined', () => expect(lunarDistanceFromKm(undefined)).toBeNull());
    it('retorna null para NaN', () => expect(lunarDistanceFromKm(NaN)).toBeNull());
});

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
    it('formata inteiro com 0 casas decimais usando separador de milhar pt-BR', () => {
        expect(formatNumber(1234567, 0)).toMatch(/1.234.567/);
    });

    it('retorna "Indisponível" para null', () => expect(formatNumber(null)).toBe('Indisponível'));
    it('retorna "Indisponível" para undefined', () => expect(formatNumber(undefined)).toBe('Indisponível'));
    it('retorna "Indisponível" para NaN', () => expect(formatNumber(NaN)).toBe('Indisponível'));
});

// ─── compactKm ────────────────────────────────────────────────────────────────

describe('compactKm', () => {
    it('inclui o sufixo km', () => {
        expect(compactKm(384400)).toContain('km');
    });

    it('formata zero sem erro', () => {
        expect(compactKm(0)).toContain('km');
    });

    it('retorna "Indisponível" para null', () => expect(compactKm(null)).toBe('Indisponível'));
    it('retorna "Indisponível" para undefined', () => expect(compactKm(undefined)).toBe('Indisponível'));
});

// ─── compactMeters ────────────────────────────────────────────────────────────

describe('compactMeters', () => {
    it('exibe em metros para valores abaixo de 1 000', () => {
        const result = compactMeters(500);
        expect(result).toContain('m');
        expect(result).not.toContain('km');
    });

    it('converte para km na fronteira de 1 000 m', () => {
        expect(compactMeters(1000)).toContain('km');
    });

    it('converte 1 500 m para um valor em km contendo "1"', () => {
        const result = compactMeters(1500);
        expect(result).toContain('km');
        expect(result).toContain('1');
    });

    it('retorna "Indisponível" para null', () => expect(compactMeters(null)).toBe('Indisponível'));
});

// ─── lunarDistanceLabel ───────────────────────────────────────────────────────

describe('lunarDistanceLabel', () => {
    it('inclui o multiplicador para 2 DL', () => {
        const result = lunarDistanceLabel(2);
        expect(result).toContain('2');
        expect(result).toContain('distância da Lua');
    });

    it('usa 1 casa decimal para valores < 10', () => {
        expect(lunarDistanceLabel(1.5)).toContain('1,5');
    });

    it('usa 0 casas decimais para valores >= 10', () => {
        const result = lunarDistanceLabel(15);
        expect(result).toContain('15');
        expect(result).not.toMatch(/15,\d/);
    });

    it('retorna "Sem distância lunar" para null', () => {
        expect(lunarDistanceLabel(null)).toBe('Sem distância lunar');
    });
});
