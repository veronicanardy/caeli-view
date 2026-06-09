import { describe, expect, it } from 'vitest';
import type { UnifiedApproach } from '@/types';
import {
    attentionClass,
    averageDiameterMeters,
    classifyApproachAttention,
} from '@/lib/approachAttention';

/**
 * `approachAttention` classifica o destaque visual de uma aproximação com base em um score
 * composto. Os testes protegem os limiares numéricos — mudanças acidentais afetam o que
 * aparece em evidência na interface do radar.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeApproach(over: Partial<UnifiedApproach> = {}): UnifiedApproach {
    return {
        id: 'test',
        name: 'Test Asteroid',
        rawName: 'Test Asteroid',
        displayName: null,
        subtitle: null,
        permanentNumber: null,
        properName: null,
        provisionalDesignation: null,
        designation: null,
        aliases: [],
        objectType: 'asteroid',
        hazardFlag: false,
        approachDate: '2026-06-15',
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

// ─── averageDiameterMeters ────────────────────────────────────────────────────

describe('averageDiameterMeters', () => {
    it('retorna diameterMeters diretamente quando presente', () => {
        expect(averageDiameterMeters(makeApproach({ diameterMeters: 200 }))).toBe(200);
    });

    it('retorna a média entre min e max quando diameterMeters é null', () => {
        const approach = makeApproach({ diameterMeters: null, estimatedDiameterMinMeters: 100, estimatedDiameterMaxMeters: 300 });
        expect(averageDiameterMeters(approach)).toBe(200);
    });

    it('retorna o min quando apenas min está presente', () => {
        const approach = makeApproach({ diameterMeters: null, estimatedDiameterMinMeters: 150, estimatedDiameterMaxMeters: null });
        expect(averageDiameterMeters(approach)).toBe(150);
    });

    it('retorna o max quando apenas max está presente', () => {
        const approach = makeApproach({ diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: 250 });
        expect(averageDiameterMeters(approach)).toBe(250);
    });

    it('retorna null quando nenhum dado de diâmetro está disponível', () => {
        expect(averageDiameterMeters(makeApproach())).toBeNull();
    });
});

// ─── classifyApproachAttention ────────────────────────────────────────────────

describe('classifyApproachAttention', () => {
    it('retorna "low" (score 0) para objeto sem dados relevantes', () => {
        const result = classifyApproachAttention(makeApproach());
        expect(result.level).toBe('low');
        expect(result.score).toBe(0);
    });

    it('retorna "highlight" para hazardFlag + distância sub-lunar (score ≥ 4)', () => {
        // hazardFlag (+2) + distância < 1 LD (+2) = 4
        const result = classifyApproachAttention(makeApproach({ hazardFlag: true, lunarDistance: 0.5 }));
        expect(result.level).toBe('highlight');
        expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('retorna "high" para distância sub-lunar + velocidade alta (score ≥ 2.5)', () => {
        // distância < 1 LD (+2) + velocidade >= 80k (+1) = 3
        const result = classifyApproachAttention(makeApproach({ lunarDistance: 0.8, relativeVelocityKph: 90000 }));
        expect(result.level).toBe('high');
    });

    it('retorna "moderate" para distância entre 1 e 1.5 LD (score ≥ 1)', () => {
        // distância entre 1 e 1.5 LD (+1.25) = 1.25
        const result = classifyApproachAttention(makeApproach({ lunarDistance: 1.3 }));
        expect(result.level).toBe('moderate');
    });

    it('score nunca é negativo', () => {
        expect(classifyApproachAttention(makeApproach()).score).toBeGreaterThanOrEqual(0);
    });

    it('a reason menciona a NeoWs quando hazardFlag está ativo', () => {
        expect(classifyApproachAttention(makeApproach({ hazardFlag: true })).reason).toContain('NeoWs');
    });

    it('a reason menciona "1 km" quando o diâmetro estimado é ≥ 1000 m', () => {
        expect(classifyApproachAttention(makeApproach({ diameterMeters: 1500 })).reason).toContain('1 km');
    });
});

// ─── attentionClass ───────────────────────────────────────────────────────────

describe('attentionClass', () => {
    it('retorna uma string CSS não vazia para cada nível', () => {
        const levels = ['low', 'moderate', 'high', 'highlight'] as const;
        for (const level of levels) {
            const cls = attentionClass(level);
            expect(typeof cls).toBe('string');
            expect(cls.length).toBeGreaterThan(0);
        }
    });

    it('retorna classes CSS distintas para cada nível', () => {
        const levels = ['low', 'moderate', 'high', 'highlight'] as const;
        const classes = levels.map(attentionClass);
        expect(new Set(classes).size).toBe(4);
    });
});
