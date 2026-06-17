/**
 * Responsabilidade: efemérides leves para iluminação, posicionamento da Lua e das órbitas
 * planetárias na cena 3D do radar.
 *
 * Contrato de referencial:
 * - Astronomy Engine retorna dados do Sol/Lua em EQJ (equatorial J2000).
 * - Vetores de asteroides do JPL Horizons estão em coordenadas eclípticas J2000.
 * - A cena mapeia eclíptico (x, y, z) para Three.js (x, z, −y):
 *   X/Z eclíptico formam o plano do chão; norte eclíptico aponta para +Y da cena.
 */

import type * as Astronomy from 'astronomy-engine';
import { KM_PER_AU, LUNAR_DISTANCE_KM as KM_PER_LD } from '@/lib/physicalConstants';

/** 1 UA expresso em distâncias lunares (DL). 1 UA ≈ 389 DL. */
export const AU_IN_DL = KM_PER_AU / KM_PER_LD;

/**
 * Escala da régua ÚNICA do radar: quantas unidades de cena correspondem a 1 UA de distância
 * heliocêntrica real. Escala LINEAR, então o SHAPE da órbita é exato — o Sol no foco real da elipse,
 * excentricidade/periélio/afélio fiéis. Asteroides, Lua, planetas e Sol caem todos nesta régua; a
 * proximidade de uma aproximação é revelada por ZOOM de câmera, nunca distorcendo a escala.
 *
 * 300 dá aos NEOs bom respiro da Terra (≈ 2,4–6 unid), ao custo de empurrar cinturão/planetas mais
 * longe (Ceres a ~831 unid). Fonte ÚNICA da escala da cena: mudar aqui recalibra todos os corpos.
 */
export const LINEAR_AU_SCALE = 300;

/**
 * Número de segmentos da polilinha de cada elipse orbital. A posição do planeta é amostrada DESTA
 * mesma discretização (sampleHeliocentricEllipseAtNu), então este valor é a fonte única: mudar aqui
 * muda a linha E a posição juntas, e o planeta nunca sai da linha. Mantido aqui (não em
 * trajectoryConstants) para que a camada de física não dependa da camada de componentes.
 */
export const ORBIT_ELLIPSE_SEGMENTS = 192;

/**
 * @deprecated "1 UA em unidades de cena" — hoje é apenas um alias de LINEAR_AU_SCALE (a régua única).
 * Mantido enquanto os consumidores (fallback de Terra/Sol, thresholds de câmera) são migrados.
 */
export const SUN_DISPLAY_DL = LINEAR_AU_SCALE;

export type SceneEphemeris = {
    /** Vetor unitário apontando DA Terra PARA o Sol, nos eixos da cena. Usado como direção de luz. */
    sunDirection: [number, number, number];
    /** Posição do Sol em unidades de cena (1 unidade = 1 DL), limitada a uma distância de exibição finita. */
    sunScenePosition: [number, number, number];
    /** Posição da Lua em unidades de cena (1 unidade = 1 DL). Magnitude é aproximadamente 1. */
    moonScenePosition: [number, number, number];
    /**
     * Normal unitária do plano orbital real da Lua, nos eixos da cena (posição × velocidade). Define
     * a inclinação real da órbita lunar para que a linha de órbita desenhada não seja arbitrária.
     */
    moonOrbitNormal: [number, number, number];
    /** Distância geocêntrica da Lua em km. */
    moonDistanceKm: number;
    /** Fração iluminada do disco lunar, 0..1. */
    moonIlluminatedFraction: number;
    /**
     * Lat/lon geográfico onde o Sol está diretamente no zênite agora. O shader da Terra usa isso para
     * colocar os continentes corretos no lado iluminado.
     */
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    /**
     * Posição heliocêntrica da Terra em eclíptico J2000 (UA). Usada pelo modo órbita-solar para
     * desenhar a Terra em sua posição real na órbita de 1 UA (com excentricidade ~0,017 aplicada honestamente).
     */
    earthHelioPositionAU: { x: number; y: number; z: number };
    /** Posição heliocêntrica da Terra em unidades de cena (Sol na origem). Âncora para Lua, asteroides e visual da Terra. */
    earthScenePosition: [number, number, number];
    /**
     * Elementos osculadores da Terra derivados do state vector real (não fixados). i e Ω são ~0 por
     * definição do eclíptico, mas derivados, então a elipse desenhada e a posição amostrada usam
     * EXATAMENTE os mesmos elementos — a Terra cai sobre a própria linha como os demais planetas.
     */
    earthLonPerihelionDeg: number; earthInclinationDeg: number; earthLonAscNodeDeg: number; earthSemiMajorAU: number; earthEccentricity: number;
    /**
     * Posição heliocêntrica de Mercúrio em unidades de cena (Sol na origem, 1 UA = ORBIT_AU_SCALE).
     * Nulo até que a efeméride assíncrona seja resolvida.
     */
    mercuryScenePosition: [number, number, number]; mercuryLonPerihelionDeg: number; mercuryInclinationDeg: number; mercuryLonAscNodeDeg: number; mercurySemiMajorAU: number; mercuryEccentricity: number;
    venusScenePosition:   [number, number, number]; venusLonPerihelionDeg:   number; venusInclinationDeg:   number; venusLonAscNodeDeg:   number; venusSemiMajorAU:   number; venusEccentricity:   number;
    marsScenePosition:    [number, number, number]; marsLonPerihelionDeg:    number; marsInclinationDeg:    number; marsLonAscNodeDeg:    number; marsSemiMajorAU:    number; marsEccentricity:    number;
    jupiterScenePosition: [number, number, number]; jupiterLonPerihelionDeg: number; jupiterInclinationDeg: number; jupiterLonAscNodeDeg: number; jupiterSemiMajorAU: number; jupiterEccentricity: number;
    saturnScenePosition:  [number, number, number]; saturnLonPerihelionDeg:  number; saturnInclinationDeg:  number; saturnLonAscNodeDeg:  number; saturnSemiMajorAU:  number; saturnEccentricity:  number;
    uranusScenePosition:  [number, number, number]; uranusLonPerihelionDeg:  number; uranusInclinationDeg:  number; uranusLonAscNodeDeg:  number; uranusSemiMajorAU:  number; uranusEccentricity:  number;
    neptuneScenePosition: [number, number, number]; neptuneLonPerihelionDeg: number; neptuneInclinationDeg: number; neptuneLonAscNodeDeg: number; neptuneSemiMajorAU: number; neptuneEccentricity: number;
};

let modulePromise: Promise<typeof Astronomy> | null = null;
function loadAstronomy(): Promise<typeof Astronomy> {
    if (!modulePromise) modulePromise = import('astronomy-engine');
    return modulePromise;
}

/**
 * Matriz de rotação EQJ → eclíptico J2000. Constante (depende apenas de J2000), então é cacheada
 * uma vez por carga de módulo. Anteriormente era reconstruída a cada chamada de efeméride por frame.
 */
let cachedEqjToEcl: Astronomy.RotationMatrix | null = null;
function eqjToEclMatrix(A: typeof Astronomy): Astronomy.RotationMatrix {
    if (!cachedEqjToEcl) cachedEqjToEcl = A.Rotation_EQJ_ECL();
    return cachedEqjToEcl;
}

function eclToScene(x: number, y: number, z: number, unitsKmPerInput: number): [number, number, number] {
    return [
        (x * unitsKmPerInput) / KM_PER_LD,
        (z * unitsKmPerInput) / KM_PER_LD,
        (-y * unitsKmPerInput) / KM_PER_LD,
    ];
}

function eqjVectorToScene(
    A: typeof Astronomy,
    vec: Astronomy.Vector,
    unitsKmPerInput: number,
): [number, number, number] {
    const ecl = A.RotateVector(eqjToEclMatrix(A), vec);
    return eclToScene(ecl.x, ecl.y, ecl.z, unitsKmPerInput);
}

function eqjStateToScene(
    A: typeof Astronomy,
    state: Astronomy.StateVector,
): { position: [number, number, number]; velocity: [number, number, number] } {
    const ecl = A.RotateState(eqjToEclMatrix(A), state);
    return {
        position: eclToScene(ecl.x, ecl.y, ecl.z, KM_PER_AU),
        velocity: eclToScene(ecl.vx, ecl.vy, ecl.vz, KM_PER_AU),
    };
}

export async function computeSceneEphemeris(date: Date = new Date()): Promise<SceneEphemeris | null> {
    let A: typeof Astronomy;
    try {
        A = await loadAstronomy();
    } catch {
        return null;
    }

    try {
        const sunEqj = A.GeoVector(A.Body.Sun, date, false);
        const sunScene = eqjVectorToScene(A, sunEqj, KM_PER_AU);
        const sunLen = Math.hypot(sunScene[0], sunScene[1], sunScene[2]) || 1;
        const sunDirection: [number, number, number] = [
            sunScene[0] / sunLen,
            sunScene[1] / sunLen,
            sunScene[2] / sunLen,
        ];

        const sunScenePosition: [number, number, number] = [
            sunDirection[0] * SUN_DISPLAY_DL,
            sunDirection[1] * SUN_DISPLAY_DL,
            sunDirection[2] * SUN_DISPLAY_DL,
        ];

        const moonState = A.GeoMoonState(date);
        const moonScene = eqjStateToScene(A, moonState);
        const moonScenePosition = moonScene.position;
        const moonDistanceKm = Math.hypot(moonState.x, moonState.y, moonState.z) * KM_PER_AU;

        const p = moonScenePosition;
        const v = moonScene.velocity;
        let nx = p[1] * v[2] - p[2] * v[1];
        let ny = p[2] * v[0] - p[0] * v[2];
        let nz = p[0] * v[1] - p[1] * v[0];
        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;
        const moonOrbitNormal: [number, number, number] = [nx, ny, nz];

        let moonIlluminatedFraction = 0.5;
        try {
            moonIlluminatedFraction = A.Illumination(A.Body.Moon, date).phase_fraction;
        } catch {
            /* mantém o default */
        }

        const sunEqOfDate = A.Equator(A.Body.Sun, date, new A.Observer(0, 0, 0), true, false);
        const gastHours = A.SiderealTime(date);
        const subsolarLatDeg = sunEqOfDate.dec;
        let subsolarLonDeg = (sunEqOfDate.ra - gastHours) * 15.0;
        subsolarLonDeg = (((subsolarLonDeg + 180) % 360) + 360) % 360 - 180;

        // Posição heliocêntrica da Terra (UA, eclíptico J2000). Usada pela cena órbita-solar para
        // desenhar a Terra em sua posição orbital real com excentricidade honesta, não um círculo fixo de 1 UA.
        const earthHelioEqj = A.HelioVector(A.Body.Earth, date);
        const earthHelioEcl = A.RotateVector(eqjToEclMatrix(A), earthHelioEqj);
        const earthHelioPositionAU = { x: earthHelioEcl.x, y: earthHelioEcl.y, z: earthHelioEcl.z };

        // earthHelioPositionAU (acima) é o vetor heliocêntrico EXATO (HelioVector). É a âncora da Lua,
        // dos asteroides e do enquadramento de câmera, então preserva a posição astronômica fiel, sem
        // idealizar. A posição RENDERIZADA da Terra (earthScenePosition), porém, é amostrada na mesma
        // polilinha da sua elipse — ver planetData abaixo — para que a Terra caia exatamente sobre a
        // linha como todos os outros planetas. As duas diferem por ~0,02% (desvio de discretização),
        // irrelevante para direção de luz e enquadramento.

        // Para cada planeta E a Terra: posição de cena 3D + elementos osculadores completos (a, e, i, Ω, ω),
        // derivados dos vetores de estado heliocêntricos do astronomy-engine.
        //
        // FONTE ÚNICA DE GEOMETRIA: a posição do planeta E a elipse desenhada (buildHeliocentricEllipse)
        // passam ambas por ellipseVertexAtNu a partir dos MESMOS i, Ω, ω. A posição é amostrada na
        // polilinha (sampleHeliocentricEllipseAtNu), não na curva ideal, então cai exatamente sobre a
        // linha visível — sem dois modelos de elipse para conciliar, que era a causa de Mercúrio
        // (e alto), Urano e Netuno (longe) "saírem da linha".
        //
        // i (inclinação) e Ω (nó ascendente) vêm do vetor momento angular h = r × v:
        //   cos i = h_z / |h| ;  Ω = atan2(h_x, −h_y).
        // ω (argumento do periélio) e ν (anomalia verdadeira) vêm do vetor de excentricidade no
        // plano orbital. A altura eclíptica (z) é preservada na cena — inclinação real visível.
        //
        // ESTABILIDADE NUMÉRICA: os guardas (eccentricity || 1) e (hypot(nx,ny) || 1) impedem divisão
        // por zero quando e→0 (ω indefinido) ou i→0 (Ω indefinido). Nesses casos isolados a posição
        // permanece correta porque ν absorve a referência arbitrária de ω. ATENÇÃO: se e→0 E i→0
        // SIMULTANEAMENTE, ω e ν viram arbitrários de forma independente e a posição QUEBRA. Nenhum
        // corpo real chega nesse ponto (todos têm e ≳ 0,007 e i ≳ 0,8°), mas não alimente este caminho
        // com uma órbita perfeitamente circular e coplanar.
        function planetData(body: Astronomy.Body): {
            scenePosition: [number, number, number];
            lonPerihelionDeg: number;
            inclinationDeg: number;
            lonAscNodeDeg: number;
            semiMajorAU: number;
            eccentricity: number;
        } {
            const state = A.HelioState(body, date);
            const eclMatrix = eqjToEclMatrix(A);
            const eclPos = A.RotateVector(eclMatrix, new A.Vector(state.x, state.y, state.z, state.t));
            const eclVel = A.RotateVector(eclMatrix, new A.Vector(state.vx, state.vy, state.vz, state.t));

            // Elementos osculadores 3D completos (eclíptico J2000, UA / UA·dia⁻¹).
            const GM = 2.959122082855911e-4;
            const r3d = Math.hypot(eclPos.x, eclPos.y, eclPos.z);
            const v2 = eclVel.x ** 2 + eclVel.y ** 2 + eclVel.z ** 2;
            const semiMajorAU = 1 / (2 / r3d - v2 / GM);
            const rdotv = eclPos.x * eclVel.x + eclPos.y * eclVel.y + eclPos.z * eclVel.z;

            // Vetor de excentricidade 3D: aponta para o periélio, magnitude = e.
            const exv = (v2 / GM - 1 / r3d) * eclPos.x - (rdotv / GM) * eclVel.x;
            const eyv = (v2 / GM - 1 / r3d) * eclPos.y - (rdotv / GM) * eclVel.y;
            const ezv = (v2 / GM - 1 / r3d) * eclPos.z - (rdotv / GM) * eclVel.z;
            const eccentricity = Math.hypot(exv, eyv, ezv);

            // Momento angular h = r × v → inclinação i e nó ascendente Ω.
            const hx = eclPos.y * eclVel.z - eclPos.z * eclVel.y;
            const hy = eclPos.z * eclVel.x - eclPos.x * eclVel.z;
            const hz = eclPos.x * eclVel.y - eclPos.y * eclVel.x;
            const hLen = Math.hypot(hx, hy, hz) || 1;
            const inclinationRad = Math.acos(Math.min(1, Math.max(-1, hz / hLen)));
            // Nó ascendente: direção n = ẑ × h = (−h_y, h_x, 0).
            const lonAscNodeRad = Math.atan2(hx, -hy);

            // ω (argumento do periélio): ângulo do vetor de excentricidade medido a partir do nó
            // ascendente, dentro do plano orbital. Mede via cos (n·e) e sin (componente fora do nó).
            const nx = -hy;
            const ny = hx;
            const nLen = Math.hypot(nx, ny) || 1;
            const cosArgP = (nx * exv + ny * eyv) / (nLen * (eccentricity || 1));
            // sin: usa (n × e)·ĥ para o sinal correto (periélio acima/abaixo do nó).
            const nCrossE_z = nx * eyv - ny * exv; // componente z de n × e (n tem z=0)
            const sinArgP = (nCrossE_z * (hz / hLen)) / (nLen * (eccentricity || 1));
            const argPerihelionRad = Math.atan2(sinArgP, cosArgP);

            const inclinationDeg = inclinationRad * 180 / Math.PI;
            const lonAscNodeDeg = ((lonAscNodeRad * 180 / Math.PI) % 360 + 360) % 360;
            const argPerihelionDeg = ((argPerihelionRad * 180 / Math.PI) % 360 + 360) % 360;
            // Longitude do periélio ϖ = Ω + ω (mantida para a API existente / labels).
            const lonPerihelionDeg = (lonAscNodeDeg + argPerihelionDeg) % 360;

            // Anomalia verdadeira ν: ângulo r medido a partir do periélio, no plano orbital.
            const cosNu = (exv * eclPos.x + eyv * eclPos.y + ezv * eclPos.z) / ((eccentricity || 1) * r3d);
            const nuSignDot = rdotv; // r·v > 0 → afastando do periélio → ν ∈ (0, π)
            const nuRad = Math.atan2(nuSignDot >= 0 ? Math.sqrt(Math.max(0, 1 - cosNu * cosNu)) : -Math.sqrt(Math.max(0, 1 - cosNu * cosNu)), Math.min(1, Math.max(-1, cosNu)));

            // Posição AMOSTRADA NA MESMA POLILINHA desenhada (a corda entre vértices, não a curva
            // ideal), com o mesmo número de segmentos da elipse renderizada. Assim o planeta cai
            // exatamente sobre a linha visível, com desvio zero em qualquer distância — a correção
            // definitiva do sintoma "planeta passa pela linha" que reaparecia em Júpiter/Urano/Netuno.
            const geom: OrbitGeometry = { semiMajorAU, eccentricity, lonPerihelionDeg, inclinationDeg, lonAscNodeDeg };
            const scenePosition = sampleHeliocentricEllipseAtNu(geom, nuRad, ORBIT_ELLIPSE_SEGMENTS);

            return { scenePosition, lonPerihelionDeg, inclinationDeg, lonAscNodeDeg, semiMajorAU, eccentricity };
        }

        // Terra derivada como qualquer planeta: a, e, i, Ω, ν reais do state vector, posição amostrada
        // na polilinha. i e Ω da Terra são ~0 por definição do eclíptico (mas derivados, não fixados),
        // então a elipse fica praticamente no plano. earthHelioPositionAU acima permanece o vetor
        // exato (âncora); earthScenePosition aqui é a posição renderizada, sobre a linha.
        const earth = planetData(A.Body.Earth);
        const earthScenePosition = earth.scenePosition;
        const earthLonPerihelionDeg = earth.lonPerihelionDeg;

        const mercury = planetData(A.Body.Mercury);
        const venus    = planetData(A.Body.Venus);
        const mars     = planetData(A.Body.Mars);
        const jupiter  = planetData(A.Body.Jupiter);
        const saturn   = planetData(A.Body.Saturn);
        const uranus   = planetData(A.Body.Uranus);
        const neptune  = planetData(A.Body.Neptune);

        const mercuryScenePosition = mercury.scenePosition;
        const venusScenePosition   = venus.scenePosition;
        const marsScenePosition    = mars.scenePosition;
        const jupiterScenePosition = jupiter.scenePosition;
        const saturnScenePosition  = saturn.scenePosition;
        const uranusScenePosition  = uranus.scenePosition;
        const neptuneScenePosition = neptune.scenePosition;

        return {
            sunDirection,
            sunScenePosition,
            moonScenePosition,
            moonOrbitNormal,
            moonDistanceKm,
            moonIlluminatedFraction,
            subsolarLatDeg,
            subsolarLonDeg,
            earthHelioPositionAU,
            earthScenePosition,
            earthLonPerihelionDeg, earthInclinationDeg: earth.inclinationDeg, earthLonAscNodeDeg: earth.lonAscNodeDeg, earthSemiMajorAU: earth.semiMajorAU, earthEccentricity: earth.eccentricity,
            mercuryScenePosition, mercuryLonPerihelionDeg: mercury.lonPerihelionDeg, mercuryInclinationDeg: mercury.inclinationDeg, mercuryLonAscNodeDeg: mercury.lonAscNodeDeg, mercurySemiMajorAU: mercury.semiMajorAU, mercuryEccentricity: mercury.eccentricity,
            venusScenePosition,   venusLonPerihelionDeg:   venus.lonPerihelionDeg,   venusInclinationDeg:   venus.inclinationDeg,   venusLonAscNodeDeg:   venus.lonAscNodeDeg,   venusSemiMajorAU:   venus.semiMajorAU,   venusEccentricity:   venus.eccentricity,
            marsScenePosition,    marsLonPerihelionDeg:    mars.lonPerihelionDeg,    marsInclinationDeg:    mars.inclinationDeg,    marsLonAscNodeDeg:    mars.lonAscNodeDeg,    marsSemiMajorAU:    mars.semiMajorAU,    marsEccentricity:    mars.eccentricity,
            jupiterScenePosition, jupiterLonPerihelionDeg: jupiter.lonPerihelionDeg, jupiterInclinationDeg: jupiter.inclinationDeg, jupiterLonAscNodeDeg: jupiter.lonAscNodeDeg, jupiterSemiMajorAU: jupiter.semiMajorAU, jupiterEccentricity: jupiter.eccentricity,
            saturnScenePosition,  saturnLonPerihelionDeg:  saturn.lonPerihelionDeg,  saturnInclinationDeg:  saturn.inclinationDeg,  saturnLonAscNodeDeg:  saturn.lonAscNodeDeg,  saturnSemiMajorAU:  saturn.semiMajorAU,  saturnEccentricity:  saturn.eccentricity,
            uranusScenePosition,  uranusLonPerihelionDeg:  uranus.lonPerihelionDeg,  uranusInclinationDeg:  uranus.inclinationDeg,  uranusLonAscNodeDeg:  uranus.lonAscNodeDeg,  uranusSemiMajorAU:  uranus.semiMajorAU,  uranusEccentricity:  uranus.eccentricity,
            neptuneScenePosition, neptuneLonPerihelionDeg: neptune.lonPerihelionDeg, neptuneInclinationDeg: neptune.inclinationDeg, neptuneLonAscNodeDeg: neptune.lonAscNodeDeg, neptuneSemiMajorAU: neptune.semiMajorAU, neptuneEccentricity: neptune.eccentricity,
        };
    } catch {
        return null;
    }
}

/**
 * @deprecated Aliases da régua única (LINEAR_AU_SCALE), mantidos enquanto os consumidores são
 * migrados. ORBIT_AU_SCALE era a escala log-derivada (≈96) que a matemática gerava antes de ser
 * reescalada; agora a matemática já gera direto na régua única, então ambos valem LINEAR_AU_SCALE
 * e LINEAR_SCALE_FACTOR é 1 (sem reescalonamento).
 */
export const ORBIT_AU_SCALE = LINEAR_AU_SCALE;
export const LINEAR_SCALE_FACTOR = 1;

/**
 * Perifocal (x em direção ao periélio, y a +90° no sentido do movimento) → eclíptico heliocêntrico
 * J2000, ambos em UA. Função pura, compartilhada entre o construtor de curva orbital e o propagador
 * da equação de Kepler (lib/keplerOrbit) para que a elipse desenhada e o ponto "agora" do asteroide
 * usem orientação IDÊNTICA — sem chance de deriva entre os dois.
 *
 * Rotação é R_z(Ω) · R_x(i) · R_z(ω) aplicada a (xp, yp, 0).
 */
export function perifocalToEclipticAU(
    xp: number,
    yp: number,
    inDeg: number,
    omDeg: number,
    wDeg: number,
): { x: number; y: number; z: number } {
    const i = (inDeg * Math.PI) / 180;
    const om = (omDeg * Math.PI) / 180;
    const w = (wDeg * Math.PI) / 180;
    const cosO = Math.cos(om), sinO = Math.sin(om);
    const cosI = Math.cos(i), sinI = Math.sin(i);
    const cosW = Math.cos(w), sinW = Math.sin(w);

    const x = (cosO * cosW - sinO * sinW * cosI) * xp + (-cosO * sinW - sinO * cosW * cosI) * yp;
    const y = (sinO * cosW + cosO * sinW * cosI) * xp + (-sinO * sinW + cosO * cosW * cosI) * yp;
    const z = (sinW * sinI) * xp + (cosW * sinI) * yp;
    return { x, y, z };
}

/** Converte elementos com periélio (q, ω, Ω) na OrbitGeometry usada pela elipse (a, ϖ=Ω+ω). */
export function orbitGeometryFromElements(elements: {
    ec: number; qrAu: number; inDeg: number; omDeg: number; wDeg: number;
}): OrbitGeometry | null {
    const { ec, qrAu, inDeg, omDeg, wDeg } = elements;
    if (!Number.isFinite(ec) || ec < 0 || ec >= 1) return null;     // apenas órbitas ligadas
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;          // periélio válido
    if (!Number.isFinite(inDeg) || !Number.isFinite(omDeg) || !Number.isFinite(wDeg)) return null;
    return {
        semiMajorAU: qrAu / (1 - ec),
        eccentricity: ec,
        lonPerihelionDeg: omDeg + wDeg, // ϖ = Ω + ω
        inclinationDeg: inDeg,
        lonAscNodeDeg: omDeg,
    };
}

/**
 * Constrói a órbita heliocêntrica completa do asteroide como loop fechado no espaço de cena.
 * Delega a buildHeliocentricEllipse — a MESMA fonte de geometria dos planetas — para que asteroide,
 * planeta e a posição amostrada compartilhem um único gerador de vértice (ellipseVertexAtNu).
 * Assim a posição "agora" (sampleHeliocentricEllipseAtNu no ν atual) cai exatamente sobre esta
 * polilinha, com desvio zero em qualquer distância (afélio de cometa inclusive).
 */
export function buildHeliocentricOrbit(
    elements: { ec: number; qrAu: number; inDeg: number; omDeg: number; wDeg: number },
    segments = ORBIT_ELLIPSE_SEGMENTS,
): Float32Array | null {
    const g = orbitGeometryFromElements(elements);
    if (!g) return null;
    return buildHeliocentricEllipse(g.semiMajorAU, g.eccentricity, g.lonPerihelionDeg, g.inclinationDeg, g.lonAscNodeDeg, segments);
}

/**
 * Converte uma posição eclíptica heliocêntrica (UA, J2000) em unidades de cena, com o Sol na origem.
 * Convenção de eixos: eclíptico (x, y, z) → cena (x, z, −y).
 * Norte eclíptico (z > 0) aponta para +Y da cena; plano XZ da cena é o plano eclíptico.
 */
export function helioAUToSunCenteredScene(
    p: { x: number; y: number; z: number },
    scale: number = ORBIT_AU_SCALE,
): [number, number, number] {
    return [p.x * scale, p.z * scale, -p.y * scale];
}

export type OrbitGeometry = {
    semiMajorAU: number;
    eccentricity: number;
    /** Longitude do periélio ϖ = Ω + ω (graus). */
    lonPerihelionDeg: number;
    inclinationDeg: number;
    lonAscNodeDeg: number;
};

/**
 * Vértice EXATO da órbita na anomalia verdadeira ν, em unidades de cena. Único ponto onde a
 * geometria orbital vira coordenada de cena: tanto a polilinha desenhada quanto a amostragem da
 * posição do planeta passam por aqui, então não existe segunda fórmula que possa divergir.
 */
function ellipseVertexAtNu(g: OrbitGeometry, nu: number): [number, number, number] {
    const a = g.semiMajorAU;
    const e = g.eccentricity;
    const p = a * (1 - e * e);                       // semilatus rectum, UA
    const argPerihelionDeg = g.lonPerihelionDeg - g.lonAscNodeDeg; // ω = ϖ − Ω
    const r = p / (1 + e * Math.cos(nu));            // UA, medido a partir do foco (Sol)
    const ecl = perifocalToEclipticAU(r * Math.cos(nu), r * Math.sin(nu), g.inclinationDeg, g.lonAscNodeDeg, argPerihelionDeg);
    return [ecl.x * ORBIT_AU_SCALE, ecl.z * ORBIT_AU_SCALE, -ecl.y * ORBIT_AU_SCALE];
}

/**
 * Elipse orbital heliocêntrica 3D como loop fechado de pontos no espaço de cena (Sol na origem,
 * escala LINEAR em UA). Varre a anomalia verdadeira ν em `segments` passos uniformes.
 *
 * A inclinação é preservada (3D), o Sol fica no foco (r(ν) mede a partir do foco). Como
 * sampleHeliocentricEllipseAtNu amostra ESTA MESMA polilinha (a corda entre vértices, não a curva
 * ideal), o planeta cai EXATAMENTE sobre a linha desenhada — desvio zero em qualquer distância,
 * escala ou número de segmentos. Era a causa de Júpiter/Urano/Netuno "passarem pela linha":
 * a posição estava na curva contínua, a linha era um polígono, e a diferença crescia com o raio.
 *
 * Função pura (sem THREE/DOM) para ser testável diretamente. O componente de linha a consome.
 */
export function buildHeliocentricEllipse(
    semiMajorAU: number,
    eccentricity: number,
    lonPerihelionDeg: number,
    inclinationDeg: number,
    lonAscNodeDeg: number,
    segments = 192,
): Float32Array {
    const g: OrbitGeometry = { semiMajorAU, eccentricity, lonPerihelionDeg, inclinationDeg, lonAscNodeDeg };
    const out = new Float32Array((segments + 1) * 3);
    for (let index = 0; index <= segments; index += 1) {
        const v = ellipseVertexAtNu(g, (index / segments) * Math.PI * 2);
        const base = index * 3;
        out[base] = v[0];
        out[base + 1] = v[1];
        out[base + 2] = v[2];
    }
    return out;
}

/**
 * Ponto SOBRE A POLILINHA desenhada (não sobre a curva ideal) na anomalia verdadeira ν, com o mesmo
 * `segments` da elipse renderizada. Interpola linearmente na corda entre os dois vértices que cercam
 * ν — exatamente o que o renderizador de linha faz entre os pontos. Resultado: a posição do corpo
 * coincide com a aresta visível, com desvio zero independente da distância. É a forma mais forte da
 * "fonte única": não só a mesma fórmula, mas o mesmo polígono.
 */
export function sampleHeliocentricEllipseAtNu(g: OrbitGeometry, nu: number, segments = 192): [number, number, number] {
    const twoPi = Math.PI * 2;
    const norm = ((nu % twoPi) + twoPi) % twoPi;     // ν em [0, 2π)
    const f = (norm / twoPi) * segments;             // posição fracionária no anel de vértices
    const i0 = Math.floor(f);
    const t = f - i0;                                // fração dentro do segmento [i0, i0+1]
    const nu0 = (i0 / segments) * twoPi;
    const nu1 = ((i0 + 1) / segments) * twoPi;
    const a = ellipseVertexAtNu(g, nu0);
    const b = ellipseVertexAtNu(g, nu1);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
}

export { LUNAR_DISTANCE_KM as KM_PER_LD, KM_PER_AU } from '@/lib/physicalConstants';

/**
 * Verificações de autoconsistência científica. Matemática pura, determinística — chame do console de
 * dev ou de um harness de testes futuro. Lança na primeira falha para que o chamador saiba exatamente
 * qual invariante regrediu. Não exercita o astronomy-engine: essas verificações pertencem à cobertura
 * de integração de computeSceneEphemeris.
 */
export function runSceneEphemerisAssertions(): void {
    const approx = (actual: number, expected: number, tol: number, label: string): void => {
        if (!(Math.abs(actual - expected) <= tol)) {
            throw new Error(`[sceneEphemeris] ${label}: esperado ${expected} ± ${tol}, obtido ${actual}`);
        }
    };

    // Régua única: 1 UA cai exatamente em LINEAR_AU_SCALE unidades de cena.
    approx(SUN_DISPLAY_DL, LINEAR_AU_SCALE, 1e-9, '1 UA mapeia para LINEAR_AU_SCALE unidades');

    // Perifocal para eclíptico com i = Ω = ω = 0: periélio cai em +x eclíptico.
    const p = perifocalToEclipticAU(1, 0, 0, 0, 0);
    approx(p.x, 1, 1e-12, 'periélio em i=Ω=ω=0 mapeia para +x');
    approx(p.y, 0, 1e-12, 'periélio em i=Ω=ω=0 tem y=0');
    approx(p.z, 0, 1e-12, 'periélio em i=Ω=ω=0 tem z=0');

    // Inclinação de 90° empurra o eixo perifocal +y para fora do plano eclíptico (para +z eclíptico).
    const q = perifocalToEclipticAU(0, 1, 90, 0, 0);
    approx(q.x, 0, 1e-12, 'i=90, yp=1 tem x=0');
    approx(q.y, 0, 1e-12, 'i=90, yp=1 tem y=0');
    approx(q.z, 1, 1e-12, 'i=90, yp=1 mapeia para +z eclíptico');
}
