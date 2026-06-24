import { describe, expect, it } from 'vitest';
import { RADAR_TUTORIAL_STEPS } from '@/Components/Radar/Tutorial/radarTutorialSteps';
import {
    RADAR_TUTORIAL_STEP_PERMISSIONS,
    doesTutorialActionCompleteStep,
    isTutorialActionAllowed,
    manualSkipClickSelectors,
    mobileSheetTransitionAction,
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

        expect(isTutorialActionAllowed(step('filter-limit'), 'set-object-limit', { limit: 'all' })).toBe(true);
        expect(isTutorialActionAllowed(step('filter-limit'), 'set-selection-mode', { mode: 'nearest' })).toBe(false);
    });

    it('no passo de selecao, só a PRIMEIRA rocha da lista é aceita', () => {
        // A primeira rocha (objectIsFirst) é aceita e completa o passo.
        expect(isTutorialActionAllowed(step('select-object'), 'select-object', { objectId: 'neo-1', objectIsFirst: true })).toBe(true);
        expect(doesTutorialActionCompleteStep(step('select-object'), 'select-object', { objectId: 'neo-1', objectIsFirst: true })).toBe(true);
        // Qualquer outra rocha (não primeira) é bloqueada: a seleção é imposta na primeira.
        expect(isTutorialActionAllowed(step('select-object'), 'select-object', { objectId: 'neo-2', objectIsFirst: false })).toBe(false);
        expect(isTutorialActionAllowed(step('select-object'), 'select-object', { objectId: 'neo-2' })).toBe(false);
        // Fora do passo de seleção, selecionar não é permitido.
        expect(isTutorialActionAllowed(step('references-bodies'), 'select-object', { objectId: 'neo-1', objectIsFirst: true })).toBe(false);
    });

    it('os passos de restaurar a cena só completam pela ação do próprio botão', () => {
        const labelsOn = step('toolbar-labels-on');
        expect(doesTutorialActionCompleteStep(labelsOn, 'toggle-labels')).toBe(true);
        // Cliques fora de ordem (objeto, painel, corpo) nunca completam o passo.
        expect(doesTutorialActionCompleteStep(labelsOn, 'select-object', { objectId: 'neo-1' })).toBe(false);
        expect(doesTutorialActionCompleteStep(labelsOn, 'focus-body', { body: 'moon' })).toBe(false);
        expect(doesTutorialActionCompleteStep(labelsOn, 'open-object-panel')).toBe(false);

        const fullscreenOff = step('toolbar-fullscreen-off');
        expect(doesTutorialActionCompleteStep(fullscreenOff, 'exit-fullscreen')).toBe(true);
        expect(doesTutorialActionCompleteStep(fullscreenOff, 'enter-fullscreen')).toBe(false);
        expect(doesTutorialActionCompleteStep(fullscreenOff, 'toggle-labels')).toBe(false);
    });

    it('os passos de contemplação só avançam pelo botão do tooltip, nunca por um toggle herdado', () => {
        // A restauração da cena (religar nomes / sair da tela cheia) acontece no
        // passo SEGUINTE. Aqui, um toggle não pode completar a contemplação: ela
        // avança somente quando o usuário confirma no tooltip (manual-next).
        for (const id of ['labels-view', 'fullscreen-view']) {
            const contemplation = step(id);
            expect(doesTutorialActionCompleteStep(contemplation, 'manual-next'), id).toBe(true);
            expect(doesTutorialActionCompleteStep(contemplation, 'toggle-labels'), id).toBe(false);
            expect(doesTutorialActionCompleteStep(contemplation, 'enter-fullscreen'), id).toBe(false);
            expect(doesTutorialActionCompleteStep(contemplation, 'exit-fullscreen'), id).toBe(false);
        }
    });

    it('um clique em objeto errado ou botão fora da etapa nunca completa o passo atual', () => {
        // Lua pedida: clicar no Sol, num planeta ou numa rocha não avança.
        const moonStep = step('references-bodies');
        expect(doesTutorialActionCompleteStep(moonStep, 'focus-sun', { body: 'sun' })).toBe(false);
        expect(doesTutorialActionCompleteStep(moonStep, 'focus-planet', { planetId: 'mars' })).toBe(false);
        expect(doesTutorialActionCompleteStep(moonStep, 'select-object', { objectId: 'rock-1' })).toBe(false);

        // Maximizar/minimizar fora da etapa de tela cheia não completa nada.
        expect(doesTutorialActionCompleteStep(step('select-object'), 'enter-fullscreen')).toBe(false);
        expect(doesTutorialActionCompleteStep(step('select-object'), 'exit-fullscreen')).toBe(false);
        expect(doesTutorialActionCompleteStep(step('reset-view'), 'toggle-labels')).toBe(false);
    });

    it('voltar pra perto: completa ao re-selecionar a rocha, bloqueia o resto', () => {
        const ret = step('trajectory-return');
        // Clicar na rocha (select-object) completa, mesmo sendo a mesma já selecionada:
        // o avanço vem deste completeStep, não de selectedId mudar.
        expect(isTutorialActionAllowed(ret, 'select-object', { objectId: 'neo-1' })).toBe(true);
        expect(doesTutorialActionCompleteStep(ret, 'select-object', { objectId: 'neo-1' })).toBe(true);
        // Re-selecionar o MESMO id também completa (o flow não distingue, e a câmera reaproxima igual).
        expect(doesTutorialActionCompleteStep(ret, 'select-object', { objectId: 'same-rock' })).toBe(true);
        // Ações fora do passo não completam nem são permitidas.
        expect(isTutorialActionAllowed(ret, 'enter-orbit')).toBe(false);
        expect(isTutorialActionAllowed(ret, 'enter-fullscreen')).toBe(false);
        expect(doesTutorialActionCompleteStep(ret, 'enter-orbit')).toBe(false);
    });

    it('permite abrir planetas antes de escolher um planeta', () => {
        const planetsStep = step('references-planets');

        expect(isTutorialActionAllowed(planetsStep, 'toggle-planets')).toBe(true);
        expect(isTutorialActionAllowed(planetsStep, 'focus-planet', { planetId: 'mars' })).toBe(true);
        expect(doesTutorialActionCompleteStep(planetsStep, 'toggle-planets')).toBe(false);
        expect(doesTutorialActionCompleteStep(planetsStep, 'focus-planet', { planetId: 'mars' })).toBe(true);
    });
});

describe('manualSkipClickSelectors', () => {
    it('passo de troca de aba: clica a aba não selecionada por baixo', () => {
        const selectors = manualSkipClickSelectors(step('card-tabs-to-physical'));
        expect(selectors).not.toBeNull();
        // O seletor da aba não selecionada precisa estar presente para a imagem
        // (aba abrindo) acontecer junto do texto, em vez de só pular o passo.
        expect(selectors!.some((s) => s.includes('[role="tab"][aria-selected="false"]'))).toBe(true);
    });

    it('passo de referência da Lua: clica o botão de corpo por baixo', () => {
        const selectors = manualSkipClickSelectors(step('references-bodies'));
        expect(selectors!.some((s) => s.includes('[data-tutorial="reference-body"]'))).toBe(true);
    });

    it('passo de planetas: clica uma opção de planeta por baixo', () => {
        const selectors = manualSkipClickSelectors(step('references-planets'));
        expect(selectors!.some((s) => s.includes('[data-tutorial="planet-option"]'))).toBe(true);
    });

    it('passo de clique simples: clica o próprio alvo do passo', () => {
        expect(manualSkipClickSelectors(step('orbit-view'))).toEqual(['[data-tutorial="orbit-button"]']);
        expect(manualSkipClickSelectors(step('reset-view'))).toEqual(['[data-tutorial="reset-view"]']);
        expect(manualSkipClickSelectors(step('toolbar-labels-on'))).toEqual(['[data-tutorial="toggle-labels"]']);
    });

    it('passo de seleção: clica o primeiro objeto disponível da lista', () => {
        expect(manualSkipClickSelectors(step('select-object'))).toEqual([
            '[data-tutorial="object-list"] button:not(:disabled)',
        ]);
    });

    it('gestos e filtros não têm clique determinístico: só avançam um passo', () => {
        for (const id of ['camera-keyboard', 'camera-zoom', 'camera-rotate', 'filter-criterion', 'filter-limit']) {
            expect(manualSkipClickSelectors(step(id)), id).toBeNull();
        }
    });

    it('passo manual sem ação retorna nulo (não há o que pular fazendo)', () => {
        expect(manualSkipClickSelectors(step('welcome'))).toBeNull();
        expect(manualSkipClickSelectors(step('read-card'))).toBeNull();
        expect(manualSkipClickSelectors(null)).toBeNull();
    });
});

describe('mobileSheetTransitionAction', () => {
    it('abrir objetos e abrir filtros independem do sheet atual', () => {
        expect(mobileSheetTransitionAction('objects', null)).toBe('open-object-panel');
        expect(mobileSheetTransitionAction('objects', 'filters')).toBe('open-object-panel');
        expect(mobileSheetTransitionAction('filters', null)).toBe('open-filter-panel');
        expect(mobileSheetTransitionAction('filters', 'objects')).toBe('open-filter-panel');
    });

    it('fechar (target null) distingue qual sheet estava aberto', () => {
        expect(mobileSheetTransitionAction(null, 'filters')).toBe('close-filter-panel');
        expect(mobileSheetTransitionAction(null, 'objects')).toBe('close-object-panel');
    });

    it('fechar sem nada aberto cai em fechar objetos (padrão)', () => {
        expect(mobileSheetTransitionAction(null, null)).toBe('close-object-panel');
    });
});
