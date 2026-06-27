/**
 * Registrador central do carregamento de texturas dos corpos celestes do radar.
 *
 * Responsabilidade: contar quantas texturas de corpos (Terra, Lua, Sol, planetas)
 * começaram a carregar e quantas já resolveram (sucesso OU falha), para que a barra
 * de carregamento só conclua quando a cena estiver de fato vestida, não apenas com o
 * primeiro frame pintado em cima de materiais de fallback.
 *
 * Por que existe: `useBodyTexture` carrega cada textura de forma imperativa e
 * não-bloqueante (cada corpo renderiza um fallback enquanto a imagem não chega). Sem
 * este registrador, o primeiro frame da cena dispara o "Pronto" antes das texturas
 * terminarem, e o usuário vê as texturas "estalando" depois que a barra já sumiu.
 *
 * A contagem aceita uma falha como "resolvida": se uma textura nunca chega, ela não
 * pode prender o usuário no carregamento para sempre. O critério final de conclusão
 * combina este registrador com um timeout de segurança no consumidor (`useFirstFrameReady`).
 *
 * Store mínimo com assinatura (padrão "external store"): a contagem é um efeito
 * colateral global por natureza (várias instâncias de corpos sem pai comum), mas a
 * REGRA de decisão (`allBodyTexturesSettled`) é pura e testável isoladamente.
 */

/** Estado imutável da contagem de texturas de corpos. */
export type BodyTextureProgress = {
    /** Quantas texturas começaram a carregar. */
    registered: number;
    /** Quantas já resolveram (sucesso ou falha). */
    settled: number;
};

/**
 * Decide, de forma pura, se todas as texturas de corpos conhecidas até agora já
 * resolveram. Pura para ser testável sem o store.
 *
 * Regra: se NENHUMA textura se registrou ainda, NÃO consideramos "pronto" (a cena
 * ainda nem montou os corpos que pedem textura); só consideramos resolvido quando há
 * ao menos uma registrada e todas as registradas resolveram.
 *
 * @param progress Contagem atual.
 * @returns `true` quando há texturas registradas e todas resolveram.
 */
export function allBodyTexturesSettled(progress: BodyTextureProgress): boolean {
    return progress.registered > 0 && progress.settled >= progress.registered;
}

let progress: BodyTextureProgress = { registered: 0, settled: 0 };
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) listener();
}

/**
 * Marca que uma textura de corpo começou a carregar. Devolve uma função para marcar
 * que ela resolveu (sucesso ou falha), idempotente: chamar mais de uma vez conta só
 * uma resolução.
 */
export function registerBodyTexture(): () => void {
    progress = { registered: progress.registered + 1, settled: progress.settled };
    emit();

    let done = false;
    return () => {
        if (done) return;
        done = true;
        progress = { registered: progress.registered, settled: progress.settled + 1 };
        emit();
    };
}

/** Snapshot atual da contagem, para `useSyncExternalStore`. */
export function getBodyTextureProgress(): BodyTextureProgress {
    return progress;
}

/** Assina mudanças na contagem. Devolve a função de cancelamento. */
export function subscribeBodyTextureProgress(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
