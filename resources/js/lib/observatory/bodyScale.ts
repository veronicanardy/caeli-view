/**
 * Visual radii (in scene units, i.e. log-compressed DL) for the bodies the geocentric radar
 * renders. These are EXAGGERATED for readability — Earth's real diameter at this scale would be
 * sub-pixel. The on-screen "Earth and Moon scaled up" note keeps the contract explicit.
 *
 * Distances between bodies stay true to DL — only the sphere sizes are amplified.
 */

export const EARTH_RADIUS_DL = 0.11;
export const MOON_RADIUS_DL = 0.035;

/** Invisible hitboxes — generous click/hover targets that never change the rendered geometry. */
export const EARTH_HITBOX_DL = EARTH_RADIUS_DL * 1.8;
export const MOON_HITBOX_DL = MOON_RADIUS_DL * 3;
