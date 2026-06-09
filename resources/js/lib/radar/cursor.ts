/**
 * Responsabilidade: gerenciar o cursor global da cena 3D do radar de forma centralizada.
 * Múltiplos componentes podem sinalizar "pointer" simultaneamente; o cursor só é ativado no
 * primeiro pedido e desativado apenas quando o último componente liberar — evitando que o cursor
 * fique preso em "pointer" quando um componente for desmontado sem chamar cursorPointerLeave.
 */

let hoverCount = 0;

export function cursorPointerEnter(): void {
    hoverCount++;
    if (hoverCount === 1 && typeof document !== 'undefined') {
        document.body.style.cursor = 'pointer';
    }
}

export function cursorPointerLeave(): void {
    hoverCount = Math.max(0, hoverCount - 1);
    if (hoverCount === 0 && typeof document !== 'undefined') {
        document.body.style.cursor = '';
    }
}

/** Reseta o contador (útil ao desmontar a cena inteira). */
export function cursorReset(): void {
    hoverCount = 0;
    if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
    }
}
