import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ORBIT_AU_SCALE, SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { sunEclipticDisplayPosition } from '@/lib/observatory/sunGeometry';

const ORBIT_LINE_SEGMENTS = 192;
const ORBIT_COLOR = '#5b9bd5';    // azul Terra — distingue a órbita da Terra dos outros anéis
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

/**
 * Semi-major axis de Mercúrio em AU. Fonte: IAU / NASA Planetary Fact Sheet.
 * Usado para escalar o anel heliocêntrico de Mercúrio na cena geocêntrica.
 */
const MERCURY_SEMI_MAJOR_AU = 0.387;

/**
 * Guia visual da órbita de Mercúrio ao redor do Sol na cena geocêntrica.
 *
 * O anel é centrado na posição visual do Sol (comprimida) e tem raio proporcional
 * à distância Sol→Mercúrio: MERCURY_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Isso preserva a proporção correta entre a órbita da Terra (raio = SUN_DISPLAY_DL)
 * e a de Mercúrio (raio = 0.387 × SUN_DISPLAY_DL) — Mercúrio claramente mais interno.
 *
 * Mais transparente que a Terra: é só contexto de sistema solar, não informação primária.
 */
export function DisplayedMercuryOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const mercuryOrbitRadius = MERCURY_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        // Anel centrado no Sol, raio = distância heliocêntrica de Mercúrio na escala visual.
        // Mesma construção do buildDisplayedOrbitGuidePoints mas com raio diferente.
        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * mercuryOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * mercuryOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#9aa0aa', 0.14),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}

/**
 * Semi-major axis de Vênus em AU. Fonte: IAU / NASA Planetary Fact Sheet.
 */
const VENUS_SEMI_MAJOR_AU = 0.723;

/**
 * Guia visual da órbita de Vênus ao redor do Sol na cena geocêntrica.
 *
 * Mesmo padrão do DisplayedMercuryOrbitGuide — anel centrado no Sol com
 * raio = VENUS_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Vênus fica entre Mercúrio e a Terra: anéis claramente aninhados.
 * Cor levemente âmbar para distinguir do anel prateado de Mercúrio e do azul da Terra.
 */
export function DisplayedVenusOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const venusOrbitRadius = VENUS_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * venusOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * venusOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#c8b870', 0.14),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}

const MARS_SEMI_MAJOR_AU = 1.524;

/**
 * Guia visual da órbita de Marte ao redor do Sol na cena geocêntrica.
 *
 * Mesmo padrão dos outros planetas — anel centrado no Sol com
 * raio = MARS_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Marte fica além da Terra, portanto o anel envolve todos os outros internos.
 * Cor vermelha-ferrugem para identidade clara com o Planeta Vermelho.
 */
export function DisplayedMarsOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const marsOrbitRadius = MARS_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * marsOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * marsOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#c0501a', 0.13),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}

/**
 * Semi-major axis de Urano em AU. Fonte: IAU / NASA Planetary Fact Sheet.
 */
const URANUS_SEMI_MAJOR_AU = 19.2184;

/**
 * Guia visual da órbita de Urano ao redor do Sol na cena geocêntrica.
 *
 * Mesmo padrão dos outros planetas — anel centrado no Sol com
 * raio = URANUS_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Urano fica além de Saturno — segundo anel mais externo.
 * Cor ciano-azulada para identidade com o metano atmosférico de Urano.
 * Opacidade muito baixa (0.07) pois é distante e serve apenas como moldura externa.
 */
export function DisplayedUranusOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const uranusOrbitRadius = URANUS_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * uranusOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * uranusOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#4ab8c8', 0.07),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}

/**
 * Semi-major axis de Netuno em AU. Fonte: IAU / NASA Planetary Fact Sheet.
 */
const NEPTUNE_SEMI_MAJOR_AU = 30.0699;

/**
 * Guia visual da órbita de Netuno ao redor do Sol na cena geocêntrica.
 *
 * Mesmo padrão dos outros planetas — anel centrado no Sol com
 * raio = NEPTUNE_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Netuno fica além de Urano — o anel mais externo de todos os planetas exibidos.
 * Cor azul-profunda para identidade com o azul intenso de Netuno.
 * Opacidade mínima (0.06) pois é o mais distante — moldura extrema do sistema.
 */
export function DisplayedNeptuneOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const neptuneOrbitRadius = NEPTUNE_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * neptuneOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * neptuneOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#2878d8', 0.06),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}

/**
 * Semi-major axis de Saturno em AU. Fonte: IAU / NASA Planetary Fact Sheet.
 */
const SATURN_SEMI_MAJOR_AU = 9.5392;

/**
 * Guia visual da órbita de Saturno ao redor do Sol na cena geocêntrica.
 *
 * Mesmo padrão dos outros planetas — anel centrado no Sol com
 * raio = SATURN_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Saturno fica além de Júpiter — o anel mais externo de todos os planetas exibidos.
 * Cor dourado-ocre para identidade com os anéis de Saturno.
 * Opacidade menor (0.09) pois é o mais distante e serve apenas como moldura extrema.
 */
export function DisplayedSaturnOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const saturnOrbitRadius = SATURN_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * saturnOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * saturnOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#c8a840', 0.09),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}

/**
 * Semi-major axis de Júpiter em AU. Fonte: IAU / NASA Planetary Fact Sheet.
 */
const JUPITER_SEMI_MAJOR_AU = 5.2028;

/**
 * Guia visual da órbita de Júpiter ao redor do Sol na cena geocêntrica.
 *
 * Mesmo padrão dos outros planetas — anel centrado no Sol com
 * raio = JUPITER_SEMI_MAJOR_AU × SUN_DISPLAY_DL.
 * Júpiter fica bem além de Marte — o anel mais externo e maior de todos os planetas exibidos.
 * Cor laranja-bege suave para identidade com as bandas de amônia do Gigante.
 * Opacidade ligeiramente menor (0.11) pois é o mais distante e serve apenas como moldura.
 */
export function DisplayedJupiterOrbitGuide({ sunDirection }: { sunDirection: [number, number, number] }) {
    const points = useMemo(() => {
        const sunPos = sunEclipticDisplayPosition(sunDirection);
        const jupiterOrbitRadius = JUPITER_SEMI_MAJOR_AU * SUN_DISPLAY_DL;

        const earthDir = sunPos.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x);
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        else tangent.normalize();

        const pts: number[] = [];
        for (let i = 0; i <= ORBIT_LINE_SEGMENTS; i += 1) {
            const a = (i / ORBIT_LINE_SEGMENTS) * Math.PI * 2;
            const pt = sunPos.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * jupiterOrbitRadius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * jupiterOrbitRadius));
            pts.push(pt.x, pt.y, pt.z);
        }
        return new Float32Array(pts);
    }, [sunDirection]);

    const lineObject = useMemo(
        () => createOrbitLine(points, '#c8a060', 0.11),
        [points],
    );

    useEffect(() => () => disposeOrbitLine(lineObject), [lineObject]);

    if (points.length === 0) return null;
    return <primitive object={lineObject} />;
}
