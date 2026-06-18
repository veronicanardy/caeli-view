import { describe, expect, it } from 'vitest';
import { RADAR_TUTORIAL_STEPS } from '@/Components/Radar/Tutorial/radarTutorialSteps';
import {
    RADAR_TUTORIAL_STEP_PERMISSIONS,
    doesTutorialActionCompleteStep,
    isTutorialActionAllowed,
} from '@/Components/Radar/Tutorial/radarTutorialFlow';

function step(id: string) {
    const found = RADAR_TUTORIAL_STEPS.find((item) => item.id === id);
    if (!found) throw new Error(`Missing tutorial step: ${id}`);
    return found;
}

describe('radarTutorialFlow permissions', () => {
    it('declara permissoes para todos os passos', () => {
        for (const item of RADAR_TUTORIAL_STEPS) {
            expect(RADAR_TUTORIAL_STEP_PERMISSIONS[item.id]?.length, item.id).toBeGreaterThan(0);
        }
    });

    it('libera todas as acoes quando o tutorial esta inativo', () => {
        expect(isTutorialActionAllowed(null, 'select-object', { objectId: 'x' })).toBe(true);
        expect(isTutorialActionAllowed(null, 'exit-fullscreen')).toBe(true);
    });

    it('na etapa da Lua permite somente a Lua entre os corpos de referencia', () => {
        const moonStep = step('references-bodies');

        expect(isTutorialActionAllowed(moonStep, 'focus-body', { body: 'moon' })).toBe(true);
        expect(isTutorialActionAllowed(moonStep, 'focus-body', { body: 'earth' })).toBe(false);
        expect(isTutorialActionAllowed(moonStep, 'focus-sun', { body: 'sun' })).toBe(false);
        expect(isTutorialActionAllowed(moonStep, 'select-object', { objectId: 'asteroid-1' })).toBe(false);
        expect(isTutorialActionAllowed(moonStep, 'focus-planet', { planetId: 'mars' })).toBe(false);
    });

    it('completa a etapa da Lua somente com foco na Lua', () => {
        const moonStep = step('references-bodies');

        expect(doesTutorialActionCompleteStep(moonStep, 'focus-body', { body: 'moon' })).toBe(true);
        expect(doesTutorialActionCompleteStep(moonStep, 'focus-body', { body: 'earth' })).toBe(false);
        expect(doesTutorialActionCompleteStep(moonStep, 'open-object-panel')).toBe(false);
    });

    it('bloqueia maximizar e minimizar fora das etapas corretas', () => {
        expect(isTutorialActionAllowed(step('toolbar-fullscreen-on'), 'enter-fullscreen')).toBe(true);
        expect(isTutorialActionAllowed(step('toolbar-fullscreen-on'), 'exit-fullscreen')).toBe(false);
        expect(isTutorialActionAllowed(step('toolbar-fullscreen-off'), 'exit-fullscreen')).toBe(true);
        expect(isTutorialActionAllowed(step('toolbar-fullscreen-off'), 'enter-fullscreen')).toBe(false);
        expect(isTutorialActionAllowed(step('select-object'), 'enter-fullscreen')).toBe(false);
    });

    it('controla abas pelo alvo esperado da etapa', () => {
        expect(isTutorialActionAllowed(step('card-tabs-to-physical'), 'card-tab', { tab: 'physical' })).toBe(true);
        expect(doesTutorialActionCompleteStep(step('card-tabs-to-physical'), 'card-tab', { tab: 'physical' })).toBe(true);
        expect(isTutorialActionAllowed(step('card-tabs-to-physical'), 'card-tab', { tab: 'approach' })).toBe(false);

        expect(isTutorialActionAllowed(step('card-tabs-to-approach'), 'card-tab', { tab: 'approach' })).toBe(true);
        expect(isTutorialActionAllowed(step('card-tabs-to-approach'), 'card-tab', { tab: 'physical' })).toBe(false);
    });

    it('mantem filtros bloqueados fora dos passos de filtro', () => {
        expect(isTutorialActionAllowed(step('filter-criterion'), 'set-selection-mode', { mode: 'upcoming' })).toBe(true);
        expect(doesTutorialActionCompleteStep(step('filter-criterion'), 'set-selection-mode', { mode: 'upcoming' })).toBe(true);
        expect(isTutorialActionAllowed(step('filter-criterion'), 'set-selection-mode', { mode: 'famous' })).toBe(false);
        expect(isTutorialActionAllowed(step('filter-criterion'), 'set-selection-mode', { mode: 'nearest' })).toBe(false);
        expect(isTutorialActionAllowed(step('filter-criterion'), 'set-object-limit', { limit: 15 })).toBe(false);

        expect(isTutorialActionAllowed(step('filter-limit'), 'set-object-limit', { limit: 30 })).toBe(true);
        expect(isTutorialActionAllowed(step('filter-limit'), 'set-selection-mode', { mode: 'nearest' })).toBe(false);
    });

    it('permite selecao de asteroide somente no passo de selecao', () => {
        expect(isTutorialActionAllowed(step('select-object'), 'select-object', { objectId: 'neo-1' })).toBe(true);
        expect(doesTutorialActionCompleteStep(step('select-object'), 'select-object', { objectId: 'neo-1' })).toBe(true);
        expect(isTutorialActionAllowed(step('references-bodies'), 'select-object', { objectId: 'neo-1' })).toBe(false);
    });

    it('permite abrir planetas antes de escolher um planeta', () => {
        const planetsStep = step('references-planets');

        expect(isTutorialActionAllowed(planetsStep, 'toggle-planets')).toBe(true);
        expect(isTutorialActionAllowed(planetsStep, 'focus-planet', { planetId: 'mars' })).toBe(true);
        expect(doesTutorialActionCompleteStep(planetsStep, 'toggle-planets')).toBe(false);
        expect(doesTutorialActionCompleteStep(planetsStep, 'focus-planet', { planetId: 'mars' })).toBe(true);
    });
});
