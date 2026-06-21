import { describe, expect, it } from 'vitest';
import {
    albedoExplanation,
    motionLabel,
    objectTypeEyebrow,
    orbitClassContext,
    orbitClassLabel,
    riskAssessment,
    rotationExplanation,
    sizeComparison,
    smartSummary,
    trajectoryStatusBadge,
    velocityComparison,
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

    it('é SÓ a imagem nomeada, sem número quando bate num marco e SEM os conectores vagos', () => {
        // ~12 m → "um ônibus", sem número (a medida vive na linha do diâmetro) e SEM "como"/"quase".
        expect(sizeComparison(12, false)).toBe('um ônibus');
        expect(sizeComparison(12, false)).not.toMatch(/\d/);
        expect(sizeComparison(12, false)).not.toMatch(/quase|maior|menor|como/);
        // ~50 m → piscina olímpica; ~330 m → Torre Eiffel (sem artigo: rótulo do card).
        expect(sizeComparison(50, false)).toBe('uma piscina olímpica');
        expect(sizeComparison(330, false)).toBe('Torre Eiffel');
        // EN mantém o artigo (mais natural em inglês), mas sem "about/like".
        expect(sizeComparison(12, true)).toBe('a bus');
    });

    it('escolhe o marco pela proporção (escala log), não pela diferença absoluta', () => {
        // 20 m está perto de 24 (quadra) em proporção (0,83×) → o nome do marco.
        expect(sizeComparison(20, false)).toBe('uma quadra de tênis');
    });

    it('quando cai ENTRE marcos, usa MÚLTIPLO concreto, nunca "maior/quase" (vagos)', () => {
        // 34 m é ~1,4× a quadra de tênis (24 m): vira múltiplo concreto, não "maior que".
        const r = sizeComparison(34, false);
        expect(r).toMatch(/\d/); // tem número (é múltiplo)
        expect(r).not.toMatch(/quase|maior|menor/);
        expect(r).toBe('2 quadras de tênis');
        // EN também concreto.
        expect(sizeComparison(34, true)).toBe('2 tennis courts');
    });

    it('na faixa de km usa múltiplos do Cristo Redentor, sem repetir a medida', () => {
        // 67P (~4,3 km): comparação pura, sem "4,3 km" (o diâmetro já está na linha de cima).
        const pt = sizeComparison(4_300, false);
        expect(pt).toContain('Cristos Redentores');
        expect(pt).not.toContain('km');
        expect(pt).not.toMatch(/^como /); // sem o conector "como"
        expect(sizeComparison(4_300, true)).toContain('Christ the Redeemer');
    });

    it('usa lugares geográficos NOMEADOS para corpos grandes, nunca vago', () => {
        // Vesta ~525 km ≈ comprimento de Portugal; Ceres ~939 km ≈ comprimento da Itália.
        expect(sizeComparison(525_400, false)).toContain('Portugal');
        expect(sizeComparison(939_400, false)).toContain('Itália');
        // Nada de "país pequeno" genérico, nem a medida repetida.
        expect(sizeComparison(525_400, false)).not.toContain('país pequeno');
        expect(sizeComparison(525_400, false)).not.toContain('km');
        // 20 km → escala de cidade (Grande São Paulo).
        expect(sizeComparison(20_000, false)).toContain('São Paulo');
    });
});

// ─── explicações de jargão (H, albedo, rotação) ─────────────────────────────────

describe('albedoExplanation', () => {
    it('retorna null sem albedo', () => {
        expect(albedoExplanation(null, true)).toBeNull();
    });

    it('converte para % e descreve a superfície por faixa', () => {
        expect(albedoExplanation(0.04, false)).toContain('reflete 4%');
        expect(albedoExplanation(0.04, false)).toContain('escura');
        expect(albedoExplanation(0.6, false)).toContain('reflete 60%');
        expect(albedoExplanation(0.6, true)).toContain('reflects 60%');
    });
});

describe('rotationExplanation', () => {
    it('retorna null para período ausente ou não positivo', () => {
        expect(rotationExplanation(null, false)).toBeNull();
        expect(rotationExplanation(0, false)).toBeNull();
    });

    it('expressa o período como o "dia" do corpo, em horas e minutos', () => {
        expect(rotationExplanation(4.5, false)).toContain('4h30');
        expect(rotationExplanation(4.5, false)).toContain('um dia dura');
        expect(rotationExplanation(2, true)).toContain('2h');
        expect(rotationExplanation(2, true)).toContain('one day lasts');
    });
});

describe('velocityComparison', () => {
    it('retorna null sem velocidade válida', () => {
        expect(velocityComparison(null, false)).toBeNull();
        expect(velocityComparison(0, false)).toBeNull();
    });

    it('quando bate num marco, devolve só a imagem nomeada, sem conector vago', () => {
        // ~1.300 km/h ≈ velocidade do som (1.235), 1,05×.
        expect(velocityComparison(1_300, false)).toBe('velocidade do som');
        expect(velocityComparison(1_300, false)).not.toMatch(/quase|mais rápido|como/);
    });

    it('quando cai longe de um marco, usa MÚLTIPLO concreto do marco logo abaixo', () => {
        // 80.000 km/h ≈ ~2× a velocidade de escape (40.270): múltiplo concreto, sem "mais rápido".
        const pt = velocityComparison(80_000, false);
        expect(pt).toContain('escape');
        expect(pt).toMatch(/~\d+×/);
        expect(pt).not.toContain('mais rápido');
        expect(pt).not.toContain('km a cada segundo');
    });

    it('abaixo do marco mais lento ainda dá uma referência concreta', () => {
        // 60 km/h é mais devagar que o carro (100): cai no menor marco, sem inventar fração.
        expect(velocityComparison(60, false)).toBe('carro na estrada');
    });

    // ── Honestidade: NUNCA apresentar como "a Estação Espacial" algo bem mais rápido que ela ──
    it('um objeto bem mais rápido que a Estação Espacial NÃO aparece como sendo a Estação', () => {
        // 28.000 km/h ≈ ISS. 50.000 km/h (1,8× a ISS) deve cair em OUTRO marco (escape), nunca na ISS:
        // era a mentira do card. A janela do singular (≤1,4×) não alcança 1,8×.
        const fast = velocityComparison(50_000, false);
        expect(fast).not.toContain('Estação Espacial');
        expect(fast).toContain('escape');
    });

    it('a imagem singular só vale numa janela estreita; fora dela vira múltiplo concreto', () => {
        // 1,6× a velocidade do som (1.235) cai entre marcos (longe de som e de fuzil): vira múltiplo,
        // sem termo vago. (Não uso fuzil×1,6 porque agora cairia no novo marco de bala de canhão.)
        const r16 = velocityComparison(Math.round(1_235 * 1.6), false);
        expect(r16).not.toMatch(/quase|mais rápido/);
        expect(r16).toMatch(/\d/);
        // 1,1× ainda é o próprio marco (honesto, está perto).
        expect(velocityComparison(Math.round(3_700 * 1.1), false)).toBe('bala de fuzil');
    });
});

describe('smartSummary', () => {
    it('retorna null quando não há tamanho nem velocidade concretos', () => {
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: null, velocityKph: null }, false)).toBeNull();
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 0, velocityKph: 0 }, false)).toBeNull();
    });

    it('NÃO ecoa as comparações literais das outras abas (girafa, balas de canhão, etc.)', () => {
        // 8 m → linha "Tamanho comparável a" diria "uma girafa"; o resumo NÃO deve repetir isso.
        const pt = smartSummary({ objectType: 'asteroid', sizeMeters: 8, velocityKph: 15_000 }, false);
        expect(pt).not.toContain('girafa');
        expect(pt).not.toContain('bala'); // nem a comparação de velocidade
        // E não entrega números/unidades.
        expect(pt).not.toMatch(/\d/);
        expect(pt).not.toContain('km/h');
        expect(pt).not.toMatch(/\b\d+\s?m\b/);
    });

    it('classifica o porte em faixa qualitativa, não na comparação literal', () => {
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 8, velocityKph: null }, false)).toContain('minúscula');
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 80, velocityKph: null }, false)).toContain('pequena');
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 400, velocityKph: null }, false)).toContain('prédio');
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 5_000, velocityKph: null }, false)).toContain('montanha');
    });

    it('dá o caráter da passagem por tipo: rocha cruza a vizinhança, cometa volta ao redor do Sol', () => {
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 80, velocityKph: null }, false)).toContain('vizinhança da Terra');
        expect(smartSummary({ objectType: 'comet', sizeMeters: 4_300, velocityKph: null }, false)).toContain('ao redor do Sol');
    });

    it('reflete a velocidade em faixa qualitativa (rápido/altíssimo), sem a comparação literal', () => {
        const lento = smartSummary({ objectType: 'asteroid', sizeMeters: 80, velocityKph: 10_000 }, false);
        expect(lento).toContain('alta velocidade');
        const rapido = smartSummary({ objectType: 'asteroid', sizeMeters: 80, velocityKph: 40_000 }, false);
        expect(rapido).toContain('altíssima velocidade');
    });

    it('não menciona distância nem risco (já têm bloco próprio no Resumo)', () => {
        const pt = smartSummary({ objectType: 'asteroid', sizeMeters: 50, velocityKph: 28_000 }, false);
        expect(pt).not.toMatch(/distância|risco|perigos/i);
    });

    it('acrescenta a natureza do corpo e que a passagem é rotineira (conteúdo fora das abas)', () => {
        const rocha = smartSummary({ objectType: 'asteroid', sizeMeters: 12, velocityKph: 1_300 }, false);
        expect(rocha).toContain('Sistema Solar');
        expect(rocha).toContain('rotina');
        const cometa = smartSummary({ objectType: 'comet', sizeMeters: 4_300, velocityKph: null }, false);
        expect(cometa).toContain('gelo e poeira');
        expect(cometa).toContain('cauda');
    });

    it('não usa mais a muleta "as outras abas"', () => {
        const pt = smartSummary({ objectType: 'asteroid', sizeMeters: 12, velocityKph: 1_300 }, false);
        expect(pt).not.toContain('outras abas');
        const en = smartSummary({ objectType: 'asteroid', sizeMeters: 12, velocityKph: 1_300 }, true);
        expect(en).not.toContain('other tabs');
    });

    it('chama cometa de "cometa"/"comet" e asteroide de "rocha"/"rock"', () => {
        expect(smartSummary({ objectType: 'comet', sizeMeters: 4_300, velocityKph: null }, false)).toContain('cometa');
        expect(smartSummary({ objectType: 'comet', sizeMeters: 4_300, velocityKph: null }, true)).toContain('comet');
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 12, velocityKph: null }, false)).toContain('rocha');
        expect(smartSummary({ objectType: 'asteroid', sizeMeters: 12, velocityKph: null }, true)).toContain('rock');
    });

    it('monta só com tipo+velocidade quando falta o tamanho', () => {
        const soSpeed = smartSummary({ objectType: 'asteroid', sizeMeters: null, velocityKph: 15_000 }, false);
        expect(soSpeed).toContain('rocha');
        expect(soSpeed).toContain('velocidade');
        // Sem tamanho, não inventa porte.
        expect(soSpeed).not.toMatch(/minúscula|pequena|prédio|montanha|colossal/);
    });
});

describe('velocityComparison · marco de bala de canhão de tanque', () => {
    it('~6.100 km/h cai no marco da bala de canhão de tanque', () => {
        expect(velocityComparison(6_100, false)).toBe('bala de canhão de tanque');
        expect(velocityComparison(6_100, true)).toBe('a tank cannon shell');
    });

    it('não usa mais o marco vago de "meteoro entrando na atmosfera"', () => {
        for (const v of [6_000, 9_000, 11_000, 15_000]) {
            expect(velocityComparison(v, false)).not.toContain('meteoro');
            expect(velocityComparison(v, true)).not.toContain('meteor');
        }
    });
});

describe('orbitClassLabel', () => {
    it('dá o nome da família localizado (não a descrição em inglês do backend)', () => {
        expect(orbitClassLabel('APO', false)).toBe('Apollo');
        expect(orbitClassLabel('MBA', false)).toBe('Cinturão principal');
        expect(orbitClassLabel('MBA', true)).toBe('Main belt');
    });

    it('cai na própria sigla quando a classe é desconhecida, e null sem classe', () => {
        expect(orbitClassLabel('ZZZ', false)).toBe('ZZZ');
        expect(orbitClassLabel(null, false)).toBeNull();
    });
});

describe('orbitClassContext', () => {
    it('retorna null para classe ausente ou desconhecida', () => {
        expect(orbitClassContext(null, false)).toBeNull();
        expect(orbitClassContext('ZZZ', false)).toBeNull();
    });

    it('explica em PT o que a órbita da classe faz', () => {
        expect(orbitClassContext('APO', false)).toContain('cruza a nossa por fora');
        expect(orbitClassContext('ATE', true)).toContain('crosses ours from inside');
        expect(orbitClassContext('AMO', false)).toContain('não chega a cruzar');
    });
});

// ─── riskAssessment ────────────────────────────────────────────────────────────

function makeApproach(hazardFlag: boolean): UnifiedApproach {
    return { id: 'X', name: 'X', displayName: null, objectType: 'asteroid', hazardFlag, approachDate: null, nominalDistanceKm: null, lunarDistance: null, absoluteMagnitude: null, diameterMeters: null, estimatedDiameterMinMeters: null, estimatedDiameterMaxMeters: null, relativeVelocityKph: null, subtitle: null } as UnifiedApproach;
}

describe('riskAssessment', () => {
    it('retorna ícone de aviso e classe amber para objetos perigosos', () => {
        const result = riskAssessment(makeApproach(true), false);
        expect(result.icon).toBe('alert');
        expect(result.className).toContain('amber');
    });

    it('retorna ícone de check e classe emerald para objetos seguros', () => {
        const result = riskAssessment(makeApproach(false), false);
        expect(result.icon).toBe('check');
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

    it('estados neutros compartilham cor; máxima aproximação tem destaque próprio', () => {
        const approaching = motionLabel('approaching', false)?.className;
        const receding = motionLabel('receding', false)?.className;
        const near = motionLabel('near_closest', false)?.className;
        expect(approaching).toBe(receding);
        expect(near).not.toBe(approaching);
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
        expect(badge!.icon).toBe('zap');
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
        expect(badge!.icon).toBe('minus');
    });

    it('retorna badge de posição simbólica para fallback sem kind específico', () => {
        const badge = trajectoryStatusBadge({ status: 'fallback', horizonsFailureKind: null } as any, false);
        expect(badge).not.toBeNull();
        expect(badge!.icon).toBe('circle');
    });
});
