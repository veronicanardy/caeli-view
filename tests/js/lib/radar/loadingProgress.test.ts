import { describe, expect, it } from 'vitest';
import {
    advanceLoadingProgress,
    loadingStageLabel,
    resolveLoadingStage,
    STAGE_CEILING,
} from '@/lib/radar/loadingProgress';

// ─── advanceLoadingProgress ──────────────────────────────────────────────────
// A barra avança suave em direção ao teto da etapa, desacelerando perto dele, e
// nunca recua nem ultrapassa o teto. Só a etapa "done" pode chegar a 100%.

describe('advanceLoadingProgress', () => {
    it('nunca ultrapassa o teto da etapa', () => {
        // Mesmo com um delta enorme, fica preso no teto da etapa de busca.
        const next = advanceLoadingProgress(0, 'fetching', 1_000_000);
        expect(next).toBeLessThanOrEqual(STAGE_CEILING.fetching);
    });

    it('avança em direção ao teto sem alcançá-lo num passo normal', () => {
        const next = advanceLoadingProgress(0, 'fetching', 100);
        expect(next).toBeGreaterThan(0);
        expect(next).toBeLessThan(STAGE_CEILING.fetching);
    });

    it('desacelera: o mesmo delta cobre menos terreno quando já está mais perto do teto', () => {
        const cedo = advanceLoadingProgress(0, 'building', 100) - 0;
        const tarde = advanceLoadingProgress(STAGE_CEILING.building - 5, 'building', 100) - (STAGE_CEILING.building - 5);
        expect(tarde).toBeLessThan(cedo);
    });

    it('nunca recua: o resultado é sempre >= o valor atual', () => {
        const next = advanceLoadingProgress(50, 'fetching', 50);
        expect(next).toBeGreaterThanOrEqual(50);
    });

    it('gruda no teto quando a distância restante é desprezível', () => {
        const next = advanceLoadingProgress(STAGE_CEILING.fetching - 0.01, 'fetching', 16);
        expect(next).toBe(STAGE_CEILING.fetching);
    });

    it('a etapa "done" salta direto para 100%', () => {
        expect(advanceLoadingProgress(0, 'done', 0)).toBe(100);
        expect(advanceLoadingProgress(92, 'done', 16)).toBe(100);
    });

    it('clampa entrada acima do teto de volta para o teto', () => {
        const next = advanceLoadingProgress(200, 'fetching', 16);
        expect(next).toBe(STAGE_CEILING.fetching);
    });

    it('trata delta negativo como zero (sem avanço)', () => {
        const next = advanceLoadingProgress(10, 'fetching', -100);
        expect(next).toBe(10);
    });
});

// ─── resolveLoadingStage ─────────────────────────────────────────────────────

describe('resolveLoadingStage', () => {
    it('fetching tem prioridade sobre o estado da cena', () => {
        expect(resolveLoadingStage(true, false)).toBe('fetching');
        expect(resolveLoadingStage(true, true)).toBe('fetching');
    });

    it('sem busca e sem cena pronta é "building"', () => {
        expect(resolveLoadingStage(false, false)).toBe('building');
    });

    it('sem busca e com cena pronta é "done"', () => {
        expect(resolveLoadingStage(false, true)).toBe('done');
    });
});

// ─── loadingStageLabel ───────────────────────────────────────────────────────

describe('loadingStageLabel', () => {
    it('descreve cada etapa por extenso nos dois idiomas', () => {
        expect(loadingStageLabel('fetching', false)).toBe('Buscando os dados');
        expect(loadingStageLabel('building', false)).toBe('Montando a cena');
        expect(loadingStageLabel('done', false)).toBe('Pronto');
        expect(loadingStageLabel('fetching', true)).toBe('Fetching the data');
        expect(loadingStageLabel('building', true)).toBe('Building the scene');
        expect(loadingStageLabel('done', true)).toBe('Ready');
    });

    it('nunca devolve texto vazio para uma etapa válida', () => {
        for (const stage of ['fetching', 'building', 'done'] as const) {
            expect(loadingStageLabel(stage, false).length).toBeGreaterThan(0);
            expect(loadingStageLabel(stage, true).length).toBeGreaterThan(0);
        }
    });
});

// ─── Invariante dos tetos ────────────────────────────────────────────────────

describe('STAGE_CEILING', () => {
    it('é monotônico crescente e termina em 100', () => {
        expect(STAGE_CEILING.fetching).toBeLessThan(STAGE_CEILING.building);
        expect(STAGE_CEILING.building).toBeLessThan(STAGE_CEILING.done);
        expect(STAGE_CEILING.done).toBe(100);
    });
});
