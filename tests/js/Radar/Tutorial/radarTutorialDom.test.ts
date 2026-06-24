/**
 * Testes do guarda de clique sintético do tutorial.
 *
 * O tutorial só pode sintetizar cliques para restauração visual interna (ex.:
 * resetar a vista ao entrar num passo). Esses cliques NUNCA podem ser lidos
 * como ação do usuário pelas detecções de avanço. Estes testes travam o
 * contrato do par programmaticTutorialClick / isProgrammaticTutorialClick.
 */

import { describe, expect, it } from 'vitest';
import {
    isProgrammaticTutorialClick,
    programmaticTutorialClick,
} from '@/Components/Radar/Tutorial/radarTutorialDom';

/** Stub mínimo de elemento: registra o estado do guarda no instante do clique. */
function fakeElement(onClick: () => void): HTMLElement {
    return { click: onClick } as unknown as HTMLElement;
}

describe('programmaticTutorialClick', () => {
    it('fora de um clique sintético, o guarda está desligado', () => {
        expect(isProgrammaticTutorialClick()).toBe(false);
    });

    it('liga o guarda durante o despacho do clique e desliga depois', () => {
        let duranteClique = false;
        const el = fakeElement(() => {
            duranteClique = isProgrammaticTutorialClick();
        });

        programmaticTutorialClick(el);

        expect(duranteClique).toBe(true);
        expect(isProgrammaticTutorialClick()).toBe(false);
    });

    it('desliga o guarda mesmo se o clique sintético lançar erro', () => {
        const el = fakeElement(() => {
            throw new Error('boom');
        });

        expect(() => programmaticTutorialClick(el)).toThrow('boom');
        expect(isProgrammaticTutorialClick()).toBe(false);
    });

    it('suporta cliques sintéticos aninhados sem desligar cedo demais', () => {
        const interno = fakeElement(() => {
            expect(isProgrammaticTutorialClick()).toBe(true);
        });
        let aindaLigadoAposInterno = false;
        const externo = fakeElement(() => {
            programmaticTutorialClick(interno);
            // Ao voltar do aninhado, o externo ainda está em andamento.
            aindaLigadoAposInterno = isProgrammaticTutorialClick();
        });

        programmaticTutorialClick(externo);

        expect(aindaLigadoAposInterno).toBe(true);
        expect(isProgrammaticTutorialClick()).toBe(false);
    });
});
