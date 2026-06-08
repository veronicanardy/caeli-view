/**
 * Netuno na cena do radar orbital.
 *
 * Responsabilidade: renderizar o gigante de gelo como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação,
 * inclinação axial, iluminação atmosférica, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.neptuneScenePosition`.
 * Rotação: período sideral de 0,67125 dias (16 h 6 min), ancorado em J2000.
 * Inclinação axial: 28,32° (IAU WGCCRE 2015), aplicada ao grupo do polo.
 * Escala: raio físico de 0,06370 DL; raio visual de 0,12 DL para legibilidade.
 * Iluminação: shader próprio com atmosfera densa, calor interno e limb azul-profundo.
 */

import * as THREE from 'three';
import { NEPTUNE } from '@/lib/observatory/planetData';
import { NEPTUNE_FRAG, NEPTUNE_VERT } from '@/lib/observatory/shaders/neptune.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

const NEPTUNE_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / NEPTUNE.rotationPeriodS;

/**
 * Inclinação axial: 28,32° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste.
 */
const NEPTUNE_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (NEPTUNE.axialTiltDeg * Math.PI) / 180,
);

const NEPTUNE_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: NEPTUNE.visualRadiusDl,
        texturePath: NEPTUNE.texturePath ?? '',
        fallbackColor: NEPTUNE.fallbackColor,
    },
    shaders: {
        vertex: NEPTUNE_VERT,
        fragment: NEPTUNE_FRAG,
    },
    label: {
        pt: 'Netuno',
        en: 'Neptune',
        offset: 0.08,
    },
    rim: {
        color: '#2060c8',
        opacity: 0.08,
        scale: 1.06,
    },
    hitbox: {
        radiusMultiplier: 1.3,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Neptune(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={NEPTUNE_VISUAL_CONFIG}
            spinRateRadPerS={NEPTUNE_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={NEPTUNE_TILT_QUAT}
        />
    );
}
