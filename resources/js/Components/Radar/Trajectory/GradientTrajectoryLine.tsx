/**
 * Linha geocêntrica com gradiente de opacidade.
 *
 * Responsabilidade: converter pontos já calculados em geometria visual suave,
 * sem interpretar órbita, ranking ou fallback de dados.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Desenha uma linha 3D com gradiente de opacidade ao longo do trajeto.
 *
 * Recebe pontos já calculados por outras camadas, sem calcular trajetória real,
 * buscar dados externos ou decidir ranking e fallback.
 */
export function GradientTrajectoryLine({
    points,
    color,
    peakOpacity,
    peakAtEnd,
    exclusionRadius,
}: {
    points: THREE.Vector3[];
    color: string;
    peakOpacity: number;
    peakAtEnd: boolean;
    exclusionRadius?: number;
}) {
    const { positions, colors } = useMemo(() => {
        const base = new THREE.Color(color);
        const endpoint = points[points.length - 1];
        const sampled = points.length >= 3
            ? new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
                .getPoints(Math.min(180, Math.max(40, points.length * 20)))
            : points;

        const filtered = exclusionRadius != null && endpoint
            ? sampled.filter((p) => p.distanceTo(endpoint) >= exclusionRadius)
            : sampled;
        const count = filtered.length;
        const positionsArray = new Float32Array(count * 3);
        const colorsArray = new Float32Array(count * 4);

        for (let index = 0; index < count; index += 1) {
            const point = filtered[index];
            positionsArray[index * 3] = point.x;
            positionsArray[index * 3 + 1] = point.y;
            positionsArray[index * 3 + 2] = point.z;

            const t = peakAtEnd ? index / (count - 1) : 1 - index / (count - 1);
            /* Entrada suave nos primeiros 45%: presença crescente próximo ao asteroide.
               Fade longo a partir de 65%: dissolve organicamente no espaço. */
            const rampIn = t < 0.45 ? (t / 0.45) * (t / 0.45) : 1;
            const fadeOut = t > 0.65 ? 1 - ((t - 0.65) / 0.35) * ((t - 0.65) / 0.35) : 1;
            const alpha = peakOpacity * rampIn * fadeOut;

            colorsArray[index * 4] = base.r;
            colorsArray[index * 4 + 1] = base.g;
            colorsArray[index * 4 + 2] = base.b;
            colorsArray[index * 4 + 3] = alpha;
        }

        return { positions: positionsArray, colors: colorsArray };
    }, [points, color, peakOpacity, peakAtEnd, exclusionRadius]);

    const count = positions.length / 3;

    const version = `${count}-${peakOpacity}`;

    return (
        <line key={version} renderOrder={2}>
            <bufferGeometry attach="geometry">
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 4]} />
            </bufferGeometry>
            <lineBasicMaterial vertexColors transparent depthWrite={false} depthTest />
        </line>
    );
}
