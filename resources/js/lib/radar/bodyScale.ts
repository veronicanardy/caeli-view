/**
 * Responsabilidade: raios visuais e hitboxes dos corpos celestes principais do radar geocêntrico.
 *
 * Os raios são EXAGERADOS para legibilidade — o diâmetro real da Terra nessa escala seria
 * sub-pixel. As distâncias entre os corpos permanecem fiéis à escala em DL; apenas os tamanhos
 * das esferas são amplificados.
 *
 * Os hitboxes são invisíveis e generosos, para facilitar clique/hover sem alterar a geometria
 * renderizada.
 */

export const EARTH_RADIUS_DL = 0.11;
export const MOON_RADIUS_DL = 0.035;

/** Hitboxes invisíveis — alvos de clique/hover que nunca alteram a geometria renderizada. */
export const EARTH_HITBOX_DL = EARTH_RADIUS_DL * 1.8;
export const MOON_HITBOX_DL = MOON_RADIUS_DL * 3;
