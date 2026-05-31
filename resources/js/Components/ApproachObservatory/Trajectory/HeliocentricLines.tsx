import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';

const ORBIT_LINE_SEGMENTS = 192;
const DEFAULT_ORBIT_LINE_OPACITY = 0.85;

/**
 * Cria uma linha THREE a partir de pontos XYZ.
 *
 * Mantem frustumCulled desativado porque orbitas e guias podem ocupar areas
 * grandes da cena e nao devem sumir agressivamente pelo frustum da camera.
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
 * Elipse orbital heliocentrica no plano ecliptico.
 *
 * Constroi a elipse em coordenadas eclipticas (x, y) e depois converte para
 * coordenadas de cena (scene_x = ecl_x, scene_z = -ecl_y), o mesmo mapeamento
 * de helioToScene em sceneEphemeris. O Sol fica no foco (deslocamento c = a * e).
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

    for (let i = 0; i <= segments; i += 1) {
        const t = (i / segments) * Math.PI * 2;
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
 * Linha de orbita heliocentrica generica desenhada a partir de pontos XYZ.
 *
 * Usada pela cena heliocentrica para renderizar trajetorias orbitais completas,
 * como a orbita de um asteroide. Os pontos ja devem estar no sistema correto.
 */
export function OrbitLineHelio({ points, color, opacity = DEFAULT_ORBIT_LINE_OPACITY }: OrbitLineHelioProps) {
    const lineObject = useMemo(() => createOrbitLine(points, color, opacity), [points, color, opacity]);

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    return <primitive object={lineObject} />;
}
