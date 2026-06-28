import { describe, expect, it } from 'vitest';
import { tabsForFocusObject } from '@/lib/radar/focusCardTabs';

describe('tabsForFocusObject', () => {
    it('dá ao asteroide Resumo, Perfil físico e Aproximação', () => {
        expect(tabsForFocusObject('asteroid', false)).toEqual(['summary', 'physical', 'approach']);
    });

    it('dá ao cometa as mesmas três abas de aproximação', () => {
        expect(tabsForFocusObject('comet', false)).toEqual(['summary', 'physical', 'approach']);
    });

    it('NÃO dá à nave Aproximação nem Perfil físico, e sim Missão', () => {
        const tabs = tabsForFocusObject('spacecraft', false);
        expect(tabs).toEqual(['summary', 'mission']);
        expect(tabs).not.toContain('approach');
        expect(tabs).not.toContain('physical');
    });

    it('dá ao corpo celeste Resumo e Perfil físico, sem Aproximação', () => {
        const tabs = tabsForFocusObject('body', false);
        expect(tabs).toEqual(['summary', 'physical']);
        expect(tabs).not.toContain('approach');
    });

    it('acrescenta História ao fim quando há lore, para qualquer tipo', () => {
        expect(tabsForFocusObject('asteroid', true)).toEqual(['summary', 'physical', 'approach', 'history']);
        expect(tabsForFocusObject('spacecraft', true)).toEqual(['summary', 'mission', 'history']);
        expect(tabsForFocusObject('body', true)).toEqual(['summary', 'physical', 'history']);
    });
});
