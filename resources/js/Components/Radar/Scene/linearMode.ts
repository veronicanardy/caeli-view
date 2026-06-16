/**
 * Flag do modo LINEAR (experimental): régua única heliocêntrica de escala real, com a aproximação
 * resolvida por zoom de câmera, em vez de duas réguas + compressão log geocêntrica.
 *
 * Responsabilidade: dizer se o modo está ligado, via `?linear` na URL. É um interruptor de
 * exploração, permite comparar lado a lado com o radar atual sem alterar código. Não persiste.
 */
export function linearModeEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('linear');
}
