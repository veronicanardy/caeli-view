/**
 * Modo LINEAR: régua única heliocêntrica de escala real, com a aproximação resolvida por zoom de
 * câmera. É a experiência PADRÃO do radar (a cara do CaeliView).
 *
 * Responsabilidade: dizer se o modo linear está ligado. Liga por padrão; só desliga quando a URL
 * pede explicitamente a régua log de bastidor via `?log`. A régua log fica acessível apenas por essa
 * flag, como rede de segurança/comparação, sem aparecer pro visitante. Não persiste.
 */
export function linearModeEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    return !new URLSearchParams(window.location.search).has('log');
}
