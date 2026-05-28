import { formatNumber } from '@/lib/format';
import { UnifiedApproach } from '@/types';

export type ApproachAttentionLevel = 'low' | 'moderate' | 'high' | 'highlight';

export type ApproachAttention = {
    level: ApproachAttentionLevel;
    label: string;
    reason: string;
    score: number;
};

const LEVELS: Record<ApproachAttentionLevel, { label: string; reason: string }> = {
    low: {
        label: 'Baixo',
        reason: 'Sem destaque especial nos dados disponíveis.',
    },
    moderate: {
        label: 'Moderado',
        reason: 'Recebe algum destaque por proximidade, velocidade ou tamanho estimado.',
    },
    high: {
        label: 'Alto',
        reason: 'Combina fatores que merecem mais atenção visual na comparação.',
    },
    highlight: {
        label: 'Destaque',
        reason: 'É um dos objetos mais chamativos do recorte visual, sem significar risco de impacto.',
    },
};

export function classifyApproachAttention(approach: UnifiedApproach): ApproachAttention {
    const lunarDistance = approach.lunarDistance;
    const velocityKph = approach.relativeVelocityKph ?? 0;
    const diameterMeters = averageDiameterMeters(approach);
    let score = 0;
    const reasons: string[] = [];

    if (approach.hazardFlag) {
        score += 2;
        reasons.push('sinalizado tecnicamente pela NeoWs');
    }

    if (lunarDistance !== null) {
        if (lunarDistance < 1) {
            score += 2;
            reasons.push('passa dentro da distância média da Lua');
        } else if (lunarDistance <= 1.5) {
            score += 1.25;
            reasons.push('passa perto da referência lunar');
        } else if (lunarDistance <= 3) {
            score += 0.5;
            reasons.push('permanece em uma faixa próxima em escala astronômica');
        }
    }

    if (velocityKph >= 120000) {
        score += 1.5;
        reasons.push(`velocidade muito alta: ${formatNumber(velocityKph, 0)} km/h`);
    } else if (velocityKph >= 80000) {
        score += 1;
        reasons.push(`velocidade alta: ${formatNumber(velocityKph, 0)} km/h`);
    }

    if (diameterMeters !== null) {
        if (diameterMeters >= 1000) {
            score += 1.5;
            reasons.push('tamanho estimado acima de 1 km');
        } else if (diameterMeters >= 140) {
            score += 1;
            reasons.push('tamanho estimado relevante para monitoramento');
        }
    }

    const level: ApproachAttentionLevel = score >= 4 ? 'highlight' : score >= 2.5 ? 'high' : score >= 1 ? 'moderate' : 'low';
    const fallback = LEVELS[level];

    return {
        level,
        label: fallback.label,
        reason: reasons.length ? `Destaque por ${reasons.join(', ')}. Não significa risco de impacto.` : fallback.reason,
        score,
    };
}

export function averageDiameterMeters(approach: UnifiedApproach): number | null {
    if (approach.diameterMeters !== null) {
        return approach.diameterMeters;
    }

    if (approach.estimatedDiameterMinMeters !== null && approach.estimatedDiameterMaxMeters !== null) {
        return (approach.estimatedDiameterMinMeters + approach.estimatedDiameterMaxMeters) / 2;
    }

    return approach.estimatedDiameterMinMeters ?? approach.estimatedDiameterMaxMeters;
}

export function attentionClass(level: ApproachAttentionLevel): string {
    return {
        low: 'border-signal-cyan bg-signal-cyan shadow-glow',
        moderate: 'border-signal-mint bg-signal-mint shadow-[0_0_22px_rgba(118,228,181,0.5)]',
        high: 'border-signal-violet bg-signal-violet shadow-[0_0_0_5px_rgba(167,139,250,0.16),0_0_28px_rgba(167,139,250,0.55)]',
        highlight: 'border-signal-coral bg-signal-coral shadow-[0_0_0_7px_rgba(255,111,97,0.18),0_0_34px_rgba(255,111,97,0.65)]',
    }[level];
}
