import { describe, expect, it } from 'vitest';
import {
    formatObjectListTrailingLabel,
    tutorialLiveFactsFromTopObject,
} from '@/Components/Radar/Lists/radarSceneObjectPresentation';

/**
 * `radarSceneObjectPresentation` monta labels do item de lista da cena.
 * O parsing customizado de data (YYYY-MMM-DD HH:MM) é o ponto crítico —
 * um formato inválido cai silenciosamente para distância em km.
 */

// ─── formatObjectListTrailingLabel ────────────────────────────────────────────

describe('formatObjectListTrailingLabel', () => {
    it('usa distância em km no modo "closest" independente de approachDate', () => {
        const result = formatObjectListTrailingLabel('closest', '2025-Jun-15 14:30', 384400, 'en');
        // Modo closest deve usar distância, não data
        expect(result).toMatch(/km|DL|k|M/i);
    });

    it('usa distância em km quando approachDate é null no modo upcoming', () => {
        const result = formatObjectListTrailingLabel('upcoming', null, 500000, 'pt-BR');
        expect(result).not.toContain('Jun');
    });

    it('formata data no modo upcoming com approachDate em formato YYYY-MMM-DD HH:MM', () => {
        const result = formatObjectListTrailingLabel('upcoming', '2025-Jun-15 14:30', 500000, 'en');
        // Deve conter mês e horário formatados
        expect(result).toMatch(/Jun|15|14|30/);
    });

    it('cai para distância quando formato de data é inválido no modo upcoming', () => {
        const result = formatObjectListTrailingLabel('upcoming', 'formato-invalido', 384400, 'en');
        // Parsing falha → fallback para km
        expect(result).toMatch(/km|k|M|\d/);
    });

    it('formata data com formato ISO 2025-06-15T14:30:00 no modo upcoming', () => {
        const result = formatObjectListTrailingLabel('upcoming', '2025-06-15 14:30', 500000, 'en');
        expect(result).toMatch(/\d/);
    });
});

// ─── tutorialLiveFactsFromTopObject ──────────────────────────────────────────

describe('tutorialLiveFactsFromTopObject', () => {
    it('no critério "nearest", a métrica é a distância atual da Terra', () => {
        const facts = tutorialLiveFactsFromTopObject('2024 XY', 'nearest', null, 384400, 'pt-BR');
        expect(facts.rockName).toBe('2024 XY');
        expect(facts.rockMetric).toMatch(/da Terra agora$/);
        expect(facts.rockMetric).toMatch(/\d/);
    });

    it('no critério "upcoming", a métrica é a data de aproximação', () => {
        const facts = tutorialLiveFactsFromTopObject('Apophis', 'upcoming', '2029-Apr-13 21:46', null, 'en');
        expect(facts.rockName).toBe('Apophis');
        expect(facts.rockMetric).toMatch(/^arriving on /);
    });

    it('no critério "famous", não há métrica de proximidade (só o nome)', () => {
        const facts = tutorialLiveFactsFromTopObject('Bennu', 'famous', null, 999999, 'pt-BR');
        expect(facts.rockName).toBe('Bennu');
        expect(facts.rockMetric).toBeNull();
    });

    it('sem distância e sem data, a métrica fica nula (frase cai no neutro)', () => {
        const facts = tutorialLiveFactsFromTopObject('2024 ZZ', 'nearest', null, null, 'pt-BR');
        expect(facts.rockMetric).toBeNull();
    });
});
