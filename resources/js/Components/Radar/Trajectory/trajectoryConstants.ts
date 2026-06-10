/**
 * Constantes visuais compartilhadas pelas trajetórias do Approach Observatory.
 *
 * Responsabilidade: centralizar dimensões, opacidades e limiares de apresentação
 * usados por linhas, cone de direção e marcadores, sem misturar cálculo orbital
 * ou regras científicas.
 */

/** Distância do centro do asteroide onde o cone começa (frente). */
export const ASTEROID_MARKER_RADIUS = 0.008;

/** Distância do centro do asteroide onde a linha de passado termina (trás). */
export const ASTEROID_TRAIL_END_RADIUS = 0.01;
export const ORBIT_LINE_SEGMENTS = 192;
export const DEFAULT_ORBIT_LINE_OPACITY = 0.85;

export const DIRECTION_CONE_GEOMETRY = {
    length: 0.18,
    width: 0.0028,
    headLength: 0.028,
    headWidth: 0.009,
    airGap: ASTEROID_MARKER_RADIUS,
} as const;

export const DIRECTION_CONE_SCALE = {
    min: 0.90,
    max: 1.20,
    distanceFactor: 0.022,
} as const;

export const TRAJECTORY_MARKER_THRESHOLDS = {
    closestApproachOnPathDistance: 0.25,
    timeTickOnPathDistance: 0.35,
} as const;