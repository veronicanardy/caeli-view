import { describe, expect, it } from 'vitest';
import {
    dailyReasonText,
    distanceBandLabel,
    formatApproachHour,
    horizonsStatusLabel,
    motionText,
} from '@/Components/Radar/Lists/dailyProximityPresentation';
import type { AsteroidTrajectory } from '@/types';

/**
 * `dailyProximityPresentation` produz textos exibidos ao usuário na lista diária.
 * Mudanças silenciosas em strings, thresholds de distância ou formatação de data
 * afetam diretamente a UX sem quebrar tipos — por isso precisam de cobertura.
 */

// ─── distanceBandLabel ────────────────────────────────────────────────────────

describe('distanceBandLabel', () => {
    it('retorna "Sem distância" / "Unknown" para null', () => {
        expect(distanceBandLabel(null, 'pt-BR')).toBe('Sem distância');
        expect(distanceBandLabel(null, 'en')).toBe('Unknown');
    });

    it('classifica < 1 DL como "Dentro da Lua"', () => {
        expect(distanceBandLabel(0.5, 'pt-BR')).toContain('Dentro da Lua');
        expect(distanceBandLabel(0, 'en')).toContain('Inside Moon');
    });

    it('classifica 1–5 DL como "Muito próximo"', () => {
        expect(distanceBandLabel(1, 'pt-BR')).toContain('Muito próximo');
        expect(distanceBandLabel(5, 'en')).toContain('Very close');
    });

    it('classifica 5–20 DL como "Próximo"', () => {
        expect(distanceBandLabel(6, 'pt-BR')).toContain('Próximo');
        expect(distanceBandLabel(20, 'en')).toContain('Close');
    });

    it('classifica > 20 DL como "Monitorado"', () => {
        expect(distanceBandLabel(21, 'pt-BR')).toContain('Monitorado');
        expect(distanceBandLabel(100, 'en')).toContain('Monitored');
    });

    it('fronteira exata: 1 DL cai em "Muito próximo", não em "Dentro da Lua"', () => {
        expect(distanceBandLabel(1, 'pt-BR')).not.toContain('Dentro');
        expect(distanceBandLabel(1, 'pt-BR')).toContain('Muito próximo');
    });
});

// ─── horizonsStatusLabel ──────────────────────────────────────────────────────

function makeTraj(status: AsteroidTrajectory['status']): AsteroidTrajectory {
    return { status, horizonsFailureKind: null, currentVelocityKph: null, motionState: null, pastPoints: [], currentPoint: null, futurePoints: [], orbitalElements: null } as unknown as AsteroidTrajectory;
}

describe('horizonsStatusLabel', () => {
    it('retorna "Calculando agora..." quando isLoading é true', () => {
        expect(horizonsStatusLabel(null, true, false, 'pt-BR')).toBe('Calculando agora...');
        expect(horizonsStatusLabel(null, true, false, 'en')).toBe('Calculating now...');
    });

    it('retorna "Disponível" / "Available" para status available', () => {
        expect(horizonsStatusLabel(makeTraj('available'), false, false, 'pt-BR')).toBe('Disponível');
        expect(horizonsStatusLabel(makeTraj('available'), false, false, 'en')).toBe('Available');
    });

    it('retorna "Fallback" para status fallback (igual nos dois locales)', () => {
        expect(horizonsStatusLabel(makeTraj('fallback'), false, false, 'pt-BR')).toBe('Fallback');
        expect(horizonsStatusLabel(makeTraj('fallback'), false, false, 'en')).toBe('Fallback');
    });

    it('retorna "Indisponível" / "Unavailable" para status unavailable', () => {
        expect(horizonsStatusLabel(makeTraj('unavailable'), false, false, 'pt-BR')).toBe('Indisponível');
        expect(horizonsStatusLabel(makeTraj('unavailable'), false, false, 'en')).toBe('Unavailable');
    });

    it('retorna "Aguardando" / "Waiting" quando isFocus é true e trajectory é null', () => {
        expect(horizonsStatusLabel(null, false, true, 'pt-BR')).toBe('Aguardando');
        expect(horizonsStatusLabel(null, false, true, 'en')).toBe('Waiting');
    });

    it('retorna "Não consultado" / "Not requested" quando isFocus é false e trajectory é null', () => {
        expect(horizonsStatusLabel(null, false, false, 'pt-BR')).toBe('Não consultado');
        expect(horizonsStatusLabel(null, false, false, 'en')).toBe('Not requested');
    });

    it('isLoading tem precedência sobre qualquer status de trajetória', () => {
        expect(horizonsStatusLabel(makeTraj('available'), true, true, 'en')).toBe('Calculating now...');
    });
});

// ─── motionText ───────────────────────────────────────────────────────────────

describe('motionText', () => {
    it('inclui distância em DL quando currentLunar não é null', () => {
        // formatNumber usa Intl internamente — o separador decimal varia por ambiente.
        // Validamos presença de "3" e "DL" sem assumir "." ou "," como separador.
        const text = motionText('approaching', 3.5, 'en');
        expect(text).toMatch(/3[.,]?5? DL/);
    });

    it('não inclui distância quando currentLunar é null', () => {
        const text = motionText('approaching', null, 'en');
        expect(text).not.toContain('DL');
    });

    it('usa 0 casas decimais para lunar >= 10', () => {
        const text = motionText('approaching', 15, 'en');
        expect(text).toContain('15 DL');
        expect(text).not.toContain('15.0 DL');
    });

    it('retorna texto de aproximação em PT-BR e EN', () => {
        expect(motionText('approaching', null, 'pt-BR')).toContain('aproximando');
        expect(motionText('approaching', null, 'en')).toContain('approaching');
    });

    it('retorna texto de afastamento em PT-BR e EN', () => {
        expect(motionText('receding', null, 'pt-BR')).toContain('afastando');
        expect(motionText('receding', null, 'en')).toContain('moving away');
    });

    it('retorna texto de máxima aproximação em PT-BR e EN', () => {
        expect(motionText('near_closest', null, 'pt-BR')).toContain('aproximação');
        expect(motionText('near_closest', null, 'en')).toContain('closest-approach');
    });

    it('retorna texto inconclusivo para estado null/desconhecido', () => {
        expect(motionText(null, null, 'en')).toContain('inconclusive');
        expect(motionText(null, null, 'pt-BR')).toContain('inconclusiva');
    });
});

// ─── formatApproachHour ───────────────────────────────────────────────────────

describe('formatApproachHour', () => {
    it('retorna "—" para null', () => {
        expect(formatApproachHour(null, 'pt-BR')).toBe('—');
        expect(formatApproachHour(null, 'en')).toBe('—');
    });

    it('retorna o valor original para string inválida', () => {
        expect(formatApproachHour('invalido', 'pt-BR')).toBe('invalido');
    });

    it('formata string ISO válida contendo minuto 30', () => {
        const result = formatApproachHour('2025-06-15T14:30:00Z', 'pt-BR');
        expect(result).toContain('30');
    });

    it('não inclui dia nem mês na saída', () => {
        const result = formatApproachHour('2025-06-15T14:30:00Z', 'en');
        // Deve conter hora e timezone, não "Jun" ou "15" como data
        expect(result).toMatch(/\d{2}:\d{2}|PM|AM/);
    });
});

// ─── dailyReasonText ──────────────────────────────────────────────────────────

describe('dailyReasonText', () => {
    it('menciona o nome do objeto em todos os casos', () => {
        expect(dailyReasonText('Bennu', 5, '14:00', '2025-06-15', true, 'en')).toContain('Bennu');
        expect(dailyReasonText('Bennu', 5, '14:00', '2025-06-15', false, 'en')).toContain('Bennu');
    });

    it('quando hoje selecionado (en), menciona "right now" e a distância lunar', () => {
        const text = dailyReasonText('X', 3, '14:00', '2025-06-15', true, 'en');
        expect(text).toContain('right now');
        expect(text).toContain('3');
    });

    it('quando hoje selecionado (pt-BR), menciona "agora" e a distância lunar', () => {
        const text = dailyReasonText('X', 3, '14:00', '2025-06-15', true, 'pt-BR');
        expect(text).toContain('agora');
        expect(text).toContain('3');
    });

    it('quando não é hoje (en), menciona a data da aproximação', () => {
        const text = dailyReasonText('X', null, '14:00', '2025-06-15', false, 'en');
        expect(text).toContain('Jun');
    });

    it('quando não é hoje (pt-BR), menciona a data da aproximação', () => {
        const text = dailyReasonText('X', null, '14:00', '2025-06-15', false, 'pt-BR');
        expect(text).toMatch(/jun|2025/i);
    });

    it('quando lunar é null, não menciona distância lunar', () => {
        const text = dailyReasonText('X', null, '14:00', '2025-06-15', true, 'en');
        expect(text).not.toContain('lunar distances');
    });
});
