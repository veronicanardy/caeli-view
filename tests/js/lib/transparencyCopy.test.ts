/**
 * Responsabilidade: travar as garantias do copy de transparência (transparencyCopy.ts) usado no
 * rodapé global e no guia do radar. Estas asserções existem por motivo jurídico, não estético:
 * a não-afiliação com NASA/JPL/Caltech, a citação das fontes de dados reais e a isenção de
 * responsabilidade ("como estão", sem garantia) precisam permanecer no texto. Se uma fonte nova
 * passar a ser consumida, ela deve ser adicionada aqui e ao copy ao mesmo tempo.
 */

import { describe, expect, it } from 'vitest';
import { transparencyCopy } from '@/lib/transparencyCopy';

describe('transparencyCopy', () => {
    it.each(['pt-BR', 'en'] as const)('declara a não-afiliação com NASA, JPL e Caltech (%s)', (locale) => {
        const full = transparencyCopy(locale).paragraphs.join(' ');
        expect(full).toMatch(/NASA/);
        expect(full).toMatch(/JPL/);
        expect(full).toMatch(/Caltech/);
        expect(full).toMatch(locale === 'en' ? /not affiliated/i : /não é afiliado/i);
    });

    it.each(['pt-BR', 'en'] as const)('cita todas as fontes de dados consumidas (%s)', (locale) => {
        const full = transparencyCopy(locale).paragraphs.join(' ');
        for (const source of ['NeoWs', 'APOD', 'EPIC', 'CNEOS', 'Horizons']) {
            expect(full).toContain(source);
        }
    });

    it.each(['pt-BR', 'en'] as const)('inclui a isenção de responsabilidade (%s)', (locale) => {
        const full = transparencyCopy(locale).paragraphs.join(' ');
        expect(full).toMatch(locale === 'en' ? /as is/i : /como estão/i);
        expect(full).toMatch(locale === 'en' ? /not responsible/i : /não se responsabiliza/i);
    });
});
