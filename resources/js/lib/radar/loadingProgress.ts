/**
 * Cálculo puro do progresso visual da barra de carregamento do radar.
 *
 * Responsabilidade: traduzir as ETAPAS REAIS conhecidas pelo código (buscar dados,
 * montar a cena 3D, primeiro frame pronto) em uma porcentagem de 0 a 100 que avança
 * suave entre os marcos. A suavidade dentro de cada etapa é uma ESTIMATIVA baseada no
 * tempo médio que a etapa costuma levar, não uma medida do servidor (o radar carrega
 * por um único fetch sem progresso real). Por isso a barra nunca finge concluir: cada
 * etapa tem um teto e a interpolação desacelera assintoticamente em direção a ele,
 * só batendo 100% quando o marco final ("pronto") realmente acontece.
 *
 * Sem React e sem efeitos colaterais, para poder ser testado isoladamente.
 */

/**
 * Etapas do carregamento, em ordem.
 *
 * - `fetching`: requisição dos dados em andamento.
 * - `building`: dados chegaram, a cena 3D está montando os meshes.
 * - `done`: primeiro frame pronto. A barra completa e some.
 *
 * Trocas de critério com a cena já montada usam só `fetching` → `done`.
 */
export type LoadingStage = 'fetching' | 'building' | 'done';

/**
 * Teto de porcentagem de cada etapa: a barra avança em direção a este valor enquanto
 * a etapa dura, mas nunca o ultrapassa. Garante que a barra não "estoure" para 100%
 * antes do marco real. Os valores deixam folga proporcional ao peso típico de cada fase.
 */
export const STAGE_CEILING: Record<LoadingStage, number> = {
    fetching: 70,
    building: 92,
    done: 100,
};

/**
 * Tempo (ms) que cada etapa costuma levar para encostar perto do seu teto. Usado só
 * para calibrar a velocidade da interpolação assintótica — não é um prazo rígido.
 */
const STAGE_TIME_CONSTANT_MS: Record<LoadingStage, number> = {
    fetching: 1400,
    building: 700,
    done: 1,
};

/**
 * Avança a porcentagem em direção ao teto da etapa atual, com desaceleração
 * assintótica: quanto mais perto do teto, mais devagar. Nunca recua nem passa do teto.
 *
 * A cada quadro, a distância restante até o teto é reduzida por um fator exponencial
 * que depende do tempo decorrido desde o último quadro (`deltaMs`) e da constante de
 * tempo da etapa. Isso produz a sensação de um 0–100 contínuo mesmo sem progresso real.
 *
 * @param current  Porcentagem atual (0–100).
 * @param stage    Etapa atual.
 * @param deltaMs  Tempo desde a última atualização, em milissegundos.
 * @returns A próxima porcentagem (0–100), nunca menor que `current`.
 */
export function advanceLoadingProgress(current: number, stage: LoadingStage, deltaMs: number): number {
    if (stage === 'done') return STAGE_CEILING.done;

    const ceiling = STAGE_CEILING[stage];
    const clampedCurrent = Math.min(Math.max(current, 0), ceiling);
    const remaining = ceiling - clampedCurrent;
    if (remaining <= 0.05) return ceiling;

    const tau = STAGE_TIME_CONSTANT_MS[stage];
    // Fração da distância restante coberta neste quadro: 1 - e^(-Δt/τ).
    const closedFraction = 1 - Math.exp(-Math.max(deltaMs, 0) / tau);
    return clampedCurrent + remaining * closedFraction;
}

/**
 * Resolve a etapa atual a partir das flags de estado do radar.
 *
 * - Há dados sendo buscados → `fetching`.
 * - Busca terminou mas a cena ainda não pintou o primeiro frame → `building`.
 * - Cena pronta → `done`.
 *
 * @param fetching   Requisição de dados em andamento (`radarLoading`).
 * @param sceneReady Primeiro frame da cena 3D já pintado.
 */
export function resolveLoadingStage(fetching: boolean, sceneReady: boolean): LoadingStage {
    if (fetching) return 'fetching';
    if (!sceneReady) return 'building';
    return 'done';
}

/**
 * Texto curto que descreve a etapa atual para o usuário, em português ou inglês.
 *
 * Acompanha a barra para que a porcentagem tenha significado: o usuário vê QUAL etapa
 * real está acontecendo (buscar dados, montar a cena, pronto), não só um número subindo.
 * Sempre por extenso e claro, sem abreviações.
 *
 * @param stage Etapa atual.
 * @param en    `true` para inglês, `false` para português.
 */
export function loadingStageLabel(stage: LoadingStage, en: boolean): string {
    switch (stage) {
        case 'fetching':
            return en ? 'Fetching the data' : 'Buscando os dados';
        case 'building':
            return en ? 'Building the scene' : 'Montando a cena';
        case 'done':
            return en ? 'Ready' : 'Pronto';
    }
}
