/**
 * Mercúrio na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta como corpo ambiente focável, já posicionado
 * pela efeméride da cena. O componente cuida apenas de malha, textura, rotação,
 * iluminação, hitbox e rótulo; cálculo orbital fica fora dele.
 *
 * Posição: `SceneEphemeris.mercuryScenePosition`.
 * Rotação: período sideral de 58,6462 dias, ancorado em J2000 para consistência.
 * Inclinação axial: 0,034° (IAU WGCCRE 2015), aplicada no grupo do polo.
 * Escala: raio físico de 0,00635 DL; raio visual de 0,028 DL para legibilidade.
 * Iluminação: shader próprio com `sunDir` calculado de Mercúrio para o Sol da cena.
 */

import * as THREE from 'three';
import { MERCURY } from '@/lib/radar/planetData';
import { MERCURY_FRAG, MERCURY_VERT } from '@/lib/radar/shaders/mercury.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

const MERCURY_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / MERCURY.rotationPeriodS;

/**
 * Inclinação axial: 0,034° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste.
 */
const MERCURY_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (MERCURY.axialTiltDeg * Math.PI) / 180,
);

const MERCURY_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: MERCURY.visualRadiusDl,
        texturePath: MERCURY.texturePath ?? '',
        fallbackColor: MERCURY.fallbackColor,
    },
    shaders: {
        vertex: MERCURY_VERT,
        fragment: MERCURY_FRAG,
    },
    label: {
        pt: 'Mercúrio',
        en: 'Mercury',
        offset: 0.12,
    },
    materialFallback: {
        roughness: 0.95,
        metalness: 0.0,
    },
    rim: {
        color: '#c8a87a',
        opacity: 0.08,
        scale: 1.08,
    },
    hitbox: {
        radiusMultiplier: 3.5,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Mercury(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={MERCURY_VISUAL_CONFIG}
            spinRateRadPerS={MERCURY_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={MERCURY_TILT_QUAT}
        />
    );
}
