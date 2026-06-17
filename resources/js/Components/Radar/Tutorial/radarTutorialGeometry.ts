/**
 * Geometria pura do tutorial: posicionamento de tooltip e spotlight.
 *
 * Responsabilidade: calcular posições a partir de retângulos planos, sem React
 * e sem DOM, para que todo o posicionamento seja testável em Node. Quem mede
 * elementos reais (getBoundingClientRect) é o overlay; aqui só entram números.
 */

import type { TutorialSide } from './radarTutorialSteps';

export type TutorialRect = { left: number; top: number; width: number; height: number };

export type TooltipPlacement = {
    left: number;
    top: number;
    /** Tooltip posicionado dentro do alvo (alvos gigantes, como a cena inteira). */
    placedInside: boolean;
};

/** Margem mínima entre o tooltip e as bordas da viewport. */
const VIEWPORT_PADDING = 10;
/** Distância entre o tooltip e o alvo destacado. */
const TARGET_GAP = 14;
/** Fração da viewport a partir da qual o alvo é tratado como "gigante" e o tooltip entra nele. */
const INSIDE_AREA_RATIO = 0.5;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Expande um retângulo em `pad` por lado, limitado à viewport. */
export function inflateRect(rect: TutorialRect, pad: number, viewportWidth: number, viewportHeight: number): TutorialRect {
    const left = Math.max(0, rect.left - pad);
    const top = Math.max(0, rect.top - pad);
    const right = Math.min(viewportWidth, rect.left + rect.width + pad);
    const bottom = Math.min(viewportHeight, rect.top + rect.height + pad);
    return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** Compara retângulos com tolerância de 1px para evitar re-renders por ruído de layout. */
export function rectsAlmostEqual(a: TutorialRect | null, b: TutorialRect | null, epsilon = 1): boolean {
    if (a === null || b === null) return a === b;
    return Math.abs(a.left - b.left) < epsilon
        && Math.abs(a.top - b.top) < epsilon
        && Math.abs(a.width - b.width) < epsilon
        && Math.abs(a.height - b.height) < epsilon;
}

function oppositeSide(side: TutorialSide): TutorialSide {
    switch (side) {
        case 'top': return 'bottom';
        case 'bottom': return 'top';
        case 'left': return 'right';
        case 'right': return 'left';
    }
}

function positionFor(side: TutorialSide, target: TutorialRect, width: number, height: number): { left: number; top: number } {
    const centerX = target.left + target.width / 2 - width / 2;
    const centerY = target.top + target.height / 2 - height / 2;
    switch (side) {
        case 'bottom': return { left: centerX, top: target.top + target.height + TARGET_GAP };
        case 'top':    return { left: centerX, top: target.top - height - TARGET_GAP };
        case 'right':  return { left: target.left + target.width + TARGET_GAP, top: centerY };
        case 'left':   return { left: target.left - width - TARGET_GAP, top: centerY };
    }
}

function fitsViewport(pos: { left: number; top: number }, width: number, height: number, viewportWidth: number, viewportHeight: number): boolean {
    return pos.left >= VIEWPORT_PADDING
        && pos.top >= VIEWPORT_PADDING
        && pos.left + width <= viewportWidth - VIEWPORT_PADDING
        && pos.top + height <= viewportHeight - VIEWPORT_PADDING;
}

function clampedPlacement(pos: { left: number; top: number }, width: number, height: number, viewportWidth: number, viewportHeight: number, placedInside: boolean): TooltipPlacement {
    return {
        left: clamp(pos.left, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING),
        top: clamp(pos.top, VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING),
        placedInside,
    };
}

/**
 * Posiciona o tooltip em relação ao alvo destacado.
 *
 * Regras, na ordem:
 *  1. sem alvo: centralizado na viewport (passos de boas-vindas e final);
 *  2. alvo gigante (> 50% da viewport, ex.: a cena 3D): tooltip dentro do alvo,
 *     centralizado no topo, onde o olhar chega primeiro;
 *  3. tenta o lado preferido, o oposto e os demais, na primeira posição que
 *     cabe inteira na viewport;
 *  4. fallback: lado preferido com clamp para dentro da viewport.
 */
export function placeTooltip(
    target: TutorialRect | null,
    width: number,
    height: number,
    viewportWidth: number,
    viewportHeight: number,
    preferred: TutorialSide = 'bottom',
): TooltipPlacement {
    if (!target) {
        return {
            left: Math.max(VIEWPORT_PADDING, (viewportWidth - width) / 2),
            top: Math.max(VIEWPORT_PADDING, (viewportHeight - height) / 2),
            placedInside: false,
        };
    }

    const targetArea = target.width * target.height;
    if (targetArea > viewportWidth * viewportHeight * INSIDE_AREA_RATIO) {
        return clampedPlacement(
            {
                left: target.left + target.width / 2 - width / 2,
                top: target.top + 20,
            },
            width, height, viewportWidth, viewportHeight, true,
        );
    }

    const candidates: TutorialSide[] = [preferred, oppositeSide(preferred), 'bottom', 'top', 'right', 'left'];
    const tried = new Set<TutorialSide>();
    for (const side of candidates) {
        if (tried.has(side)) continue;
        tried.add(side);
        const pos = positionFor(side, target, width, height);
        if (fitsViewport(pos, width, height, viewportWidth, viewportHeight)) {
            return clampedPlacement(pos, width, height, viewportWidth, viewportHeight, false);
        }
    }

    return clampedPlacement(positionFor(preferred, target, width, height), width, height, viewportWidth, viewportHeight, false);
}
