import type { ObjectLimit, SelectionMode } from '@/types';
import type { PlanetId } from '../Scene/planetConfig';
import type { MobileSheetSection } from '../Panels/radarNavigationTypes';
import type { TutorialStep } from './radarTutorialSteps';

export type TutorialBodyTarget = 'earth' | 'moon';
export type TutorialReferenceTarget = TutorialBodyTarget | 'sun';

export type TutorialAction =
    | 'manual-next'
    | 'skip-tutorial'
    | 'scene-navigate'
    | 'select-object'
    | 'focus-body'
    | 'focus-sun'
    | 'focus-planet'
    | 'toggle-planets'
    | 'toggle-spacecraft'
    | 'open-object-panel'
    | 'close-object-panel'
    | 'collapse-object-panel'
    | 'expand-object-panel'
    | 'open-filter-panel'
    | 'close-filter-panel'
    | 'set-selection-mode'
    | 'set-object-limit'
    | 'card-tab'
    | 'close-card'
    | 'enter-orbit'
    | 'exit-orbit'
    | 'show-trajectory'
    | 'reset-view'
    | 'toggle-labels'
    | 'enter-fullscreen'
    | 'exit-fullscreen'
    | 'open-guide'
    | 'close-guide'
    | 'open-dossier'
    | 'refresh';

export type TutorialActionPayload = {
    body?: TutorialReferenceTarget;
    planetId?: PlanetId;
    objectId?: string;
    /** O objeto é o PRIMEIRO da lista. O passo de seleção só aceita a primeira rocha. */
    objectIsFirst?: boolean;
    mode?: SelectionMode;
    limit?: ObjectLimit;
    tab?: 'summary' | 'physical' | 'approach' | 'mission' | 'history';
};

type TutorialTab = NonNullable<TutorialActionPayload['tab']>;

export type TutorialPermission = {
    action: TutorialAction;
    body?: TutorialReferenceTarget | TutorialReferenceTarget[];
    mode?: SelectionMode | SelectionMode[];
    tab?: TutorialTab | TutorialTab[];
};

/**
 * Qual `TutorialAction` representa uma troca de sheet mobile (lista de objetos / filtros / fechar).
 *
 * Um único gesto da UI (`onMobileSheetChange`) corresponde a quatro ações distintas do tutorial,
 * conforme o destino e o sheet aberto agora: abrir objetos, abrir filtros, ou FECHAR o que estava
 * aberto (e fechar filtros é diferente de fechar objetos para o tutorial). Centralizar este mapa
 * aqui, puro e testável, evita que a árvore de ternários viva escondida no componente orquestrador.
 *
 * @param target       Sheet que o usuário está abrindo, ou `null` para fechar o atual.
 * @param current      Sheet aberto no momento (para saber QUAL fechar quando `target` é `null`).
 */
export function mobileSheetTransitionAction(
    target: MobileSheetSection | null,
    current: MobileSheetSection | null,
): TutorialAction {
    if (target === 'objects') return 'open-object-panel';
    if (target === 'filters') return 'open-filter-panel';
    return current === 'filters' ? 'close-filter-panel' : 'close-object-panel';
}

const finishOnly = permissions({ action: 'manual-next' });
const sceneOnly = permissions({ action: 'scene-navigate' });
const readOnly = permissions(
    { action: 'manual-next' },
    { action: 'scene-navigate' },
);

export const RADAR_TUTORIAL_STEP_PERMISSIONS: Record<string, TutorialPermission[]> = {
    welcome: finishOnly,
    scene: readOnly,
    'camera-keyboard': sceneOnly,
    'camera-zoom': sceneOnly,
    'camera-rotate': sceneOnly,
    'cheer-camera': readOnly,
    'filter-criterion': permissions(
        { action: 'open-filter-panel' },
        { action: 'set-selection-mode', mode: 'upcoming' },
    ),
    'filter-limit': permissions(
        { action: 'open-filter-panel' },
        { action: 'set-object-limit' },
    ),
    'filter-done': readOnly,
    'select-object': permissions(
        { action: 'open-object-panel' },
        { action: 'expand-object-panel' },
        { action: 'select-object' },
    ),
    'meet-rock': readOnly,
    'read-card': readOnly,
    'card-tabs-summary': readOnly,
    'card-tabs-to-physical': permissions({ action: 'card-tab', tab: 'physical' }),
    'card-tabs-physical-done': readOnly,
    'card-tabs-to-approach': permissions({ action: 'card-tab', tab: 'approach' }),
    'card-tabs-approach-done': readOnly,
    'zoom-trajectory': permissions({ action: 'show-trajectory' }),
    'trajectory-explain': readOnly,
    'trajectory-return': permissions(
        { action: 'scene-navigate' },
        { action: 'select-object' },
    ),
    'orbit-view': permissions({ action: 'enter-orbit' }),
    'orbit-explain': readOnly,
    'orbit-return': permissions({ action: 'exit-orbit' }),
    'references-bodies': permissions(
        { action: 'open-object-panel' },
        { action: 'expand-object-panel' },
        { action: 'focus-body', body: 'moon' },
    ),
    'references-bodies-arrival': readOnly,
    'references-planets': permissions(
        { action: 'open-object-panel' },
        { action: 'expand-object-panel' },
        { action: 'toggle-planets' },
        { action: 'focus-planet' },
    ),
    'references-planets-arrival': readOnly,
    'reset-view': permissions({ action: 'reset-view' }),
    'scene-click-hint': readOnly,
    'toolbar-labels-off': permissions({ action: 'toggle-labels' }),
    'labels-view': readOnly,
    'toolbar-labels-on': permissions({ action: 'toggle-labels' }),
    'toolbar-fullscreen-on': permissions({ action: 'enter-fullscreen' }),
    'fullscreen-view': readOnly,
    'toolbar-fullscreen-off': permissions({ action: 'exit-fullscreen' }),
    'radar-guide': permissions({ action: 'open-guide' }),
    'guide-invitation': readOnly,
    finale: finishOnly,
};

/**
 * Seletores a clicar para "pular o passo fazendo a ação por baixo".
 *
 * O "Pular passo" não deve descartar a etapa sem efeito: isso quebra a conexão
 * imagem-texto (o usuário avança vários passos sem nunca ver a aba abrir, a
 * órbita aparecer, o objeto ser selecionado). Em vez disso, o "Pular passo"
 * EXECUTA a ação esperada e avança UM passo, então a imagem sempre acontece
 * junto do texto que a explica.
 *
 * Retorna a lista de seletores (mais específico primeiro) do elemento real a
 * acionar, ou `null` quando o passo não tem um clique determinístico que o
 * represente (gestos de câmera, troca de filtro): nesses casos o "Pular passo"
 * apenas avança um passo, sem efeito colateral.
 */
export function manualSkipClickSelectors(step: TutorialStep | null): string[] | null {
    if (!step) return null;

    if (step.advance.kind === 'selection') {
        // Seleciona o primeiro objeto disponível da lista (o próprio item dispara onSelect).
        return ['[data-tutorial="object-list"] button:not(:disabled)'];
    }

    if (step.advance.kind === 'click') {
        const requireSelector = step.advance.requireSelector;
        if (!requireSelector) return step.targets;
        // Restringe ao elemento exato que o passo espera (aba não selecionada,
        // botão de corpo, opção de planeta), procurando-o dentro de cada alvo e
        // também solto (alvos como reference-body/planet-option já são o seletor).
        return [
            ...step.targets.map((target) => `${target} ${requireSelector}`),
            requireSelector,
        ];
    }

    // Gestos (teclado, zoom, rotação) e filtros (critério, limite): sem clique
    // único que represente a ação. O "Pular passo" só avança um passo.
    return null;
}

export function allowedActionsForStep(step: TutorialStep | null): TutorialPermission[] {
    if (!step) return [];
    const explicit = RADAR_TUTORIAL_STEP_PERMISSIONS[step.id] ?? [];
    const manualNextAllowed = step.advance.kind === 'manual' && !explicit.some((permission) => permission.action === 'manual-next');
    const sceneNavigateAllowed = step.advance.kind === 'manual' && !explicit.some((permission) => permission.action === 'scene-navigate');
    if (!manualNextAllowed && !sceneNavigateAllowed) return explicit;

    return [
        ...explicit,
        ...(manualNextAllowed ? [{ action: 'manual-next' } as TutorialPermission] : []),
        ...(sceneNavigateAllowed ? [{ action: 'scene-navigate' } as TutorialPermission] : []),
    ];
}

export function isTutorialActionAllowed(
    step: TutorialStep | null,
    action: TutorialAction,
    payload: TutorialActionPayload = {},
): boolean {
    if (!step) return true;
    if (action === 'skip-tutorial') return true;
    if (action === 'manual-next' && step.advance.kind === 'manual') return true;
    if (action === 'scene-navigate' && step.advance.kind === 'manual') return true;

    // No passo de escolher a rocha, só a PRIMEIRA da lista é clicável: torna a
    // seleção determinística e deixa o passo seguinte (voltar pra perto) sempre
    // apontar para a mesma rocha. As demais rochas ficam bloqueadas.
    if (step.advance.kind === 'selection' && action === 'select-object' && !payload.objectIsFirst) {
        return false;
    }

    return allowedActionsForStep(step).some((permission) => permissionMatches(permission, action, payload));
}

export function doesTutorialActionCompleteStep(
    step: TutorialStep | null,
    action: TutorialAction,
    payload: TutorialActionPayload = {},
): boolean {
    if (!step || !isTutorialActionAllowed(step, action, payload)) return false;

    switch (step.advance.kind) {
        case 'manual':
            return action === 'manual-next';
        case 'criterion-change':
            return action === 'set-selection-mode';
        case 'limit-change':
            return action === 'set-object-limit';
        case 'selection':
        case 'reselect-object':
            // Re-selecionar a rocha (mesmo id) reaproxima a câmera. Não depende de
            // selectedId mudar: o avanço vem deste completeStep, não do observer.
            return action === 'select-object';
        case 'click':
            return completesClickStep(step.id, action, payload);
        case 'keyboard-pan':
        case 'scene-zoom':
        case 'scene-rotate':
            return false;
    }
}

function permissions(...items: TutorialPermission[]): TutorialPermission[] {
    return items;
}

function permissionMatches(
    permission: TutorialPermission,
    action: TutorialAction,
    payload: TutorialActionPayload,
): boolean {
    if (permission.action !== action) return false;
    if (permission.body && !matchesValue(permission.body, payload.body)) return false;
    if (permission.mode && !matchesValue(permission.mode, payload.mode)) return false;
    if (permission.tab && !matchesValue(permission.tab, payload.tab)) return false;
    return true;
}

function matchesValue<T extends string>(expected: T | T[], actual: T | undefined): boolean {
    if (!actual) return false;
    return Array.isArray(expected) ? expected.includes(actual) : expected === actual;
}

function completesClickStep(
    stepId: string,
    action: TutorialAction,
    payload: TutorialActionPayload,
): boolean {
    if (stepId === 'card-tabs-to-physical') return action === 'card-tab' && payload.tab === 'physical';
    if (stepId === 'card-tabs-to-approach') return action === 'card-tab' && payload.tab === 'approach';
    if (stepId === 'zoom-trajectory') return action === 'show-trajectory';
    if (stepId === 'orbit-view') return action === 'enter-orbit';
    if (stepId === 'orbit-return') return action === 'exit-orbit';
    if (stepId === 'references-bodies') return action === 'focus-body' && payload.body === 'moon';
    if (stepId === 'references-planets') return action === 'focus-planet';
    if (stepId === 'reset-view') return action === 'reset-view';
    if (stepId === 'toolbar-labels-off' || stepId === 'toolbar-labels-on') return action === 'toggle-labels';
    if (stepId === 'toolbar-fullscreen-on') return action === 'enter-fullscreen';
    if (stepId === 'toolbar-fullscreen-off') return action === 'exit-fullscreen';
    if (stepId === 'radar-guide') return action === 'open-guide';
    return false;
}
