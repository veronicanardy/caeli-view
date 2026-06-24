/**
 * Helpers DOM do tutorial do radar.
 *
 * Responsabilidade: resolver os alvos `data-tutorial` visíveis na tela e medir
 * seus retângulos. Alguns alvos existem duplicados no DOM (ex.: filtros têm
 * versão desktop e mobile, uma delas oculta por CSS), então a resolução sempre
 * filtra por visibilidade real, nunca pega o primeiro match cego.
 */

import type { TutorialRect } from './radarTutorialGeometry';

function isElementVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function isElementEnabled(el: HTMLElement): boolean {
    return !el.matches(':disabled') && el.getAttribute('aria-disabled') !== 'true';
}

/**
 * Primeiro elemento visível entre os seletores, na ordem de preferência.
 * Com `requireEnabled`, botões desabilitados não contam como alvo.
 */
export function findVisibleTarget(selectors: string[], requireEnabled = false): HTMLElement | null {
    for (const selector of selectors) {
        const nodes = document.querySelectorAll<HTMLElement>(selector);
        for (const el of nodes) {
            if (!isElementVisible(el)) continue;
            if (requireEnabled && !isElementEnabled(el)) continue;
            return el;
        }
    }
    return null;
}

/** Converte o boundingClientRect em retângulo plano da geometria do tutorial. */
export function rectFromElement(el: HTMLElement): TutorialRect {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/** True quando o usuário pediu menos animação no sistema operacional. */
export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True quando o foco está em um campo de digitação (não capturar atalhos nesse caso). */
export function isTypingTarget(target: EventTarget | null): boolean {
    const tag = (target as HTMLElement | null)?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Marca que um clique está sendo SINTETIZADO pelo próprio tutorial (restauração
 * visual de um passo de contemplação, ex.: religar as marcações ou sair da tela
 * cheia). Enquanto o flag está ligado, as detecções de avanço (listener DOM do
 * overlay e `completeStep` da página) devem ignorar o clique: ele não é uma ação
 * nova do usuário e não pode satisfazer a condição do passo seguinte.
 *
 * O clique sintético despacha o evento de forma SÍNCRONA, então o `onClick` do
 * React roda dentro da janela do flag. Por isso um booleano simples basta, sem
 * janela temporal: liga antes do `.click()`, desliga logo depois.
 */
let programmaticClickDepth = 0;

/** Dispara um clique sintético no elemento, marcado como originado pelo tutorial. */
export function programmaticTutorialClick(el: HTMLElement): void {
    programmaticClickDepth += 1;
    try {
        el.click();
    } finally {
        programmaticClickDepth -= 1;
    }
}

/** True enquanto um clique sintético do tutorial está em andamento. */
export function isProgrammaticTutorialClick(): boolean {
    return programmaticClickDepth > 0;
}
