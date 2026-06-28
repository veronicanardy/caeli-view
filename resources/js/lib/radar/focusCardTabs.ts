/**
 * Decisão pura de QUAIS abas o card de foco mostra, por tipo de objeto.
 *
 * Responsabilidade: dado o tipo do objeto (asteroide, cometa, nave ou corpo celeste) e se há
 * História cadastrada, devolver a lista ordenada de abas. Não renderiza nada nem decide rótulo: o
 * UnifiedFocusCard mapeia cada chave para o título localizado. Centralizar isto aqui (módulo puro,
 * testável) evita a armadilha de uma nave herdar abas de asteroide que não fazem sentido para ela
 * (Aproximação e Perfil físico ficavam vazias). Cada tipo só lista o que tem o que dizer.
 */

export type FocusTab = 'summary' | 'physical' | 'approach' | 'mission' | 'history';

/** Tipo do objeto em foco, do ponto de vista das abas. 'body' cobre planeta/Sol/Lua. */
export type FocusObjectKind = 'asteroid' | 'comet' | 'spacecraft' | 'body';

/**
 * Abas do card por tipo. Princípio: só entra a aba que o objeto consegue preencher de forma honesta.
 *
 * - asteroide/cometa: Resumo, Perfil físico, Aproximação (evento de flyby ou fatos orbitais);
 * - nave: Resumo e Missão (operador, distância ao Sol, destino). Sem Aproximação (não há flyby da
 *   Terra) nem Perfil físico (nave não tem diâmetro/velocidade/magnitude do feed);
 * - corpo celeste: Resumo e Perfil físico (fatos curados), sem Aproximação.
 *
 * A aba História entra ao fim quando `hasHistory` (lore cadastrada). Para corpo celeste a História é
 * sempre cadastrada, então `hasHistory` deve vir true.
 */
export function tabsForFocusObject(kind: FocusObjectKind, hasHistory: boolean): FocusTab[] {
    const base: FocusTab[] =
        kind === 'spacecraft'
            ? ['summary', 'mission']
            : kind === 'body'
              ? ['summary', 'physical']
              : ['summary', 'physical', 'approach'];

    return hasHistory ? [...base, 'history'] : base;
}
