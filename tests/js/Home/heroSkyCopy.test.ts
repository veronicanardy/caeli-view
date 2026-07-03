/**
 * Responsabilidade: testes das funções puras de copy do hero da Home
 * (heroSkyCopy.ts): nota de observação, visibilidade, lista de planetas,
 * data de aproximação e fase lunar.
 */

import { describe, expect, it } from 'vitest';
import {
    buildObservationNote,
    cleanFeedTitle,
    formatApproachDate,
    formatCloudCoverLine,
    formatObservingConditionLine,
    formatObservingVisibility,
    formatVisiblePlanetsLine,
    isGenericSummary,
    joinReadableList,
    moonPhaseLabel,
} from '@/Components/Home/heroSkyCopy';
import type { VisibleObject } from '@/services/visibleObjectsService';

function planet(namePt: string, nameEn: string): VisibleObject {
    return {
        id: namePt.toLowerCase(),
        namePt,
        nameEn,
        symbol: '?',
        altitude: 45,
        azimuth: 120,
        maxAltitude: 60,
        statusPt: 'visível',
        statusEn: 'visible',
        detailPt: '',
        detailEn: '',
        visible: true,
    };
}

// ─── isGenericSummary ─────────────────────────────────────────────────────────

describe('isGenericSummary', () => {
    it('detecta placeholder em português', () => {
        expect(isGenericSummary('Lendo condições do céu local…')).toBe(true);
    });

    it('detecta placeholder em inglês', () => {
        expect(isGenericSummary('Reading local sky conditions…')).toBe(true);
    });

    it('não marca resumo real como genérico', () => {
        expect(isGenericSummary('Céu limpo com boa estabilidade.')).toBe(false);
    });
});

// ─── buildObservationNote ─────────────────────────────────────────────────────

describe('buildObservationNote', () => {
    it('sem nuvens e resumo genérico: informa leitura em andamento', () => {
        const note = buildObservationNote('Lendo condições do céu local…', null, null, [], 50, false);
        expect(note).toBe('Lendo condições do céu local…');
    });

    it('céu encoberto (>=85%) com Lua iluminada cita a fase em brechas', () => {
        const note = buildObservationNote('', 90, null, [], 40, false);
        expect(note).toContain('encoberto');
        expect(note).toContain('Lua crescente');
    });

    it('céu encoberto com Lua nova desencoraja observação', () => {
        const note = buildObservationNote('', 90, null, [], 1, false);
        expect(note).toContain('pouco favoráveis');
    });

    it('parcialmente nublado cita planetas visíveis em brechas', () => {
        const note = buildObservationNote('', 60, null, [planet('Vênus', 'Venus'), planet('Marte', 'Mars')], 30, false);
        expect(note).toContain('Vênus e Marte');
    });

    it('céu limpo com seeing ótimo celebra as condições', () => {
        const note = buildObservationNote('', 10, 'Ótimo', [], 30, false);
        expect(note).toContain('excelente estabilidade');
    });

    it('céu limpo sem seeing retorna frase padrão de poucas nuvens', () => {
        const note = buildObservationNote('', 20, null, [], 30, false);
        expect(note).toContain('Poucas nuvens');
    });

    it('em inglês respeita o idioma', () => {
        const note = buildObservationNote('', 60, null, [planet('Vênus', 'Venus')], 30, true);
        expect(note).toContain('Venus');
        expect(note).toContain('Partly cloudy');
    });
});

// ─── formatObservingVisibility ────────────────────────────────────────────────

describe('formatObservingVisibility', () => {
    it('null: carregando', () => {
        expect(formatObservingVisibility(null, null, false)).toBe('carregando');
    });

    it('>=85: baixa', () => {
        expect(formatObservingVisibility(90, null, false)).toBe('baixa');
    });

    it('>=50: moderada', () => {
        expect(formatObservingVisibility(59, null, false)).toBe('moderada');
    });

    it('<50 com seeing instável: instável', () => {
        expect(formatObservingVisibility(10, 'Instável', false)).toBe('instável');
    });

    it('<50 sem seeing: boa', () => {
        expect(formatObservingVisibility(10, null, false)).toBe('boa');
    });

    it('em inglês: good', () => {
        expect(formatObservingVisibility(10, null, true)).toBe('good');
    });
});

// ─── formatVisiblePlanetsLine ─────────────────────────────────────────────────

describe('formatVisiblePlanetsLine', () => {
    it('lista vazia: nenhum planeta', () => {
        expect(formatVisiblePlanetsLine([], false)).toBe('Sem planetas brilhantes no horizonte');
        expect(formatVisiblePlanetsLine([], true)).toBe('No bright planets above the horizon');
    });

    it('um planeta usa singular', () => {
        expect(formatVisiblePlanetsLine(['Vênus'], false)).toBe('Visível agora: Vênus');
    });

    it('vários planetas usam plural e conjunção', () => {
        expect(formatVisiblePlanetsLine(['Vênus', 'Marte', 'Júpiter'], false))
            .toBe('Visíveis agora: Vênus, Marte e Júpiter');
    });

    it('em inglês usa "and"', () => {
        expect(formatVisiblePlanetsLine(['Venus', 'Mars'], true)).toBe('Visible now: Venus and Mars');
    });
});

// ─── joinReadableList ─────────────────────────────────────────────────────────

describe('joinReadableList', () => {
    it('vazio retorna string vazia', () => {
        expect(joinReadableList([], false)).toBe('');
    });

    it('um item retorna o próprio item', () => {
        expect(joinReadableList(['Marte'], false)).toBe('Marte');
    });

    it('dois itens com conjunção pt', () => {
        expect(joinReadableList(['Marte', 'Júpiter'], false)).toBe('Marte e Júpiter');
    });

    it('três itens com vírgula e conjunção en', () => {
        expect(joinReadableList(['Mars', 'Jupiter', 'Saturn'], true)).toBe('Mars, Jupiter and Saturn');
    });
});

// ─── formatApproachDate ───────────────────────────────────────────────────────

describe('formatApproachDate', () => {
    it('converte formato JPL "2026-Jun-01 03:26" para o locale pt', () => {
        const formatted = formatApproachDate('2026-Jun-01 03:26', false);
        expect(formatted).toContain('junho');
        expect(formatted).toContain('2026');
        expect(formatted).toContain('03:26');
    });

    it('converte formato JPL para o locale en', () => {
        const formatted = formatApproachDate('2026-Jun-01 03:26', true);
        expect(formatted).toContain('June');
    });

    it('aceita ISO direto', () => {
        const formatted = formatApproachDate('2026-12-25T10:00:00', false);
        expect(formatted).toContain('dezembro');
    });

    it('entrada irreconhecível volta intacta', () => {
        expect(formatApproachDate('data misteriosa', false)).toBe('data misteriosa');
    });
});

// ─── moonPhaseLabel ───────────────────────────────────────────────────────────

describe('moonPhaseLabel', () => {
    // moonPhaseLabel usa espaço não separável (U+00A0) antes do "(%)" de
    // propósito, para o percentual nunca quebrar sozinho em outra linha nos
    // cards. Normalizamos para espaço comum nos asserts de texto.
    const label = (illumination: number, en: boolean) => moonPhaseLabel(illumination, en).replace(/ /g, ' ');

    it('0-2%: Lua nova', () => {
        expect(label(1, false)).toBe('Lua nova (1%)');
    });

    it('3-48%: Lua crescente', () => {
        expect(label(9, false)).toBe('Lua crescente (9%)');
    });

    it('49-52%: Quarto de Lua', () => {
        expect(label(50, false)).toBe('Quarto de Lua (50%)');
    });

    it('53-97%: Lua gibosa', () => {
        expect(label(80, false)).toBe('Lua gibosa (80%)');
    });

    it('98-100%: Lua cheia', () => {
        expect(label(99.6, false)).toBe('Lua cheia (100%)');
    });

    it('usa espaço não separável antes do percentual', () => {
        expect(moonPhaseLabel(1, false)).toBe('Lua nova (1%)');
    });

    it('arredonda o percentual exibido', () => {
        expect(label(8.6, true)).toBe('Crescent Moon (9%)');
    });
});

describe('cleanFeedTitle', () => {
    it('troca hífen órfão de separador por ponto médio', () => {
        expect(cleanFeedTitle('Ariane 6 flight VA269 - full replay')).toBe('Ariane 6 flight VA269 · full replay');
    });

    it('troca travessão de separador por ponto médio', () => {
        expect(cleanFeedTitle('Webb — primeira luz')).toBe('Webb · primeira luz');
    });

    it('nunca deixa travessão no texto', () => {
        expect(cleanFeedTitle('A—B—C')).not.toMatch(/[–—]/);
    });

    it('preserva hífen interno de palavra (sem espaços)', () => {
        expect(cleanFeedTitle('full-replay ao vivo')).toBe('full-replay ao vivo');
    });

    it('normaliza espaços duplicados e apara as pontas', () => {
        expect(cleanFeedTitle('  Apollo   11   ')).toBe('Apollo 11');
    });
});

// ─── formatCloudCoverLine ─────────────────────────────────────────────────────

describe('formatCloudCoverLine', () => {
    it('sem leitura ainda: devolve null para o card omitir a linha', () => {
        expect(formatCloudCoverLine(null, false)).toBeNull();
        expect(formatCloudCoverLine(null, true)).toBeNull();
    });

    it('formata o percentual arredondado nos dois idiomas', () => {
        expect(formatCloudCoverLine(34.4, false)).toBe('34% de nuvens');
        expect(formatCloudCoverLine(34.5, true)).toBe('35% cloud cover');
    });

    it('aceita os extremos 0 e 100', () => {
        expect(formatCloudCoverLine(0, false)).toBe('0% de nuvens');
        expect(formatCloudCoverLine(100, true)).toBe('100% cloud cover');
    });
});

// ─── formatObservingConditionLine ─────────────────────────────────────────────

describe('formatObservingConditionLine', () => {
    it('deriva do rótulo de visibilidade em português', () => {
        expect(formatObservingConditionLine(10, null, false)).toBe('Visibilidade boa');
        expect(formatObservingConditionLine(60, null, false)).toBe('Visibilidade moderada');
        expect(formatObservingConditionLine(90, null, false)).toBe('Visibilidade baixa');
        expect(formatObservingConditionLine(null, null, false)).toBe('Visibilidade carregando');
    });

    it('deriva do rótulo de visibilidade em inglês', () => {
        expect(formatObservingConditionLine(10, null, true)).toBe('good visibility');
        expect(formatObservingConditionLine(90, null, true)).toBe('low visibility');
    });

    it('seeing instável rebaixa a visibilidade com céu limpo', () => {
        expect(formatObservingConditionLine(10, 'Instável', false)).toBe('Visibilidade instável');
    });
});
