/**
 * NeptuneOrbit — anel de referência geocêntrico de Netuno.
 *
 * Mesma abordagem de UranusOrbit/SaturnOrbit: anel circular no plano eclíptico (XZ da cena)
 * com raio igual à distância geocêntrica atual de Netuno.
 *
 * Cor azul-profunda para identidade visual clara — o azul intenso de Netuno,
 * mais escuro e saturado que o ciano de Urano.
 */

import { useMemo } from 'react';

const ORBIT_SEGMENTS = 128;
const ORBIT_COLOR = '#2878d8';   // azul-profundo — cor de Netuno (mais saturado que Urano)
const ORBIT_OPACITY = 0.18;

interface NeptuneOrbitProps {
    /** Neptune position in scene units — the ring radius is derived from this. */
    neptunePos: [number, number, number];
}

export function NeptuneOrbit({ neptunePos }: NeptuneOrbitProps) {
    const orbitPoints = useMemo(() => {
        const radius = Math.hypot(neptunePos[0], neptunePos[1], neptunePos[2]);
        if (radius < 1e-6) return null;

        const pts = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
        for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
            const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
            pts[i * 3]     = Math.cos(a) * radius;
            pts[i * 3 + 1] = 0;
            pts[i * 3 + 2] = Math.sin(a) * radius;
        }
        return pts;
    }, [neptunePos]);

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
