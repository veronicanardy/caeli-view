/**
 * Sinalizador de exibição imediata da barra de progresso de rota.
 *
 * Responsabilidade: guardar a intenção de "mostrar a barra de rota na hora na
 * próxima navegação", sem o atraso anti-piscada. Um link de destino pesado
 * servido do cache (`prefetch`) marca a intenção no clique (`forceNextRouteProgress`)
 * e a barra a consome no próximo `start` (`consumeForcedRouteProgress`).
 *
 * É um módulo puro (sem React/DOM) para ser testável e reusável: a intenção é um
 * único boolean de uso único, que se zera ao ser lido para não vazar para a
 * navegação seguinte.
 */

let forced = false;

/** Marca que a próxima navegação deve mostrar a barra de rota imediatamente. */
export function forceNextRouteProgress(): void {
    forced = true;
}

/**
 * Lê e zera a intenção. Retorna `true` uma única vez após `forceNextRouteProgress`;
 * chamadas seguintes (sem nova marcação) retornam `false`.
 */
export function consumeForcedRouteProgress(): boolean {
    const was = forced;
    forced = false;
    return was;
}
