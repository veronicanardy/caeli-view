/**
 * UranusOrbit — anel de referência geocêntrico de Urano.
 *
 * Mesma abordagem de SaturnOrbit/JupiterOrbit: anel circular no plano eclíptico (XZ da cena)
 * com raio igual à distância geocêntrica atual de Urano.
 *
 * Cor ciano-azulada para identidade visual clara — a cor do metano atmosférico de Urano.
 */

import { useMemo } from 'react';

const ORBIT_SEGMENTS = 128;
const ORBIT_COLOR = '#4ab8c8';   // ciano-azulado — cor do metano de Urano
const ORBIT_OPACITY = 0.18;

interface UranusOrbitProps {
    /** Uranus position in scene units — the ring radius is derived from this. */
    uranusPos: [number, number, number];
}

export function UranusOrbit({ uranusPos }: UranusOrbitProps) {
    const orbitPoints = useMemo(() => {
        const radius = Math.hypot(uranusPos[0], uranusPos[1], uranusPos[2]);
        if (radius < 1e-6) return null;

        const pts = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
        for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
            const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
            pts[i * 3]     = Math.cos(a) * radius;
            pts[i * 3 + 1] = 0;
            pts[i * 3 + 2] = Math.sin(a) * radius;
        }
        return pts;
    }, [uranusPos]);

    if (!orbitPoints) return null;

    return (
        <line>
            <bufferGeometry attach="geometry">
                <bufferAttribute attach="attributes-position" args={[orbitPoints, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
                color={ORBIT_COLOR}
                transparent
                opacity={ORBIT_OPACITY}
                depthWrite={false}
            />
        </line>
    );
}
