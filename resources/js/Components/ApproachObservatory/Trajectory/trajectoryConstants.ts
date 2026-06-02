/**
 * Constantes visuais compartilhadas pelas trajetórias do Approach Observatory.
 *
 * Responsabilidade: centralizar dimensões, opacidades e limiares de apresentação
 * usados por linhas, cone de direção e marcadores, sem misturar cálculo orbital
 * ou regras científicas.
 */

export const DIRECTION_CONE_GEOMETRY = {
    length: 0.086,
    width: 0.0042,
    headLength: 0.026,
    headWidth: 0.018,
    airGap: 0.064,
} as const;

export const DIRECTION_CONE_SCALE = {
    min: 0.94,
    max: 1.28,
    distanceFactor: 0.028,
} as const;

export const TRAJECTORY_MARKER_THRESHOLDS = {
    closestApproachOnPathDistance: 0.25,
    timeTickOnPathDistance: 0.35,
} as const;

export const ORBIT_LINE_SEGMENTS = 192;
export const DEFAULT_ORBIT_LINE_OPACITY = 0.85;
