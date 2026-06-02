/**
 * Linhas e elipses heliocêntricas da visualização orbital.
 *
 * Responsabilidade: transformar pontos ou parâmetros simples já recebidos em
 * geometria THREE persistente, com cleanup dos recursos criados localmente.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { DEFAULT_ORBIT_LINE_OPACITY, ORBIT_LINE_SEGMENTS } from './trajectoryConstants';

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
        depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;

    return line;
}

function disposeOrbitLine(lineObject: THREE.Line) {
    lineObject.geometry.dispose();
    (lineObject.material as THREE.Material).dispose();
}

/**
 * Elipse orbital heliocêntrica no plano eclíptico.
 *
 * Constrói a elipse em coordenadas eclípticas (x, y) e depois converte para
 * coordenadas de cena (scene_x = ecl_x, scene_z = -ecl_y), o mesmo mapeamento
 * de `helioToScene` em `sceneEphemeris`. O Sol fica no foco (deslocamento c = a * e).
 */
function buildEllipsePoints(
    semiMajorAU: number,
    eccentricity: number,
    lonPerihelionDeg: number,
    segments = ORBIT_LINE_SEGMENTS,
) {
    const a = semiMajorAU * ORBIT_AU_SCALE;
    const e = eccentricity;
    const b = a * Math.sqrt(Math.max(0, 1 - e * e));
    const c = a * e;
    const w = lonPerihelionDeg * Math.PI / 180;
    const cosW = Math.cos(w);
    const sinW = Math.sin(w);
    const points: number[] = [];

    for (let index = 0; index <= segments; index += 1) {
        const t = (index / segments) * Math.PI * 2;
        const xP = a * Math.cos(t) - c;
        const yP = b * Math.sin(t);
        const eclX = xP * cosW - yP * sinW;
        const eclY = xP * sinW + yP * cosW;

        points.push(eclX, 0, -eclY);
    }

    return new Float32Array(points);
}

export function PlanetOrbitEllipseHelio({
    semiMajorAU,
    eccentricity,
    lonPerihelionDeg,
    color,
    opacity,
}: {
    semiMajorAU: number;
    eccentricity: number;
    lonPerihelionDeg: number;
    color: string;
    opacity: number;
}) {
    const points = useMemo(
        () => buildEllipsePoints(semiMajorAU, eccentricity, lonPerihelionDeg),
        [semiMajorAU, eccentricity, lonPerihelionDeg],
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
