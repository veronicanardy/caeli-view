/**
 * Constantes compartilhadas pelos corpos visuais do módulo Radar.
 *
 * Mantém em um único ponto valores que precisam permanecer sincronizados entre
 * planetas, o guia orbital da Lua e a cena 3D.
 */

import { KM_PER_LD } from '@/lib/sceneEphemeris';

const SUN_RADIUS_KM = 695_700;

/** Raio do Sol em unidades de cena (distâncias lunares comprimidas). */
export const SUN_RADIUS_SCENE = SUN_RADIUS_KM / KM_PER_LD;

/** Época J2000.0 em segundos Unix; ancora rotações visuais entre sessões. */
export const BODY_ROTATION_EPOCH_UNIX_S = 946_728_000;

/** Resolução padrão dos anéis orbitais desenhados como linhas. */
export const BODY_ORBIT_SEGMENTS = 128;

/** Raio mínimo para evitar geometrias degeneradas em anéis orbitais. */
export const BODY_ORBIT_MIN_RADIUS = 1e-6;

export const BODY_ORBIT_OPACITY = {
    moon: 0.16,
} as const;

/** Segmentos padrão das esferas usadas pelos planetas ambiente. */
export const BODY_SPHERE_SEGMENTS = {
    planet: {
        width: 48,
        height: 32,
    },
    rim: {
        width: 24,
        height: 16,
    },
    hitbox: {
        width: 12,
        height: 8,
    },
} as const;

/** Material invisível usado pelas hitboxes locais dos corpos. */
export const BODY_HITBOX_MATERIAL = {
    opacity: 0,
    depthWrite: false,
} as const;