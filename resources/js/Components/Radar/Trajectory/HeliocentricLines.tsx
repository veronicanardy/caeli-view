/**
 * Linhas e elipses heliocêntricas da visualização orbital.
 *
 * Responsabilidade: transformar pontos ou parâmetros simples já recebidos em
 * geometria THREE persistente, com cleanup dos recursos criados localmente.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildHeliocentricEllipse, ORBIT_ELLIPSE_SEGMENTS } from '@/lib/sceneEphemeris';
import { DEFAULT_ORBIT_LINE_OPACITY } from './trajectoryConstants';

/**
 * Utilitários visuais para linhas heliocêntricas já amostradas ou descritas por
 * parâmetros orbitais simples. Esta camada apenas monta geometrias de cena.
 */

/**
 * Cria uma linha THREE a partir de pontos XYZ.
 *
 * Mantém `frustumCulled` desativado porque órbitas e guias podem ocupar áreas
 * grandes da cena e não devem sumir agressivamente pelo frustum da câmera.
 */
function createOrbitLine(points: Float32Array, color: string, opacity: number) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = -1;

    return line;
}

function disposeOrbitLine(lineObject: THREE.Line) {
    lineObject.geometry.dispose();
    (lineObject.material as THREE.Material).dispose();
}

/**
 * Elipse orbital heliocêntrica planetária. A geometria 3D vive em buildHeliocentricEllipse
 * (sceneEphemeris) — a mesma fonte que posiciona o planeta, garantindo que ele caia sobre a
 * linha mesmo com a órbita inclinada. Este componente só monta a geometria THREE e o material.
 */
export function PlanetOrbitEllipseHelio({
    semiMajorAU,
    eccentricity,
    lonPerihelionDeg,
    inclinationDeg,
    lonAscNodeDeg,
    color,
    opacity,
}: {
    semiMajorAU: number;
    eccentricity: number;
    lonPerihelionDeg: number;
    inclinationDeg: number;
    lonAscNodeDeg: number;
    color: string;
    opacity: number;
}) {
    const points = useMemo(
        () => buildHeliocentricEllipse(semiMajorAU, eccentricity, lonPerihelionDeg, inclinationDeg, lonAscNodeDeg, ORBIT_ELLIPSE_SEGMENTS),
        [semiMajorAU, eccentricity, lonPerihelionDeg, inclinationDeg, lonAscNodeDeg],
    );
    const lineObject = useMemo(() => createOrbitLine(points, color, opacity), [points, color, opacity]);

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    return <primitive object={lineObject} />;
}

interface OrbitLineHelioProps {
    points: Float32Array;
    color: string;
    opacity?: number;
}

/**
 * Linha de órbita heliocêntrica genérica desenhada a partir de pontos XYZ.
 *
 * Usada pela cena heliocêntrica para renderizar trajetórias orbitais completas,
 * como a órbita de um asteroide. Os pontos já devem estar no sistema correto.
 */
export function OrbitLineHelio({ points, color, opacity = DEFAULT_ORBIT_LINE_OPACITY }: OrbitLineHelioProps) {
    const lineObject = useMemo(() => createOrbitLine(points, color, opacity), [points, color, opacity]);

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    return <primitive object={lineObject} />;
}
