/**
 * Campo estelar procedural da cena 3D.
 *
 * ~1200 partículas em duas camadas (fundo difuso + primeiro plano) que seguem
 * a câmera para evitar que o limite da esfera apareça durante zoom out extremo.
 * Puramente decorativo — não afeta cálculos orbitais.
 *
 * O RNG é determinístico (seed fixo = 42) para que o campo seja idêntico
 * entre renders e sessões, sem depender de Math.random().
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export function StarField() {
    const groupRef = useRef<THREE.Group>(null);

    const geo = useMemo(() => {
        /* Duas camadas: fundo distante (tênue) e primeiro plano (ligeiramente maior).
           Resultado: campo estelar com mais profundidade percebida sem aumentar o ruído. */
        const count = 1200;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const rng = (() => { let s = 42; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; })();
        for (let i = 0; i < count; i++) {
            const theta = rng() * Math.PI * 2;
            const phi = Math.acos(2 * rng() - 1);
            /* 70% das estrelas ficam mais longe (fundo difuso), 30% mais perto (primeiro plano). */
            const near = rng() > 0.7;
            const r = near ? 350 + rng() * 100 : 500 + rng() * 200;
            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            const warm = rng();
            colors[i * 3]     = 0.82 + warm * 0.18;
            colors[i * 3 + 1] = 0.86 + rng() * 0.1;
            colors[i * 3 + 2] = 0.82 + (1 - warm) * 0.18;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
        return g;
    }, []);

    useFrame(({ camera }) => {
        if (groupRef.current) {
            groupRef.current.position.copy(camera.position);
        }
    });

    return (
        <group ref={groupRef}>
            <points geometry={geo} renderOrder={-1}>
                <pointsMaterial
                    vertexColors
                    size={0.20}
                    sizeAttenuation
                    transparent
                    opacity={0.32}
                    depthWrite={false}
                />
            </points>
        </group>
    );
}
