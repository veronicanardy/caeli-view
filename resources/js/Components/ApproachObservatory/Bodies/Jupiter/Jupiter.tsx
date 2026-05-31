/**
 * Júpiter na cena do radar orbital.
 *
 * Responsabilidade: renderizar o gigante gasoso como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação rápida,
 * inclinação axial, iluminação atmosférica, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.jupiterScenePosition`.
 * Rotação: período sideral de 0,41354 dias (9 h 55 min), ancorado em J2000.
 * Inclinação axial: 3,13° (IAU WGCCRE 2015), quase perpendicular à eclíptica.
 * Escala: raio físico de 0,18596 DL; raio visual de 0,19 DL, quase sem exagero.
 * Iluminação: shader próprio com atmosfera densa, piso noturno e limb azul-acinzentado.
 */

import * as THREE from 'three';
import { JUPITER } from '@/lib/observatory/planetData';
import { JUPITER_FRAG, JUPITER_VERT } from '@/lib/observatory/shaders/jupiter.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

const JUPITER_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / JUPITER.rotationPeriodS;

/**
 * Inclinação axial: 3,13° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste.
 */
const JUPITER_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (JUPITER.axialTiltDeg * Math.PI) / 180,
);

const JUPITER_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: JUPITER.visualRadiusDl,
        texturePath: JUPITER.texturePath ?? '',
        fallbackColor: JUPITER.fallbackColor,
    },
    shaders: {
        vertex: JUPITER_VERT,
        fragment: JUPITER_FRAG,
    },
    label: {
        pt: 'Júpiter',
        en: 'Jupiter',
        offset: 0.14,
    },
    rim: {
        color: '#7090b8',
        opacity: 0.07,
        scale: 1.06,
    },
    hitbox: {
        radiusMultiplier: 2.0,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Jupiter(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={JUPITER_VISUAL_CONFIG}
            spinRateRadPerS={JUPITER_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={JUPITER_TILT_QUAT}
        />
    );
}
