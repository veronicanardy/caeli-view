/**
 * MarsOrbit — anel de referência geocêntrico de Marte.
 *
 * Mesma abordagem de MercuryOrbit/VenusOrbit: anel circular no plano eclíptico (XZ da cena)
 * com raio igual à distância geocêntrica atual de Marte.
 *
 * Cor vermelha-ferrugem para identidade visual clara — o Planeta Vermelho.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const ORBIT_SEGMENTS = 128;
const ORBIT_COLOR = '#c0501a';   // vermelho-ferrugem — cor característica de Marte
const ORBIT_OPACITY = 0.20;

interface MarsOrbitProps {
    /** Mars position in scene units — the ring radius is derived from this. */
    marsPos: [number, number, number];
}

export function MarsOrbit({ marsPos }: MarsOrbitProps) {
    const orbitPoints = useMemo(() => {
        const radius = Math.hypot(marsPos[0], marsPos[1], marsPos[2]);
        if (radius < 1e-6) return null;

        const pts = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
        for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
            const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
            pts[i * 3]     = Math.cos(a) * radius;
            pts[i * 3 + 1] = 0;
            pts[i * 3 + 2] = Math.sin(a) * radius;
        }
        return pts;
    }, [marsPos]);

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
