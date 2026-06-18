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
            id: 'A', selectedId: 'A', showLabels: false, orbitLabelsOnly: false,
        })).toBe(false);

        expect(shouldShowLabelForObject({
            id: 'A', selectedId: null, showLabels: false, orbitLabelsOnly: false,
        })).toBe(false);
    });

    it('retorna true para objeto selecionado fora do modo órbita', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: true, orbitLabelsOnly: false,
        })).toBe(true);
    });

    it('retorna false para objeto selecionado no modo órbita (orbitLabelsOnly)', () => {
        // No modo órbita apenas a elipse precisa de label — a rocha some.
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: 'A', showLabels: true, orbitLabelsOnly: true,
        })).toBe(false);
    });

    it('monta a label de toda rocha: o amontoamento por zoom NAO e cortado aqui', () => {
        // O corte por densidade local fica no resolvedor (resolveRadarLabels), que precisa da
        // label montada para medir vizinhos. Aqui o portão é só o toggle global e o modo órbita.
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: false,
        })).toBe(true);
    });

    it('retorna false para objeto não selecionado no modo órbita', () => {
        expect(shouldShowLabelForObject({
            id: 'B', selectedId: 'A', showLabels: true, orbitLabelsOnly: true,
        })).toBe(false);
    });

    it('trata selectedId null como ausência de seleção', () => {
        expect(shouldShowLabelForObject({
            id: 'A', selectedId: null, showLabels: true, orbitLabelsOnly: false,
        })).toBe(true);
    });
});
