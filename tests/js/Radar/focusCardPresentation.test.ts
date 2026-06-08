import { describe, expect, it } from 'vitest';
import {
    motionLabel,
    objectTypeEyebrow,
    riskAssessment,
    sizeComparison,
    trajectoryStatusBadge,
} from '@/Components/Radar/Panels/focusCardPresentation';
import type { UnifiedApproach } from '@/types';

/**
 * `focusCardPresentation` monta textos e badges do card de foco a partir de dados
 * já resolvidos. Os testes protegem os thresholds e a lógica de ramificação —
 * mudanças acidentais nesses valores afetam a comunicação de risco ao usuário.
 */

// ─── sizeComparison ────────────────────────────────────────────────────────────

describe('sizeComparison', () => {
    it('retorna "—" para null', () => {
        expect(sizeComparison(null, false)).toBe('—');
        expect(sizeComparison(null, true)).toBe('—');
    });

    it('retorna "—" para zero (valor falsy)', () => {
        expect(sizeComparison(0, false)).toBe('—');
    });

    it('retorna comparação de casa para objetos menores de 25 m', () => {
        expect(sizeComparison(10, false)).toBe('uma casa');
        expect(sizeComparison(10, true)).toBe('a house');
        expect(sizeComparison(24, false)).toBe('uma casa');
    });

    it('retorna quadra de basquete para 25–59 m', () => {
        expect(sizeComparison(25, false)).toBe('uma quadra de basquete');
        expect(sizeComparison(59, true)).toBe('a basketball court');
    });

    it('retorna campo de futebol para 60–119 m', () => {
        expect(sizeComparison(60, false)).toBe('um campo de futebol');
        expect(sizeComparison(119, true)).toBe('a football pitch');
    });

    it('retorna quarteirão para 120–249 m', () => {
        expect(sizeComparison(120, false)).toBe('um quarteirão');
        expect(sizeComparison(249, true)).toBe('a city block');
    });

    it('retorna navio de cruzeiro para 250–499 m', () => {
        expect(sizeComparison(250, false)).toBe('um navio de cruzeiro');
        expect(sizeComparison(499, true)).toBe('a cruise ship');
    });

    it('retorna pequena montanha para 500–999 m', () => {
        expect(sizeComparison(500, false)).toBe('uma pequena montanha');
        expect(sizeComparison(999, true)).toBe('a small mountain');
    });

    it('retorna maior que um quilômetro para 1000 m+', () => {
        expect(sizeComparison(1000, false)).toBe('maior que um quilômetro');
        expect(sizeComparison(5000, true)).toBe('larger than a kilometer');
    });
});

// ─── riskAssessment ────────────────────────────────────────────────────────────

function makeApproach(hazardFlag: boolean): UnifiedApproach {
    return { id: 'X', name: 'X', displayName: null, objectType: 'asteroid', hazardFlag, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null } as UnifiedApproach;
}

describe('riskAssessment', () => {
    it('retorna ícone de aviso e classe amber para objetos perigosos', () => {
        const result = riskAssessment(makeApproach(true), false);
        expect(result.icon).toBe('⚠️');
        expect(result.className).toContain('amber');
    });

    it('retorna ícone de check e classe emerald para objetos seguros', () => {
        const result = riskAssessment(makeApproach(false), false);
        expect(result.icon).toBe('✓');
        expect(result.className).toContain('emerald');
    });

    it('o título em PT-BR comunica monitoramento da NASA para objetos perigosos', () => {
        expect(riskAssessment(makeApproach(true), false).title).toBe('Monitorado pela NASA/JPL');
    });

    it('o título em EN comunica monitoramento da NASA para objetos perigosos', () => {
        expect(riskAssessment(makeApproach(true), true).title).toBe('Monitored by NASA/JPL');
    });

    it('o título em PT-BR comunica ausência de risco para objetos seguros', () => {
        expect(riskAssessment(makeApproach(false), false).title).toBe('Sem risco de impacto');
    });
});

// ─── motionLabel ───────────────────────────────────────────────────────────────

describe('motionLabel', () => {
    it('retorna null para estado undefined', () => {
        expect(motionLabel(undefined, false)).toBeNull();
    });

    it('retorna texto de aproximação em PT-BR e EN', () => {
        expect(motionLabel('approaching', false)?.text).toBe('Aproximando');
        expect(motionLabel('approaching', true)?.text).toBe('Approaching');
    });

    it('retorna texto de afastamento em PT-BR e EN', () => {
        expect(motionLabel('receding', false)?.text).toBe('Afastando');
        expect(motionLabel('receding', true)?.text).toBe('Receding');
    });

    it('retorna texto de máxima aproximação em PT-BR e EN', () => {
        expect(motionLabel('near_closest', false)?.text).toBe('Perto da máxima aproximação');
        expect(motionLabel('near_closest', true)?.text).toBe('Near closest approach');
    });

    it('cada estado tem uma className de cor diferente', () => {
        const approaching = motionLabel('approaching', false)?.className;
        const receding = motionLabel('receding', false)?.className;
        const near = motionLabel('near_closest', false)?.className;
        expect(new Set([approaching, receding, near]).size).toBe(3);
    });
});

// ─── objectTypeEyebrow ─────────────────────────────────────────────────────────

describe('objectTypeEyebrow', () => {
    it('retorna dotColor amarelo para cometas', () => {
        expect(objectTypeEyebrow('comet', false).dotColor).toBe('#f8c76b');
    });

    it('retorna dotColor ciano para asteroides', () => {
        expect(objectTypeEyebrow('asteroid', false).dotColor).toBe('#54d6d6');
    });

    it('o label de cometa menciona Cometa em PT-BR', () => {
        expect(objectTypeEyebrow('comet', false).label).toContain('Cometa');
    });

    it('o label de asteroide menciona Asteroid em EN', () => {
        expect(objectTypeEyebrow('asteroid', true).label).toContain('Asteroid');
    });
});

// ─── trajectoryStatusBadge ────────────────────────────────────────────────────

describe('trajectoryStatusBadge', () => {
    it('retorna null quando a trajetória está disponível', () => {
        expect(trajectoryStatusBadge({ status: 'available' } as any, false)).toBeNull();
    });

    it('retorna null quando a trajetória é null', () => {
        expect(trajectoryStatusBadge(null, false)).toBeNull();
    });

    it('retorna null quando a trajetória é undefined', () => {
        expect(trajectoryStatusBadge(undefined, false)).toBeNull();
    });

    it('retorna badge âmbar para Horizons temporariamente indisponível', () => {
        const badge = trajectoryStatusBadge({ status: 'fallback', horizonsFailureKind: 'horizons_transient' } as any, false);
        expect(badge).not.toBeNull();
        expect(badge!.icon).toBe('⚡');
        expect(badge!.className).toContain('amber');
    });

    it('retorna badge azul para efeméride ainda não disponível no Horizons', () => {
        const badge = trajectoryStatusBadge({ status: 'fallback', horizonsFailureKind: 'no_ephemeris' } as any, false);
        expect(badge).not.toBeNull();
        expect(badge!.className).toContain('sky');
    });

    it('retorna badge neutro para objeto sem identificador Horizons', () => {
        const badge = trajectoryStatusBadge({ status: 'fallback', horizonsFailureKind: 'no_orbital_data' } as any, false);
        expect(badge).not.toBeNull();
        expect(badge!.icon).toBe('—');
    });

    it('retorna badge de posição simbólica para fallback sem kind específico', () => {
        const badge = trajectoryStatusBadge({ status: 'fallback', horizonsFailureKind: null } as any, false);
        expect(badge).not.toBeNull();
        expect(badge!.icon).toBe('○');
    });
});
