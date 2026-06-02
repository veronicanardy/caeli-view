/**
 * Constantes visuais compartilhadas dos corpos principais da cena.
 *
 * Responsabilidade: centralizar valores de escala usados por mais de uma camada
 * de `Scene`, evitando repetir conversões físicas em compositores diferentes.
 */

import { KM_PER_LD } from '@/lib/sceneEphemeris';

const SUN_RADIUS_KM = 695_700;

export const SUN_RADIUS_SCENE = SUN_RADIUS_KM / KM_PER_LD;
