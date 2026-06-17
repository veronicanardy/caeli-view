/**
 * Modo LINEAR: régua única heliocêntrica linear em UA, com a aproximação resolvida por zoom de
 * câmera. É a ÚNICA régua do radar (a cara do CaeliView).
 *
 * A antiga régua log de bastidor (`?log`) foi desativada: a flag não liga mais nada. A função
 * permanece retornando sempre `true` enquanto os call sites condicionais são colapsados em etapas;
 * será removida junto com o último deles.
 */
export function linearModeEnabled(): boolean {
    return true;
}
