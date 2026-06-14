/**
 * Responsabilidade: testes das funções puras de copy do hero da Home
 * (heroSkyCopy.ts): nota de observação, visibilidade, lista de planetas,
 * data de aproximação e fase lunar.
 */

import { describe, expect, it } from 'vitest';
import {
    buildObservationNote,
    formatApproachDate,
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
        expect(note).toContain('muitas nuvens');
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
        expect(formatVisiblePlanetsLine([], false)).toBe('Nenhum planeta visível agora');
        expect(formatVisiblePlanetsLine([], true)).toBe('No planets visible right now');
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
    it('0-2%: Lua nova', () => {
        expect(moonPhaseLabel(1, false)).toBe('Lua nova (1%)');
    });

    it('3-48%: Lua crescente', () => {
        expect(moonPhaseLabel(9, false)).toBe('Lua crescente (9%)');
    });

    it('49-52%: Quarto de Lua', () => {
        expect(moonPhaseLabel(50, false)).toBe('Quarto de Lua (50%)');
    });

    it('53-97%: Lua gibosa', () => {
        expect(moonPhaseLabel(80, false)).toBe('Lua gibosa (80%)');
    });

    it('98-100%: Lua cheia', () => {
        expect(moonPhaseLabel(99.6, false)).toBe('Lua cheia (100%)');
    });

    it('arredonda o percentual exibido', () => {
        expect(moonPhaseLabel(8.6, true)).toBe('Crescent Moon (9%)');
    });
});
