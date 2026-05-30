/**
 * SaturnOrbit — anel de referência geocêntrico de Saturno.
 *
 * Mesma abordagem de MarsOrbit/JupiterOrbit: anel circular no plano eclíptico (XZ da cena)
 * com raio igual à distância geocêntrica atual de Saturno.
 *
 * Cor dourado-ocre para identidade visual clara — o planeta dos anéis dourados.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const ORBIT_SEGMENTS = 128;
const ORBIT_COLOR = '#c8a840';   // dourado-ocre — cor característica de Saturno
const ORBIT_OPACITY = 0.18;

interface SaturnOrbitProps {
    /** Saturn position in scene units — the ring radius is derived from this. */
    saturnPos: [number, number, number];
}

export function SaturnOrbit({ saturnPos }: SaturnOrbitProps) {
    const orbitPoints = useMemo(() => {
        const radius = Math.hypot(saturnPos[0], saturnPos[1], saturnPos[2]);
        if (radius < 1e-6) return null;

        const pts = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
        for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
            const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
            pts[i * 3]     = Math.cos(a) * radius;
            pts[i * 3 + 1] = 0;
            pts[i * 3 + 2] = Math.sin(a) * radius;
        }
        return pts;
    }, [saturnPos]);

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
