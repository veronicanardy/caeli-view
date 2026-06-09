/**
 * Plutão na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta anão como corpo ambiente focável, já
 * posicionado pela efeméride da cena. O componente cuida de textura, rotação,
 * inclinação axial, iluminação de superfície gelada, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.plutoScenePosition`.
 * Rotação: período sideral de 6,3874 dias (retrógrado — sinal negativo na taxa).
 * Inclinação axial: 122,53° (IAU WGCCRE 2015) — obliquidade extrema, rotação retrógrada.
 * Escala: raio físico de 0,003091 DL; raio visual de 0,022 DL para legibilidade.
 * Classificação: planeta anão (IAU 2006); maior corpo conhecido do Cinturão de Kuiper.
 */

import * as THREE from 'three';
import { PLUTO } from '@/lib/observatory/planetData';
import { PLUTO_FRAG, PLUTO_VERT } from '@/lib/observatory/shaders/pluto.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';

// --------------- Constantes ---------------------------------------------------------------

// Retrógrado: sinal negativo na taxa de rotação.
const PLUTO_SPIN_RATE_RAD_PER_S = -(2 * Math.PI) / PLUTO.rotationPeriodS;

/**
 * Inclinação axial: 122,53° em torno de X eclíptico.
 * Obliquidade extrema — Plutão praticamente "rola" pela órbita como Urano.
 */
const PLUTO_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (PLUTO.axialTiltDeg * Math.PI) / 180,
);

const PLUTO_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: PLUTO.visualRadiusDl,
        texturePath: PLUTO.texturePath ?? '',
        fallbackColor: PLUTO.fallbackColor,
    },
    shaders: {
        vertex: PLUTO_VERT,
        fragment: PLUTO_FRAG,
    },
    label: {
        pt: 'Plutão',
        en: 'Pluto',
        offset: 0.06,
    },
    rim: {
        color: '#b0a090',
        opacity: 0.07,
        scale: 1.05,
    },
    hitbox: {
        radiusMultiplier: 2.0,
    },
};

// --------------- Componente ---------------------------------------------------------------

export function Pluto(props: PlanetBodyProps) {
    return (
        <PlanetBody
            {...props}
            config={PLUTO_VISUAL_CONFIG}
            spinRateRadPerS={PLUTO_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={PLUTO_TILT_QUAT}
        />
    );
}
