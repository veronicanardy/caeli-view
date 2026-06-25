/**
 * Testes das políticas de distância mínima da câmera do radar.
 */

import { describe, expect, it } from 'vitest';
import {
    EARTH_MIN_DISTANCE,
    ICE_GIANT_MIN_DISTANCE,
    ROCK_MIN_DISTANCE,
    resolveMinZoomDistance,
} from '@/Components/Radar/Scene/cameraConstants';

describe('resolveMinZoomDistance', () => {
    it('impõe o piso próprio quando Urano ou Netuno estão focados', () => {
        expect(resolveMinZoomDistance({
            hasSelection: false,
            orbitMode: false,
            iceGiantFocused: true,
        })).toBe(ICE_GIANT_MIN_DISTANCE);
    });

    it('preserva o close-up de rochas fora do modo órbita', () => {
        expect(resolveMinZoomDistance({
            hasSelection: true,
            orbitMode: false,
            iceGiantFocused: false,
        })).toBe(ROCK_MIN_DISTANCE);
    });

    it('usa o piso geral ao navegar ou mostrar uma órbita completa', () => {
        expect(resolveMinZoomDistance({
            hasSelection: true,
            orbitMode: true,
            iceGiantFocused: false,
        })).toBe(EARTH_MIN_DISTANCE);
    });
});