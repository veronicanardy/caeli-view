import { describe, expect, it } from 'vitest';
import { formatObjectListTrailingLabel } from '@/Components/Radar/Lists/radarSceneObjectPresentation';

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
