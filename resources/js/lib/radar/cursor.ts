/**
 * Responsabilidade: gerenciar o cursor clicável da cena 3D do radar de forma centralizada.
 * Múltiplos componentes podem sinalizar "pointer" simultaneamente no mesmo elemento; o cursor só
 * é ativado no primeiro pedido e desativado quando o último componente liberar.
 */

type CursorTarget = Pick<HTMLElement, 'style'>;

const hoverCounts = new Map<CursorTarget, number>();

function defaultCursorTarget(): CursorTarget | null {
    return typeof document !== 'undefined' ? document.body : null;
}

export function cursorPointerEnter(target: CursorTarget | null = defaultCursorTarget()): void {
    if (!target) return;
    const nextCount = (hoverCounts.get(target) ?? 0) + 1;
    hoverCounts.set(target, nextCount);
    if (nextCount === 1) target.style.cursor = 'pointer';
}

export function cursorPointerLeave(target: CursorTarget | null = defaultCursorTarget()): void {
    if (!target) return;
    const nextCount = Math.max(0, (hoverCounts.get(target) ?? 0) - 1);
    if (nextCount === 0) {
        hoverCounts.delete(target);
        target.style.cursor = '';
        return;
    }
    hoverCounts.set(target, nextCount);
}

/** Reseta o contador (útil ao desmontar a cena inteira). */
export function cursorReset(): void {
    for (const target of hoverCounts.keys()) {
        target.style.cursor = '';
    }
    hoverCounts.clear();
}