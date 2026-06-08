import { describe, expect, it } from 'vitest';
import { asteroidRenderableModelFor, REAL_ASTEROID_MODELS } from '@/Components/Radar/Bodies/Asteroid/asteroidModelRegistry';
import type { ClosestNowObject } from '@/types';

/**
 * `asteroidModelRegistry` seleciona o modelo GLB correto para cada asteroide.
 * A lógica de matching usa regex com word boundary e parsing de número de catálogo —
 * ambos com casos-limite não óbvios (falsos positivos de substring, parênteses).
 */

function makeObject(overrides: Partial<{
    name: string;
    displayName: string | null;
    rawName: string | null;
    properName: string | null;
    designation: string | null;
    provisionalDesignation: string | null;
    detailIdentifier: string | null;
    aliases: string[];
    permanentNumber: string | null;
    spkId: string | null;
}>): ClosestNowObject {
    return {
        approach: {
            id: 'test',
            name: overrides.name ?? 'Unknown',
            displayName: overrides.displayName ?? null,
            rawName: overrides.rawName ?? null,
            properName: overrides.properName ?? null,
            designation: overrides.designation ?? null,
            provisionalDesignation: overrides.provisionalDesignation ?? null,
            detailIdentifier: overrides.detailIdentifier ?? null,
            aliases: overrides.aliases ?? [],
            permanentNumber: overrides.permanentNumber ?? null,
            spkId: overrides.spkId ?? null,
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
            subtitle: null,
        },
        trajectory: null,
        currentDistanceKm: null,
        currentDistanceLD: null,
    } as unknown as ClosestNowObject;
}

// ─── matching por alias ───────────────────────────────────────────────────────

describe('matching por alias (fieldContainsWord)', () => {
    it('identifica Bennu pelo nome exato', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'Bennu' }));
        expect(result.asset.key).toBe('bennu');
    });

    it('identifica Bennu case-insensitive', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'BENNU' }));
        expect(result.asset.key).toBe('bennu');
    });

    it('não confunde "ceres" com "cerebral" (falso positivo de substring)', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'cerebral' }));
        expect(result.asset.key).toBe('generic');
    });

    it('identifica Ceres pelo nome exato', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'Ceres' }));
        expect(result.asset.key).toBe('ceres');
    });

    it('identifica Eros pelo nome exato', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'Eros' }));
        expect(result.asset.key).toBe('eros');
    });

    it('identifica Itokawa pelo nome exato', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'Itokawa' }));
        expect(result.asset.key).toBe('itokawa');
    });

    it('identifica Vesta pelo nome exato', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'Vesta' }));
        expect(result.asset.key).toBe('vesta');
    });

    it('identifica pelo alias "rq36" para Bennu', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'rq36' }));
        expect(result.asset.key).toBe('bennu');
    });

    it('identifica pelo campo displayName', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', displayName: 'Bennu' }));
        expect(result.asset.key).toBe('bennu');
    });

    it('identifica pelo campo aliases', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', aliases: ['vesta'] }));
        expect(result.asset.key).toBe('vesta');
    });

    it('retorna genérico para objeto sem correspondência', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: '2025 XY1' }));
        expect(result.asset.key).toBe('generic');
    });
});

// ─── matching por número de catálogo (fieldEqualsCatalogNumber) ───────────────

describe('matching por número de catálogo', () => {
    it('identifica Bennu pelo número 101955', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', permanentNumber: '101955' }));
        expect(result.asset.key).toBe('bennu');
    });

    it('identifica Ceres pelo número 1', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', permanentNumber: '1' }));
        expect(result.asset.key).toBe('ceres');
    });

    it('identifica Eros pelo número 433', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', spkId: '433' }));
        expect(result.asset.key).toBe('eros');
    });

    it('aceita número em formato (NNN) com parênteses', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', permanentNumber: '(4)' }));
        expect(result.asset.key).toBe('vesta');
    });

    it('não confunde número parcial: "1" não combina com "101955"', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', permanentNumber: '1' }));
        expect(result.asset.key).toBe('ceres'); // 1 é Ceres, não Bennu
        expect(result.asset.key).not.toBe('bennu');
    });

    it('retorna genérico para número desconhecido', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown', permanentNumber: '999999' }));
        expect(result.asset.key).toBe('generic');
    });
});

// ─── prioridade alias > número ────────────────────────────────────────────────

describe('prioridade de matching', () => {
    it('alias é verificado antes do número dentro do mesmo asset', () => {
        // Para cada asset, o algoritmo testa aliases ANTES dos números de catálogo.
        // Bennu tem alias "rq36" e número "101955". Se um objeto tem name "rq36" (alias)
        // e um permanentNumber inválido, o alias deve ganhar sem precisar do número.
        const result = asteroidRenderableModelFor(makeObject({
            name: 'rq36',
            permanentNumber: '999999', // número desconhecido — só alias deve vencer
        }));
        expect(result.asset.key).toBe('bennu');
    });
});

// ─── estrutura do retorno ─────────────────────────────────────────────────────

describe('estrutura de AsteroidRenderableModel', () => {
    it('sempre retorna kind "real"', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown' }));
        expect(result.kind).toBe('real');
    });

    it('o asset genérico tem url definida', () => {
        const result = asteroidRenderableModelFor(makeObject({ name: 'unknown' }));
        expect(result.asset.url).toBeTruthy();
    });

    it('REAL_ASTEROID_MODELS tem exatamente os 5 asteroides conhecidos', () => {
        const keys = REAL_ASTEROID_MODELS.map((a) => a.key);
        expect(keys).toContain('bennu');
        expect(keys).toContain('ceres');
        expect(keys).toContain('eros');
        expect(keys).toContain('itokawa');
        expect(keys).toContain('vesta');
        expect(keys).toHaveLength(5);
    });
});
