import type { ObjectLimit, SelectionMode } from '@/types';
import type { PlanetId } from '../Scene/planetConfig';
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
    mode?: SelectionMode;
    limit?: ObjectLimit;
    tab?: 'summary' | 'physical' | 'approach' | 'history';
};

type TutorialTab = NonNullable<TutorialActionPayload['tab']>;

export type TutorialPermission = {
    action: TutorialAction;
    body?: TutorialReferenceTarget | TutorialReferenceTarget[];
    mode?: SelectionMode | SelectionMode[];
    tab?: TutorialTab | TutorialTab[];
};

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
    'read-card': readOnly,
    'card-tabs-summary': readOnly,
    'card-tabs-to-physical': permissions({ action: 'card-tab', tab: 'physical' }),
    'card-tabs-physical-done': readOnly,
    'card-tabs-to-approach': permissions({ action: 'card-tab', tab: 'approach' }),
    'card-tabs-approach-done': readOnly,
    'zoom-trajectory': permissions({ action: 'show-trajectory' }),
    'trajectory-explain': readOnly,
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
