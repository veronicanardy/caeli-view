/**
 * Responsabilidade: constantes físicas fundamentais compartilhadas entre módulos de cálculo,
 * formatação e renderização de cena. Centraliza valores que, se divergentes entre arquivos,
 * produziriam discrepâncias silenciosas nos dados exibidos ao usuário.
 */

/** Distância média Terra-Lua em km. Referência didática usada como unidade de escala no radar. */
export const LUNAR_DISTANCE_KM = 384_400;

/** Distância média Terra-Sol (1 UA) em km. */
export const KM_PER_AU = 149_597_870.7;
