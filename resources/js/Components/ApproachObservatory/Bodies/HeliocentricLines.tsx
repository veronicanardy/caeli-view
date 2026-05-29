import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { sunEclipticDisplayPosition } from '@/lib/observatory/sunGeometry';

const ORBIT_LINE_SEGMENTS = 192;
const ORBIT_COLOR = '#ffcf6e';
const ORBIT_GUIDE_OPACITY = 0.3;
const DEFAULT_ORBIT_LINE_OPACITY = 0.85;

/**
 * Cria uma linha THREE a partir de pontos XYZ.
 *
 * Mantém frustumCulled desativado porque órbitas e guias podem ocupar áreas
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
 * Gera pontos de um círculo no plano XZ.
 *
 * Usado para guias orbitais simples em cenas onde o plano eclíptico foi
 * representado como XZ.
 */
function buildCircleXZPoints(radius: number, segments = ORBIT_LINE_SEGMENTS) {
    const points: number[] = [];

    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;

        points.push(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius,
        );
    }

    return new Float32Array(points);
}

/**
 * Gera um círculo orientado em torno de um centro, passando pela origem.
 *
 * Esse método é útil para guias visuais geocêntricos: o Sol exibido fica no
 * centro do círculo visual, e a Terra/origem fica sobre o anel.
 *
 * Importante: quando o centro vem de uma posição comprimida/logarítmica do Sol,
 * o círculo resultante também é visual, não uma órbita física em escala real.
 */
function buildDisplayedOrbitGuidePoints(center: THREE.Vector3, segments = ORBIT_LINE_SEGMENTS) {
    const radius = center.length();

    if (radius <= 0) {
        return new Float32Array();
    }

    const earthDirection = center.clone().multiplyScalar(-1).normalize();

    const tangent = new THREE.Vector3(
        -earthDirection.z,
        0,
        earthDirection.x,
    );

    if (tangent.lengthSq() === 0) {
        tangent.set(1, 0, 0);
    } else {
        tangent.normalize();
    }

    const points: number[] = [];

    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;

        const point = center.clone()
            .add(earthDirection.clone().multiplyScalar(Math.cos(angle) * radius))
            .add(tangent.clone().multiplyScalar(Math.sin(angle) * radius));

        points.push(point.x, point.y, point.z);
    }

    return new Float32Array(points);
}

/**
 * Anel de referência da órbita média da Terra a 1 UA na cena heliocêntrica.
 *
 * Este anel deve ser usado em cenas onde o Sol está na origem e as posições
 * heliocêntricas são renderizadas no plano eclíptico XZ.
 *
 * Observação: é uma referência circular de 1 UA, não a elipse real da órbita
 * terrestre. Para visualização, isso é aceitável porque a excentricidade da
 * Terra é pequena.
 */
export function EarthOrbitRingHelio() {
    const points = useMemo(() => {
        return buildCircleXZPoints(ORBIT_AU_SCALE);
    }, []);

    const lineObject = useMemo(() => {
        return createOrbitLine(points, ORBIT_COLOR, ORBIT_GUIDE_OPACITY);
    }, [points]);

    useEffect(() => {
        return () => disposeOrbitLine(lineObject);
    }, [lineObject]);

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
 * como a órbita de um asteroide.
 *
 * Este componente assume que os pontos já foram calculados no sistema de
 * coordenadas correto da cena.
 */
export function OrbitLineHelio({ points, color, opacity = DEFAULT_ORBIT_LINE_OPACITY }: OrbitLineHelioProps) {
    const lineObject = useMemo(() => {
        return createOrbitLine(points, color, opacity);
    }, [points, color, opacity]);

    useEffect(() => {
        return () => disposeOrbitLine(lineObject);
    }, [lineObject]);

    return <primitive object={lineObject} />;
}

interface DisplayedEarthOrbitGuideProps {
    sunDirection: [number, number, number];
}

/**
 * Guia visual da órbita aparente da Terra ao redor do Sol na cena geocêntrica.
 *
 * Importante: este anel não representa a órbita real em escala astronômica.
 * Ele usa a posição visual/comprimida do Sol na cena para desenhar uma referência
 * espacial coerente com o radar geocêntrico.
 *
 * Em outras palavras:
 * - o Sol exibido fica no centro do guia;
 * - a Terra/origem fica sobre o anel;
 * - o raio é a distância visual Sol -> Terra na cena, não 1 UA real.
 */
export function DisplayedEarthOrbitGuide({ sunDirection }: DisplayedEarthOrbitGuideProps) {
    const points = useMemo(() => {
        const displayedSunPosition = sunEclipticDisplayPosition(sunDirection);

        return buildDisplayedOrbitGuidePoints(displayedSunPosition);
    }, [sunDirection]);

    const lineObject = useMemo(() => {
        return createOrbitLine(points, ORBIT_COLOR, ORBIT_GUIDE_OPACITY);
    }, [points]);

    useEffect(() => {
        return () => disposeOrbitLine(lineObject);
    }, [lineObject]);

    if (points.length === 0) {
        return null;
    }

    return <primitive object={lineObject} />;
}
