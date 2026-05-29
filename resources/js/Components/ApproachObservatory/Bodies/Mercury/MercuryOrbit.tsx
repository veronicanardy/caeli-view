/**
 * MercuryOrbit — anel de referência geocêntrico de Mercúrio.
 *
 * Abordagem: anel circular no plano eclíptico (XZ da cena) com raio igual à
 * distância geocêntrica atual de Mercúrio. Igual ao que MoonOrbit faz para a Lua.
 *
 * WHY anel simples e não a path aparente:
 *   A path geocêntrica de Mercúrio ao longo de ~88 dias forma uma curva espiral
 *   estranha (com retrogradações) que envolve toda a cena — visualmente confusa e
 *   sem valor de orientação para o usuário. Um anel no raio atual comunica
 *   claramente "Mercúrio orbita nessa distância da Terra" sem ruído visual.
 *
 * O anel fica no plano eclíptico (Y=0 da cena) porque a inclinação orbital de
 * Mercúrio (~7°) é pequena demais para ser visível a essa escala comprimida.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const ORBIT_SEGMENTS = 128;
const ORBIT_COLOR = '#b0b8c8';    // prateado suave — neutro, não compete com a Terra (azul)
const ORBIT_OPACITY = 0.22;

interface MercuryOrbitProps {
    /** Mercury position in scene units — the ring radius is derived from this. */
    mercuryPos: [number, number, number];
}

export function MercuryOrbit({ mercuryPos }: MercuryOrbitProps) {
    const orbitPoints = useMemo(() => {
        const radius = Math.hypot(mercuryPos[0], mercuryPos[1], mercuryPos[2]);
        if (radius < 1e-6) return null;

        // Ring in the ecliptic plane (scene XZ, Y=0).
        const pts = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
        for (let i = 0; i <= ORBIT_SEGMENTS; i += 1) {
            const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
            pts[i * 3]     = Math.cos(a) * radius;
            pts[i * 3 + 1] = 0;
            pts[i * 3 + 2] = Math.sin(a) * radius;
        }
        return pts;
    }, [mercuryPos]);

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
