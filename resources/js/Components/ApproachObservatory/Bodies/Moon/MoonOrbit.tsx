import { useMemo } from 'react';
import * as THREE from 'three';

interface MoonOrbitProps {
    /**
     * A posição da Lua em unidades de cena. O comprimento deste vetor define o raio
     * da órbita desenhada.
     */
    moonPos: [number, number, number];
    /**
     * O normal do plano orbital real da Lua. Define o plano em que o círculo é construído.
     */
    orbitNormal: [number, number, number];
}

// Constantes de renderização da órbita que devem permanecer estáveis para a mesma
// aparência visual.
const ORBIT_SEGMENTS = 128;
const MIN_ORBIT_RADIUS = 1e-6;
const ORBIT_COLOR = '#cbd5e1';
const ORBIT_OPACITY = 0.3;

/**
 * Constroi uma base ortonormal para o círculo da órbita em relação à posição da Lua.
 * O vetor `a` aponta ao longo de `moonPosition`; `b` é tangente ao plano orbital.
 */
function buildOrbitBasis(moonPosition: THREE.Vector3, orbitNormal: THREE.Vector3) {
    const a = moonPosition.clone().normalize();
    const b = new THREE.Vector3().crossVectors(orbitNormal, a);

    if (b.lengthSq() >= MIN_ORBIT_RADIUS) {
        return { a, b: b.normalize() };
    }

    const fallback = new THREE.Vector3(0, 1, 0);
    const fallbackBasis = new THREE.Vector3().crossVectors(fallback, a);
    if (fallbackBasis.lengthSq() < MIN_ORBIT_RADIUS) {
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
 * A órbita da Lua, desenhada como um círculo no plano orbital REAL da Lua
 * (a partir de posição × velocidade, fornecido por `orbitNormal`) — não uma
 * inclinação arbitrária. A Lua aparece VISIVELMENTE sobre essa linha de 1 DL.
 *
 * O raio é a distância geocêntrica da Lua em unidades de cena (após compressão
 * logarítmica). O primeiro vetor base vem da própria posição da Lua, então a
 * linha renderizada passa exatamente pela Lua renderizada.
 */
export function MoonOrbit({ moonPos, orbitNormal }: MoonOrbitProps) {
    const orbitPoints = useMemo(() => {
        // Reconstrói a geometria da órbita apenas quando os vetores de entrada mudam.
        const moonPosition = new THREE.Vector3(...moonPos);
        const radius = moonPosition.length();
        if (radius < MIN_ORBIT_RADIUS) return null;

        const normalizedOrbitNormal = new THREE.Vector3(...orbitNormal);
        if (normalizedOrbitNormal.lengthSq() < MIN_ORBIT_RADIUS) return null;
        normalizedOrbitNormal.normalize();

        const basis = buildOrbitBasis(moonPosition, normalizedOrbitNormal);
        if (!basis) return null;

        return buildOrbitPoints(basis.a, basis.b, radius);
    }, [moonPos, orbitNormal]);

    if (!orbitPoints) return null;

    return (
        <group>
            <line>
                <bufferGeometry attach="geometry">
                    <bufferAttribute attach="attributes-position" args={[orbitPoints, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={ORBIT_COLOR} transparent opacity={ORBIT_OPACITY} />
            </line>
        </group>
    );
}
