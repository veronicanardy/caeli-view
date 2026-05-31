/**
 * Urano na cena do radar orbital.
 *
 * Responsabilidade: renderizar o gigante de gelo como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação retrógrada,
 * inclinação axial extrema, iluminação atmosférica, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.uranusScenePosition`.
 * Rotação: período sideral de -0,71833 dias, retrógrado e ancorado em J2000.
 * Inclinação axial: 97,77° (IAU WGCCRE 2015), quase “de lado” em relação à órbita.
 * Escala: raio físico de 0,06629 DL; raio visual de 0,13 DL para legibilidade.
 * Iluminação: shader próprio com atmosfera de H₂/He/CH₄ e limb ciano-azulado.
 */

import * as THREE from 'three';
import { URANUS } from '@/lib/observatory/planetData';
import { URANUS_FRAG, URANUS_VERT } from '@/lib/observatory/shaders/uranus.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

/**
 * Urano tem rotação retrógrada; a taxa negativa preserva o sentido visual correto.
 */
const URANUS_SPIN_RATE_RAD_PER_S = -(2 * Math.PI) / URANUS.rotationPeriodS;

/**
 * Inclinação axial: 97,77° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste.
 */
const URANUS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (URANUS.axialTiltDeg * Math.PI) / 180,
);

const URANUS_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: URANUS.visualRadiusDl,
        texturePath: URANUS.texturePath ?? '',
        fallbackColor: URANUS.fallbackColor,
    },
    shaders: {
        vertex: URANUS_VERT,
        fragment: URANUS_FRAG,
    },
    label: {
        pt: 'Urano',
        en: 'Uranus',
        offset: 0.08,
    },
    rim: {
        color: '#40b8c8',
        opacity: 0.07,
        scale: 1.06,
    },
    hitbox: {
        radiusMultiplier: 1.3,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Uranus(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={URANUS_VISUAL_CONFIG}
            spinRateRadPerS={URANUS_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={URANUS_TILT_QUAT}
        />
    );
}
