/**
 * Constantes de layout e responsividade do módulo Radar.
 *
 * Centraliza breakpoints usados pela lógica de câmera e painel para que uma
 * única mudança de threshold reflita em todos os pontos que dele dependem.
 */

/** Largura mínima em px acima da qual a interface usa layout desktop (lg: do Tailwind). */
export const DESKTOP_MIN_WIDTH_PX = 1024;

/** Query de media para detectar viewport mobile (abaixo de lg:). */
export const MOBILE_MEDIA_QUERY = `(max-width: ${DESKTOP_MIN_WIDTH_PX - 1}px)`;

/** Query de media para detectar viewport desktop (lg: e acima). */
export const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`;
