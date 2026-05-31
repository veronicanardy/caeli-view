/**
 * Vênus na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta como corpo ambiente focável, já posicionado
 * pela efeméride da cena. O componente mantém aparência, rotação retrógrada,
 * iluminação atmosférica, hitbox e rótulo; cálculo orbital fica fora dele.
 *
 * Posição: `SceneEphemeris.venusScenePosition`.
 * Rotação: período sideral de -243,018 dias, retrógrado e ancorado em J2000.
 * Inclinação axial: 177,36° (IAU WGCCRE 2015), aplicada no grupo do polo.
 * Escala: raio físico de 0,01573 DL; raio visual de 0,038 DL para legibilidade.
 * Iluminação: shader próprio com atmosfera espessa e `sunDir` calculado de Vênus para o Sol da cena.
 */

import * as THREE from 'three';
import { VENUS } from '@/lib/observatory/planetData';
import { VENUS_FRAG, VENUS_VERT } from '@/lib/observatory/shaders/venus.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

/**
 * Vênus tem rotação retrógrada; a taxa negativa preserva o sentido visual correto.
 */
const VENUS_SPIN_RATE_RAD_PER_S = -(2 * Math.PI) / VENUS.rotationPeriodS;

/**
 * Inclinação axial: 177,36° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste. A taxa negativa de
 * rotação codifica o sentido retrógrado; a inclinação define o polo visual.
 */
const VENUS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (VENUS.axialTiltDeg * Math.PI) / 180,
);

const VENUS_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: VENUS.visualRadiusDl,
        texturePath: VENUS.texturePath ?? '',
        fallbackColor: VENUS.fallbackColor,
    },
    shaders: {
        vertex: VENUS_VERT,
        fragment: VENUS_FRAG,
    },
    label: {
        pt: 'Vênus',
        en: 'Venus',
        offset: 0.12,
    },
    materialFallback: {
        roughness: 0.6,
        metalness: 0.0,
    },
    rim: {
        color: '#c8a040',
        opacity: 0.13,
        scale: 1.12,
    },
    hitbox: {
        radiusMultiplier: 3.5,
    },
    extraTexture: {
        uniformName: 'atmosphereMap',
        path: VENUS.atmospherePath ?? '',
        colorSpace: 'srgb',
        fallbackToSurfaceMap: true,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Venus(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={VENUS_VISUAL_CONFIG}
            spinRateRadPerS={VENUS_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={VENUS_TILT_QUAT}
        />
    );
}
