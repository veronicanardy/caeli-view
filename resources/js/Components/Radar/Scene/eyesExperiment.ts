/**
 * Flag do EXPERIMENTO "modelo NASA Eyes": régua única heliocêntrica linear, com a aproximação
 * resolvida por zoom de câmera (em vez de duas réguas + compressão log geocêntrica).
 *
 * Responsabilidade: dizer se o experimento está ligado, via `?eyes` na URL. É um interruptor de
 * exploração — permite comparar lado a lado com o radar atual sem alterar código. Não persiste.
 */
export function eyesExperimentEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('eyes');
}
