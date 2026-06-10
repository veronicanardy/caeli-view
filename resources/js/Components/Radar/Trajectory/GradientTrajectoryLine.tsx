/**
 * Linha de trajetória com gradiente de opacidade.
 *
 * Responsabilidade: converter pontos já calculados em geometria visual suave,
 * sem interpretar órbita, ranking ou fallback de dados.
 */

import { useEffect, useMemo } from 'react';
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
            const rampIn = 1;
            const nearRock = t > 0.99 ? 0 : t > 0.94 ? 1 - ((t - 0.94) / 0.05) * ((t - 0.94) / 0.05) : 1;
            const fadeOut = t > 0.99 ? 0 : 1;
            const alpha = peakOpacity * rampIn * fadeOut * nearRock;

            colorsArray[index * 4] = base.r;
            colorsArray[index * 4 + 1] = base.g;
            colorsArray[index * 4 + 2] = base.b;
            colorsArray[index * 4 + 3] = alpha;
        }

        return { positions: positionsArray, colors: colorsArray };
    }, [points, color, peakOpacity, peakAtEnd, exclusionRadius]);

    // Construída imperativamente e renderizada via <primitive>, como as demais linhas da cena
    // (ver HeliocentricLines). Evita o conflito de tipo entre o <line> do Three.js e o <line> SVG
    // do DOM em JSX, e centraliza o cleanup da geometria/material no unmount.
    const lineObject = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
        const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: true });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 2;
        return line;
    }, [positions, colors]);

    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return <primitive object={lineObject} />;
}
