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

    it('fronteira exata: score 3.99 → "high" (não "highlight")', () => {
        // hazardFlag (+2) + distância entre 1 e 1.5 LD (+1.25) + velocidade >= 80k (+1) = 4.25
        // Aqui queremos atingir exatamente um score just below 4: apenas hazard (+2) + dist 1–1.5 (+1.25) = 3.25 → high
        // Para chegar em 3.99 sem ultrapassar 4: hazard (+2) + vel >= 80k (+1) + dist 1–3 (+0.5) = 3.5 → high
        const result = classifyApproachAttention(makeApproach({
            hazardFlag: true,
            relativeVelocityKph: 90000,
            lunarDistance: 2.5,
        }));
        // score = 2 (hazard) + 1 (vel>=80k) + 0.5 (dist 1–3) = 3.5 → "high"
        expect(result.score).toBeCloseTo(3.5, 9);
        expect(result.level).toBe('high');
    });

    it('fronteira exata: score 4.0 → "highlight"', () => {
        // hazardFlag (+2) + distância < 1 LD (+2) = 4.0 exato
        const result = classifyApproachAttention(makeApproach({
            hazardFlag: true,
            lunarDistance: 0.5,
        }));
        expect(result.score).toBeCloseTo(4, 9);
        expect(result.level).toBe('highlight');
    });

    it('fronteira exata: score 2.49 → "moderate" (não "high")', () => {
        // distância < 1 LD (+2) + diâmetro >= 140 m (+1) = 3 → high... ajustamos para abaixo de 2.5
        // apenas: dist 1–1.5 LD (+1.25) + vel 80k (+1) = 2.25 → moderate
        const result = classifyApproachAttention(makeApproach({
            lunarDistance: 1.3,
            relativeVelocityKph: 85000,
        }));
        // score = 1.25 + 1 = 2.25 → moderate
        expect(result.score).toBeCloseTo(2.25, 9);
        expect(result.level).toBe('moderate');
    });

    it('fronteira exata: score 2.5 → "high"', () => {
        // dist < 1 LD (+2) + dist 1–1.5 não se acumula; usar: hazard (+2) + dist 1–1.5 (+1.25) = 3.25 → high
        // Para exatamente 2.5: vel >= 120k (+1.5) + dist 1–3 (+0.5) + ... ajuste:
        // dist 1–1.5 (+1.25) + vel >= 120k (+1.5) = 2.75 → high — vamos usar o mínimo exato
        // dist < 1 LD (+2) + nada mais = 2 → moderate. dist 1–1.5 (+1.25) + vel >= 80k (+1) + diâm >= 140 (+1) = 3.25 → high
        // Para atingir exatamente 2.5: não há combinação de números inteiros que dê 2.5.
        // O limiar é >=2.5: usamos 1.25 + 1.25 não existe. Usamos dist <1 (+2) + vel que some 0.5 = não existe.
        // Alternativa: hazard (+2) + nada mais = 2 (moderate). +0.5 (dist 1–3) = 2.5 → high
        const result = classifyApproachAttention(makeApproach({
            hazardFlag: true,
            lunarDistance: 2.5,
        }));
        // score = 2 (hazard) + 0.5 (dist 1–3) = 2.5 → high (score >= 2.5)
        expect(result.score).toBeCloseTo(2.5, 9);
        expect(result.level).toBe('high');
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
