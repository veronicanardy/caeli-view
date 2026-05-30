/**
 * JupiterOrbit — anel de referência geocêntrico de Júpiter.
 *
 * Mesma abordagem de MarsOrbit/VenusOrbit/MercuryOrbit: anel circular no plano eclíptico
 * (XZ da cena) com raio igual à distância geocêntrica atual de Júpiter.
 *
 * Cor laranja-bege para identidade visual clara — as bandas de amônia do Gigante.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const ORBIT_SEGMENTS = 128;
const ORBIT_COLOR = '#c8a060';   // laranja-bege — bandas de amônia de Júpiter
const ORBIT_OPACITY = 0.20;

interface JupiterOrbitProps {
    /** Jupiter position in scene units — the ring radius is derived from this. */
    jupiterPos: [number, number, number];
}

export function JupiterOrbit({ jupiterPos }: JupiterOrbitProps) {
    const orbitPoints = useMemo(() => {
        const radius = Math.hypot(jupiterPos[0], jupiterPos[1], jupiterPos[2]);
        if (radius < 1e-6) return null;

        const pts = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
        for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
            const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
            pts[i * 3]     = Math.cos(a) * radius;
            pts[i * 3 + 1] = 0;
            pts[i * 3 + 2] = Math.sin(a) * radius;
        }
        return pts;
    }, [jupiterPos]);

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
