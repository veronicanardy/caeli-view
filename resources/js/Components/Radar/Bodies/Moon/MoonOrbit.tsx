/**
 * Guia orbital da Lua na cena 3D.
 *
 * Responsabilidade: desenhar a elipse do plano orbital lunar em coordenadas de
 * mundo, inclinada pela normal real recebida da efeméride. Puramente visual —
 * não calcula posição da Lua nem decide modo de câmera.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import {
    BODY_ORBIT_MIN_RADIUS,
    BODY_ORBIT_OPACITY,
    BODY_ORBIT_SEGMENTS as ORBIT_SEGMENTS,
} from '../bodyRenderConstants';

interface MoonOrbitProps {
    /** Posição absoluta da Lua em coordenadas de mundo. */
    moonPos: [number, number, number];
    /** Posição absoluta da Terra em coordenadas de mundo. */
    earthPos: [number, number, number];
    /** Normal do plano orbital real da Lua. */
    orbitNormal: [number, number, number];
}

// Constantes de renderização da órbita que devem permanecer estáveis para a mesma
// aparência visual.
const ORBIT_COLOR = '#cbd5e1';
const ORBIT_OPACITY = BODY_ORBIT_OPACITY.moon;
const BODY_ORBIT_MIN_RADIUS_SQ = BODY_ORBIT_MIN_RADIUS ** 2;

/**
 * Constroi uma base ortonormal para o círculo da órbita em relação à posição da Lua.
 * O vetor `a` aponta ao longo de `moonPosition`; `b` é tangente ao plano orbital.
 */
export function buildOrbitBasis(moonPosition: THREE.Vector3, orbitNormal: THREE.Vector3) {
    const a = moonPosition.clone().normalize();
    const b = new THREE.Vector3().crossVectors(orbitNormal, a);

    if (b.lengthSq() >= BODY_ORBIT_MIN_RADIUS_SQ) {
        return { a, b: b.normalize() };
    }

    const fallback = new THREE.Vector3(0, 1, 0);
    const fallbackBasis = new THREE.Vector3().crossVectors(fallback, a);
    if (fallbackBasis.lengthSq() < BODY_ORBIT_MIN_RADIUS_SQ) {
        return null;
    }

    return { a, b: fallbackBasis.normalize() };
}

/**
 * Gera a cadeia de pontos que descrevem o círculo da órbita no plano definido por `a`
 * e `b`, mantendo o raio igual à distância da Lua ao centro do sistema.
 */
function buildOrbitPoints(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    const points = new Float32Array((ORBIT_SEGMENTS + 1) * 3);

    for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
        const angle = (i / ORBIT_SEGMENTS) * Math.PI * 2;
        const cos = Math.cos(angle) * radius;
        const sin = Math.sin(angle) * radius;

        points[i * 3] = a.x * cos + b.x * sin;
        points[i * 3 + 1] = a.y * cos + b.y * sin;
        points[i * 3 + 2] = a.z * cos + b.z * sin;
    }

    return points;
}

/**
 * Constrói os pontos da órbita lunar a partir de vetores em coordenadas de cena.
 *
 * Retorna `null` quando o raio ou a normal são degenerados.
 */
export function buildMoonOrbitPoints(
    moonPos: [number, number, number],
    earthPos: [number, number, number],
    orbitNormal: [number, number, number],
): Float32Array | null {
    const geo = new THREE.Vector3(
        moonPos[0] - earthPos[0],
        moonPos[1] - earthPos[1],
        moonPos[2] - earthPos[2],
    );
    const radius = geo.length();
    if (radius < BODY_ORBIT_MIN_RADIUS) return null;

    const normalizedOrbitNormal = new THREE.Vector3(...orbitNormal);
    if (normalizedOrbitNormal.lengthSq() < BODY_ORBIT_MIN_RADIUS_SQ) return null;
    normalizedOrbitNormal.normalize();

    const basis = buildOrbitBasis(geo, normalizedOrbitNormal);
    if (!basis) return null;

    return buildOrbitPoints(basis.a, basis.b, radius);
}

/**
 * A órbita da Lua, desenhada como um círculo no plano orbital REAL da Lua
 * (a partir de posição × velocidade, fornecido por `orbitNormal`) - não uma
 * inclinação arbitrária. A Lua aparece VISIVELMENTE sobre essa linha de 1 DL.
 *
 * O raio é a distância geocêntrica da Lua em unidades de cena (após compressão
 * logarítmica). O primeiro vetor base vem da própria posição da Lua, então a
 * linha renderizada passa exatamente pela Lua renderizada.
 */
export function MoonOrbit({ moonPos, earthPos, orbitNormal }: MoonOrbitProps) {
    const orbitPoints = useMemo(
        () => buildMoonOrbitPoints(moonPos, earthPos, orbitNormal),
        [moonPos, earthPos, orbitNormal],
    );

    if (!orbitPoints) return null;

    return (
        <group position={earthPos}>
            <line>
                <bufferGeometry attach="geometry">
                    <bufferAttribute attach="attributes-position" args={[orbitPoints, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={ORBIT_COLOR} transparent opacity={ORBIT_OPACITY} />
            </line>
        </group>
    );
}
