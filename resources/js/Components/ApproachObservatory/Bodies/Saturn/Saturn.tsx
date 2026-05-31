/**
 * Saturno na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta e seu sistema de anéis como corpo ambiente
 * focável, já posicionado pela efeméride da cena. O componente mantém aparência,
 * rotação, inclinação, anéis texturizados, iluminação, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.saturnScenePosition`.
 * Rotação: período sideral de 0,44401 dias (10 h 39 min), ancorado em J2000.
 * Inclinação axial: 26,73° (IAU WGCCRE 2015), aplicada ao grupo do polo.
 * Escala: raio físico de 0,15597 DL; raio visual de 0,16 DL, quase sem exagero.
 * Anéis: disco anular texturizado com UV radial e raios relativos reais.
 * Iluminação: shader próprio com atmosfera densa e limb dourado-ocre.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SATURN } from '@/lib/observatory/planetData';
import { SATURN_FRAG, SATURN_VERT } from '@/lib/observatory/shaders/saturn.glsl';
import { PlanetBody, type PlanetVisualConfig } from '../PlanetBody';
import type { PlanetBodyProps } from '../planetBodyTypes';
import { useBodyTexture } from '../useBodyTexture';

// --------------- Constantes ---------------------------------------------------------------

const SATURN_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / SATURN.rotationPeriodS;

/**
 * Inclinação axial: 26,73° em torno de X eclíptico.
 *
 * Observação: esta é uma aproximação visual da obliquidade, não uma orientação
 * completa do polo IAU no sistema de referência celeste.
 */
const SATURN_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (SATURN.axialTiltDeg * Math.PI) / 180,
);

/**
 * Raios visuais dos anéis de Saturno.
 *
 * O intervalo aproxima a extensão do sistema principal de anéis: borda interna
 * do anel C até a borda externa do anel A. A textura cobre radialmente esse
 * intervalo de `inner` a `outer`.
 */
const RING_INNER_RADIUS = SATURN.visualRadiusDl * 1.11;
const RING_OUTER_RADIUS = SATURN.visualRadiusDl * 2.27;

const SATURN_VISUAL_CONFIG: PlanetVisualConfig = {
    body: {
        visualRadiusDl: SATURN.visualRadiusDl,
        texturePath: SATURN.texturePath ?? '',
        fallbackColor: SATURN.fallbackColor,
    },
    shaders: {
        vertex: SATURN_VERT,
        fragment: SATURN_FRAG,
    },
    label: {
        pt: 'Saturno',
        en: 'Saturn',
        offset: RING_OUTER_RADIUS + 0.10 - SATURN.visualRadiusDl,
    },
    materialFallback: {
        roughness: 0.85,
        metalness: 0.0,
    },
    rim: {
        color: '#c8b060',
        opacity: 0.07,
        scale: 1.06,
    },
    hitbox: {
        radiusMultiplier: (RING_OUTER_RADIUS * 1.1) / SATURN.visualRadiusDl,
    },
};

// --------------- Geometria dos anéis ------------------------------------------------------

/**
 * Constrói uma geometria de disco anular com UVs radiais para a textura dos anéis.
 *
 * A textura é interpretada como uma faixa horizontal:
 * - `u = 0`: borda interna;
 * - `u = 1`: borda externa;
 * - `v = 0.5`: linha central da textura.
 */
function buildRingGeometry(innerRadius: number, outerRadius: number, segments = 192): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        positions.push(cos * innerRadius, 0, sin * innerRadius);
        uvs.push(0, 0.5);

        positions.push(cos * outerRadius, 0, sin * outerRadius);
        uvs.push(1, 0.5);
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;

        indices.push(a, b, c, b, d, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
}

// --------------- Componente ---------------------------------------------------------------

export function Saturn(props: PlanetBodyProps) {
    const ringTexture = useBodyTexture('/images/saturn/saturn-ring-8k.png', 'srgb');

    const ringMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            map: ringTexture ?? null,
            color: ringTexture ? '#ffffff' : '#d4c090',
            transparent: true,
            opacity: ringTexture ? 1.0 : 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
            alphaTest: 0.01,
        });
    }, [ringTexture]);

    useEffect(() => {
        return () => {
            ringMaterial.dispose();
        };
    }, [ringMaterial]);

    const ringGeo = useMemo(() => buildRingGeometry(RING_INNER_RADIUS, RING_OUTER_RADIUS), []);

    useEffect(() => {
        return () => {
            ringGeo.dispose();
        };
    }, [ringGeo]);

    return (
        <PlanetBody
            {...props}
            config={SATURN_VISUAL_CONFIG}
            spinRateRadPerS={SATURN_SPIN_RATE_RAD_PER_S}
            tiltQuaternion={SATURN_TILT_QUAT}
            childrenInsidePoleGroup={
                <mesh geometry={ringGeo}>
                    <primitive object={ringMaterial} attach="material" />
                </mesh>
            }
        />
    );
}
