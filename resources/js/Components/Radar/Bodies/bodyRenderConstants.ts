/**
 * Constantes compartilhadas pelos corpos visuais do módulo Radar.
 *
 * Mantém em um único ponto valores que precisam permanecer sincronizados entre
 * planetas, o guia orbital da Lua e a cena 3D.
 */

import { KM_PER_LD } from '@/lib/sceneEphemeris';

const SUN_RADIUS_KM = 695_700;

/**
 * Raio FÍSICO real do Sol em unidades de cena (1 DL = 384.400 km) ≈ 1,81 DL.
 *
 * Política de escala do Sol — decisão deliberada: o Sol é o ÚNICO corpo renderizado em escala
 * REAL (1×), sem exagero. Diferente da Terra (~47×), da Lua e dos planetas (calibrados em
 * planetData.ts), ele já é gigante o bastante para dominar a cena sozinho: ~9,5× o raio visual de
 * Júpiter (0,19 DL) e ~16× o da Terra (0,11 DL). Exagerá-lo o tornaria absurdo; reduzi-lo o faria
 * competir com os planetas. Por isso physical e visual coincidem — mantemos as duas constantes
 * explícitas para alinhar com o padrão physicalRadiusDl/visualRadiusDl de planetData.ts.
 */
export const SUN_PHYSICAL_RADIUS_DL = SUN_RADIUS_KM / KM_PER_LD;

/** Raio renderizado do Sol. Igual ao físico por decisão de política (ver acima). */
export const SUN_VISUAL_RADIUS_DL = SUN_PHYSICAL_RADIUS_DL;

/**
 * @deprecated Use SUN_VISUAL_RADIUS_DL. Mantido como alias para não quebrar os consumidores atuais
 * (RadarScene, HeliocentricScene, sceneOcclusion e seus testes).
 */
export const SUN_RADIUS_SCENE = SUN_VISUAL_RADIUS_DL;

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