/**
 * Testes das políticas de distância mínima da câmera do radar.
 */

import { describe, expect, it } from 'vitest';
import {
    CAMERA_NEAR,
    ROCK_MIN_DISTANCE,
    resolveMinZoomDistance,
} from '@/Components/Radar/Scene/cameraConstants';

describe('resolveMinZoomDistance', () => {
    it('sem corpo colável (raio omitido) usa o piso BASE único (ROCK_MIN_DISTANCE)', () => {
        // Navegação livre: chegar perto é igual para todos (Terra/gelo removidos). Sem corpo selecionado
        // o raio é 0 e o piso é o base de sempre.
        expect(resolveMinZoomDistance()).toBe(ROCK_MIN_DISTANCE);
    });

    it('soma o raio do corpo para a FACE parar sempre à mesma folga segura do near plane', () => {
        // O bug: a câmera para a `piso` do CENTRO, mas a face está `raio` mais perto. Com piso fixo, uma
        // rocha de raio não-desprezível tinha a face abaixo do near e recortava. Somando o raio ao piso, a
        // face para sempre a ROCK_MIN_DISTANCE da câmera, acima do near, qualquer que seja o raio.
        for (const radius of [0.012, 0.026]) { // desconhecida e maior rocha (Ceres/Vesta)
            const floor = resolveMinZoomDistance(radius);
            expect(floor).toBeGreaterThan(ROCK_MIN_DISTANCE);
            // A face (piso − raio) fica exatamente no piso base, confortavelmente à frente do near.
            expect(floor - radius).toBeCloseTo(ROCK_MIN_DISTANCE, 10);
            expect(floor - radius).toBeGreaterThan(CAMERA_NEAR);
        }
    });
});