/**
 * Constantes compartilhadas pelos corpos visuais do Approach Observatory.
 *
 * Mantem em um unico ponto valores que precisam permanecer sincronizados entre
 * planetas e o guia orbital da Lua, sem misturar configuracao de cena ou efemerides.
 */

/** Epoca J2000.0 em segundos Unix; ancora rotacoes visuais entre sessoes. */
export const BODY_ROTATION_EPOCH_UNIX_S = 946_728_000;

/** Resolucao padrao dos aneis orbitais desenhados como linhas. */
export const BODY_ORBIT_SEGMENTS = 128;

/** Raio minimo para evitar geometrias degeneradas em aneis orbitais. */
export const BODY_ORBIT_MIN_RADIUS = 1e-6;

export const BODY_ORBIT_OPACITY = {
    moon: 0.3,
} as const;
