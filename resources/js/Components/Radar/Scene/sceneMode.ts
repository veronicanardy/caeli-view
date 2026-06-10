/**
 * Derivação do modo visual ativo.
 *
 * Responsabilidade: reduzir seleção e flag de órbita a `radar` ou `orbit`,
 * validando apenas se há elementos orbitais utilizáveis para a cena.
 */

import type { ClosestNowObject } from '@/types';
import type { SceneMode } from '../Controls/Manual/manualTypes';

/**
 * Decide entre modo radar e modo órbita a partir da seleção e do modo pedido.
 */
export function deriveActiveMode(orbitMode: boolean, focusedObject: ClosestNowObject | null): SceneMode {
    if (!orbitMode || !focusedObject) return 'radar';
    const els = focusedObject.trajectory?.orbitalElements;
    if (!els || !Number.isFinite(els.tpJd) || els.tpJd === 0) return 'radar';
    return 'orbit';
}
