/**
 * Gerenciamento centralizado do cursor global da cena 3D.
 * Permite que múltiplos componentes indiquem que o cursor deve ser "pointer" sem se sobreporm, e reseta corretamente quando nenhum deles mais requerer o cursor especial.
 * Útil para evitar bugs onde o cursor fica preso em "pointer" após um componente ser desmontado sem limpar seu estado.
 * O contador hoverCount rastreia quantos componentes atualmente requerem o cursor "pointer". O cursor só é ativado quando o primeiro componente solicita, e só é desativado quando o último componente remove sua solicitação.
 * A função cursorReset é útil para garantir que o estado seja limpo ao desmontar a cena inteira, evitando que o cursor fique preso em "pointer" se um componente for desmontado sem chamar cursorPointerLeave.
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
