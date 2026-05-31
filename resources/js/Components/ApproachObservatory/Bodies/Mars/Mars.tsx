/**
 * Marte na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta como corpo ambiente focável, já posicionado
 * pela efeméride da cena. O componente cuida de textura, rotação, inclinação axial,
 * iluminação, hitbox e rótulo; trajetória e efeméride permanecem fora dele.
 *
 * Posição: `SceneEphemeris.marsScenePosition`.
 * Rotação: período sideral de 1,02596 dias, prógrado e ancorado em J2000.
 * Inclinação axial: 25,19° (IAU WGCCRE 2015), próxima à da Terra.
 * Escala: raio físico de 0,00877 DL; raio visual de 0,048 DL para legibilidade.
 * Iluminação: shader próprio com terminador mais abrupto e limb avermelhado de poeira.
 */

import * as THREE from 'three';
import { MARS } from '@/lib/observatory/planetData';
import { MARS_FRAG, MARS_VERT } from '@/lib/observatory/shaders/mars.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

const MARS_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / MARS.rotationPeriodS;

/**
 * Inclinação axial: 25,19° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste.
 */
const MARS_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (MARS.axialTiltDeg * Math.PI) / 180,
);

const MARS_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: MARS.visualRadiusDl,
        texturePath: MARS.texturePath ?? '',
        fallbackColor: MARS.fallbackColor,
    },
    shaders: {
        vertex: MARS_VERT,
        fragment: MARS_FRAG,
    },
    label: {
        pt: 'Marte',
        en: 'Mars',
        offset: 0.12,
    },
    rim: {
        color: '#c0501a',
        opacity: 0.09,
        scale: 1.08,
    },
    hitbox: {
        radiusMultiplier: 3.5,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Mars(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={MARS_VISUAL_CONFIG}
            spinRateRadPerS={MARS_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={MARS_TILT_QUAT}
        />
    );
}
