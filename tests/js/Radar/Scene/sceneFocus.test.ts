import { describe, expect, it } from 'vitest';
import { shouldShowLabelForObject } from '@/Components/Radar/Scene/sceneFocus';

/**
 * `sceneFocus` decide visibilidade de labels a partir de flags já resolvidas. Os
 * testes abaixo cobrem as combinações críticas de cada função, condições que, se
 * invertidas, mudam o comportamento visual silenciosamente.
 */

// ─── shouldShowLabelForObject ──────────────────────────────────────────────────

describe('shouldShowLabelForObject', () => {
    it('retorna false quando showLabels está desligado, independente do resto', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: false, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(false);

        expect(shouldShowLabelForObject({
            id: 'A', selectedId: null, showLabels: false, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(false);
    });

    it('retorna true para objeto selecionado fora do modo órbita', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(true);
    });

    it('retorna false para objeto selecionado no modo órbita (orbitLabelsOnly)', () => {
        // No modo órbita apenas a elipse precisa de label — a rocha some.
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: true, orbitLabelsOnly: true, hideAsteroidLabels: false,
        })).toBe(false);
    });

    it('retorna false para objeto não selecionado quando hideAsteroidLabels está ativo', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: true,
        })).toBe(false);
    });

    it('retorna false para objeto não selecionado no modo órbita', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: true, hideAsteroidLabels: false,
        })).toBe(false);
    });

    it('retorna true para objeto não selecionado com labels ativos e câmera próxima', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(true);
    });

    it('trata selectedId null como ausência de seleção', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: null, showLabels: true, orbitLabelsOnly: false, hideAsteroidLabels: false,
        })).toBe(true);
    });
});
