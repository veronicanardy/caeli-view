import { describe, expect, it } from 'vitest';
import { normalizeAsteroidIdentity, resolveApproachIdentity } from '@/lib/asteroidIdentity';
import type { UnifiedApproach } from '@/types';

/**
 * `asteroidIdentity` parseia nomes brutos de asteroides e resolve a identidade
 * a partir dos campos de um UnifiedApproach. Os testes cobrem os formatos de nome
 * mais comuns retornados pela API (numerado + nome, numerado + designação, só designação).
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeApproach(over: Partial<UnifiedApproach> = {}): UnifiedApproach {
    return {
        id: 'test',
        name: '433 Eros',
        rawName: '433 Eros',
        displayName: null,
        subtitle: null,
        permanentNumber: null,
        properName: null,
        provisionalDesignation: null,
        designation: null,
        aliases: [],
        objectType: 'asteroid',
        hazardFlag: false,
        approachDate: null,
        nominalDistanceKm: null,
        lunarDistance: null,
        absoluteMagnitude: null,
        diameterMeters: null,
        estimatedDiameterMinMeters: null,
        estimatedDiameterMaxMeters: null,
        relativeVelocityKph: null,
        ...over,
    } as UnifiedApproach;
}

// ─── normalizeAsteroidIdentity ────────────────────────────────────────────────

describe('normalizeAsteroidIdentity', () => {
    it('parseia asteroide numerado com nome próprio', () => {
        const result = normalizeAsteroidIdentity('433 Eros');
        expect(result.permanentNumber).toBe('433');
        expect(result.properName).toBe('Eros');
        expect(result.displayName).toBe('Eros');
    });

    it('parseia asteroide numerado com nome e designação provisória entre parênteses', () => {
        const result = normalizeAsteroidIdentity('99942 Apophis (2004 MN4)');
        expect(result.permanentNumber).toBe('99942');
        expect(result.properName).toBe('Apophis');
        expect(result.provisionalDesignation).toBe('2004 MN4');
        expect(result.displayName).toBe('Apophis');
    });

    it('parseia designação provisória isolada entre parênteses', () => {
        const result = normalizeAsteroidIdentity('(2024 YR4)');
        expect(result.provisionalDesignation).toBe('2024 YR4');
        expect(result.permanentNumber).toBeNull();
        expect(result.properName).toBeNull();
        expect(result.displayName).toBe('2024 YR4');
    });

    it('trata string vazia como "Objeto monitorado"', () => {
        expect(normalizeAsteroidIdentity('').displayName).toBe('Objeto monitorado');
    });

    it('rawName preserva o input após trim', () => {
        expect(normalizeAsteroidIdentity('  433 Eros  ').rawName).toBe('433 Eros');
    });

    it('aliases não contêm duplicatas', () => {
        const result = normalizeAsteroidIdentity('433 Eros');
        expect(new Set(result.aliases).size).toBe(result.aliases.length);
    });

    it('subtitle inclui o número permanente quando há nome próprio', () => {
        expect(normalizeAsteroidIdentity('433 Eros').subtitle).toContain('433');
    });
});

// ─── resolveApproachIdentity ──────────────────────────────────────────────────

describe('resolveApproachIdentity', () => {
    it('delega para normalizeAsteroidIdentity quando o approach não tem campos pré-processados', () => {
        const result = resolveApproachIdentity(makeApproach({ name: '433 Eros', rawName: '433 Eros' }));
        expect(result.permanentNumber).toBe('433');
        expect(result.properName).toBe('Eros');
    });

    it('usa os campos pré-processados do approach quando presentes', () => {
        const result = resolveApproachIdentity(makeApproach({
            displayName: 'Apophis',
            subtitle: 'Objeto numerado 99942',
            aliases: ['Apophis', '99942'],
            rawName: '99942 Apophis',
        }));
        expect(result.displayName).toBe('Apophis');
        expect(result.subtitle).toBe('Objeto numerado 99942');
    });

    it('aliases do resultado não contêm duplicatas', () => {
        const result = resolveApproachIdentity(makeApproach({
            displayName: 'Eros',
            aliases: ['433 Eros', 'Eros'],
            rawName: '433 Eros',
        }));
        expect(new Set(result.aliases).size).toBe(result.aliases.length);
    });
});
