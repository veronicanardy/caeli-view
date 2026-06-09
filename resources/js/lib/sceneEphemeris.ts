/**
 * Responsabilidade: efemérides leves para iluminação, posicionamento da Lua e das órbitas
 * planetárias na cena 3D do radar.
 *
 * Contrato de referencial (consistente com horizonsToScene em lib/radar/coordinates.ts):
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
 * Compressão logarítmica radial — A ÚNICA regra de escala de toda a cena.
 *
 * Uma escala puramente linear (1 DL = 1 unidade) é honesta mas inutilizável: 1 UA = 389 DL, então
 * o Sol ficaria a ~389 unidades da Terra enquanto a Lua estaria em 1, uma dispersão impossível de
 * visualizar ao mesmo tempo. Em vez disso, comprimimos a DISTÂNCIA radial via logaritmo, exatamente
 * como em um diagrama astronômico em escala log:
 *
 *     r_cena = K · ln(1 + r_dl / R0)
 *
 * Propriedades que mantêm isso cientificamente defensável:
 *  - Estritamente monotônico: uma distância real maior sempre mapeia para uma distância de cena
 *    maior — nada próximo/distante inverte a ordem.
 *  - Preserva direção: apenas a magnitude é comprimida; mantemos o vetor unitário, então ângulos,
 *    inclinação orbital e a forma de cada trajetória são não distorcidos (Z nunca é achatado em
 *    relação a X/Y — a promessa central da cena 3D).
 *  - Quase linear próximo à Terra: para r ≪ R0 a curva é ≈ r·K/R0, então a vizinhança
 *    Terra–Lua–asteroide próximo fica quase fiel à escala; o log só "dobra" o enorme vazio até o Sol.
 *
 * R0 é a distância de transição (DL) abaixo da qual o mapeamento é ~linear. K é fixo para que a
 * Lua (1 DL) caia exatamente em 1 unidade de cena. Com R0 = 8, o Sol (389 DL) fica a ~33 unidades:
 * claramente mais longe que todo o resto, mas ainda na tela junto com a Lua.
 */
const COMPRESS_R0_DL = 8;
const COMPRESS_K = 1 / Math.log(1 + 1 / COMPRESS_R0_DL);

/** Comprime uma distância radial em DL para unidades de cena via a regra logarítmica acima. */
export function compressDistanceDl(rDl: number): number {
    if (rDl <= 0) return 0;
    return COMPRESS_K * Math.log(1 + rDl / COMPRESS_R0_DL);
}

/**
 * Aplica a compressão logarítmica radial a um vetor de eixo de cena expresso em DL LINEARES
 * (1 unidade = 1 DL). Preserva a direção, reescalona a magnitude. Este é o único funil pelo qual
 * toda distância passa: a Lua, os vetores de asteroides do Horizons e os pontos de órbita heliocêntrica.
 */
export function compressSceneVector(v: [number, number, number]): [number, number, number] {
    const r = Math.hypot(v[0], v[1], v[2]);
    if (r < 1e-9) return [0, 0, 0];
    const s = compressDistanceDl(r) / r;
    return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Onde o marcador do Sol é desenhado, em unidades de cena: sua distância real de 1 UA passa pela
 * mesma compressão logarítmica de tudo o mais. Derivado, não escolhido à mão, para que o gap
 * Terra→Sol permaneça honesto em ORDEM em relação ao gap Terra→Lua (apenas comprimido, nunca reordenado).
 */
export const SUN_DISPLAY_DL = compressDistanceDl(AU_IN_DL);

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
    /** Longitude do periélio da Terra derivada da posição real (graus). Usada para a elipse de órbita terrestre. */
    earthLonPerihelionDeg: number;
    /**
     * Posição heliocêntrica de Mercúrio em unidades de cena (Sol na origem, 1 UA = ORBIT_AU_SCALE).
     * Nulo até que a efeméride assíncrona seja resolvida.
     */
    mercuryScenePosition: [number, number, number]; mercuryLonPerihelionDeg: number; mercurySemiMajorAU: number; mercuryEccentricity: number;
    venusScenePosition:   [number, number, number]; venusLonPerihelionDeg:   number; venusSemiMajorAU:   number; venusEccentricity:   number;
    marsScenePosition:    [number, number, number]; marsLonPerihelionDeg:    number; marsSemiMajorAU:    number; marsEccentricity:    number;
    jupiterScenePosition: [number, number, number]; jupiterLonPerihelionDeg: number; jupiterSemiMajorAU: number; jupiterEccentricity: number;
    saturnScenePosition:  [number, number, number]; saturnLonPerihelionDeg:  number; saturnSemiMajorAU:  number; saturnEccentricity:  number;
    uranusScenePosition:  [number, number, number]; uranusLonPerihelionDeg:  number; uranusSemiMajorAU:  number; uranusEccentricity:  number;
    neptuneScenePosition: [number, number, number]; neptuneLonPerihelionDeg: number; neptuneSemiMajorAU: number; neptuneEccentricity: number;
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

        // Terra: posição heliocêntrica real — âncora dos asteroides e da Lua.
        // Todos os planetas e a Terra: posição heliocêntrica real no plano eclíptico.
        // ecl.x → scene X, -ecl.y → scene Z (orientação anti-horária), Y=0 (plano flat).
        function helioToScene(ecl: { x: number; y: number; z: number }): [number, number, number] {
            return [ecl.x * ORBIT_AU_SCALE, 0, -ecl.y * ORBIT_AU_SCALE];
        }

        const earthScenePosition = helioToScene(earthHelioPositionAU);
        // Longitude do periélio da Terra J2000 (Ω + ω) — elemento orbital estável.
        const earthLonPerihelionDeg = 102.94;

        // Para cada planeta: posição de cena + longitude do periélio derivada da efeméride.
        //
        // A elipse é desenhada no plano eclíptico com buildEllipsePoints, que usa:
        //   periélio em (a-c)*cos(w), (a-c)*sin(w)  — i.e. o ângulo no plano eclíptico x/y
        //
        // A posição na cena vem de helioToScene: (ecl.x * scale, 0, -ecl.y * scale).
        // O ângulo no plano da cena é portanto atan2(ecl.y, ecl.x) — mesmo frame que a elipse.
        //
        // Para que o ponto caia na elipse:
        //   rProj = sqrt(ecl.x² + ecl.y²)   — distância no plano (ignora ecl.z = inclinação)
        //   ν calculado de rProj = a(1-e²)/(1+e·cosν)
        //   sinal de ν pelo produto cruzado (ecl.x·vEclY - ecl.y·vEclX) > 0 → ν positivo
        //   lonPerihelion = atan2(ecl.y, ecl.x) - ν
        //
        // Para e < 0.02 (Vênus, Netuno): a elipse é visualmente um círculo perfeito.
        // Nesse caso a distância real oscila só ±0.3% em torno de 'a', então definir
        // lonPerihelion = atan2(ecl.y, ecl.x) (ν=0) coloca o planeta exatamente no periélio
        // da elipse, que tem raio 'a*(1-e) ≈ a'. O desvio visual é < 1px em qualquer zoom.
        function planetData(body: Astronomy.Body): {
            scenePosition: [number, number, number];
            lonPerihelionDeg: number;
            semiMajorAU: number;
            eccentricity: number;
        } {
            const state = A.HelioState(body, date);
            const eclMatrix = eqjToEclMatrix(A);
            const eclPos = A.RotateVector(eclMatrix, new A.Vector(state.x, state.y, state.z, state.t));
            const eclVel = A.RotateVector(eclMatrix, new A.Vector(state.vx, state.vy, state.vz, state.t));

            // Elementos osculadores — todos no plano eclíptico (x,y), consistente com a elipse desenhada.
            const GM = 2.959122082855911e-4;
            const r3d = Math.hypot(eclPos.x, eclPos.y, eclPos.z);
            const v2 = eclVel.x ** 2 + eclVel.y ** 2 + eclVel.z ** 2;
            const semiMajorAU = 1 / (2 / r3d - v2 / GM);
            const rdotv = eclPos.x * eclVel.x + eclPos.y * eclVel.y + eclPos.z * eclVel.z;
            // Vetor de excentricidade projetado no plano — define ângulo e magnitude do periélio visual.
            const ex = (v2 / GM - 1 / r3d) * eclPos.x - (rdotv / GM) * eclVel.x;
            const ey = (v2 / GM - 1 / r3d) * eclPos.y - (rdotv / GM) * eclVel.y;
            const eccentricity = Math.hypot(ex, ey);

            // lonPerihelionDeg: ângulo do periélio no plano — direto do vetor de excentricidade.
            const perihelionRad = Math.atan2(ey, ex);
            const lonPerihelionDeg = perihelionRad * 180 / Math.PI;

            // Posição do planeta: ângulo planar real + raio da elipse r(ν) — alinha planeta e elipse.
            const planeAngleRad = Math.atan2(eclPos.y, eclPos.x);
            const nuRad = planeAngleRad - perihelionRad;
            const p = semiMajorAU * (1 - eccentricity * eccentricity);
            const rEllipse = p / (1 + eccentricity * Math.cos(nuRad));
            const scenePosition: [number, number, number] = [
                Math.cos(planeAngleRad) * rEllipse * ORBIT_AU_SCALE,
                0,
                -Math.sin(planeAngleRad) * rEllipse * ORBIT_AU_SCALE,
            ];

            return { scenePosition, lonPerihelionDeg, semiMajorAU, eccentricity };
        }

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
            earthLonPerihelionDeg,
            mercuryScenePosition, mercuryLonPerihelionDeg: mercury.lonPerihelionDeg, mercurySemiMajorAU: mercury.semiMajorAU, mercuryEccentricity: mercury.eccentricity,
            venusScenePosition,   venusLonPerihelionDeg:   venus.lonPerihelionDeg,   venusSemiMajorAU:   venus.semiMajorAU,   venusEccentricity:   venus.eccentricity,
            marsScenePosition,    marsLonPerihelionDeg:    mars.lonPerihelionDeg,    marsSemiMajorAU:    mars.semiMajorAU,    marsEccentricity:    mars.eccentricity,
            jupiterScenePosition, jupiterLonPerihelionDeg: jupiter.lonPerihelionDeg, jupiterSemiMajorAU: jupiter.semiMajorAU, jupiterEccentricity: jupiter.eccentricity,
            saturnScenePosition,  saturnLonPerihelionDeg:  saturn.lonPerihelionDeg,  saturnSemiMajorAU:  saturn.semiMajorAU,  saturnEccentricity:  saturn.eccentricity,
            uranusScenePosition,  uranusLonPerihelionDeg:  uranus.lonPerihelionDeg,  uranusSemiMajorAU:  uranus.semiMajorAU,  uranusEccentricity:  uranus.eccentricity,
            neptuneScenePosition, neptuneLonPerihelionDeg: neptune.lonPerihelionDeg, neptuneSemiMajorAU: neptune.semiMajorAU, neptuneEccentricity: neptune.eccentricity,
        };
    } catch {
        return null;
    }
}

/**
 * Escala linear UA da camada heliocêntrica: quantas unidades de cena correspondem a 1 UA de distância
 * heliocêntrica real. Definida igual a SUN_DISPLAY_DL para que 1 UA (distância Terra–Sol) caia
 * exatamente sobre o Sol desenhado — ou seja, a referência de órbita de 1 UA fecha de volta na Terra
 * na origem.
 *
 * Crucialmente esta é uma escala LINEAR, então o SHAPE da órbita é exato: o Sol está no foco real da
 * elipse, excentricidade/periélio/afélio são todos fiéis. A camada geocêntrica próxima à Terra
 * (Lua, asteroides próximos) é a que usa a compressão log — as duas camadas se encontram no Sol.
 */
export const ORBIT_AU_SCALE = SUN_DISPLAY_DL;

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

/**
 * Constrói a órbita heliocêntrica completa do asteroide como um loop fechado de pontos no espaço de
 * cena, com o Sol na origem e escala LINEAR em UA (1 UA = ORBIT_AU_SCALE unidades). Fiel à forma:
 * excentricidade, periélio e orientação orbital são exatos — sem distorção logarítmica da curva.
 *
 * Usado na cena órbita-solar junto com o propagador de Kepler de lib/keplerOrbit. Como ambos
 * compartilham perifocalToEclipticAU abaixo, o ponto propagado "agora" cai NA elipse desenhada por construção.
 */
export function buildHeliocentricOrbit(
    elements: {
        ec: number;
        qrAu: number;
        inDeg: number;
        omDeg: number;
        wDeg: number;
    },
    segments = 256,
): Float32Array | null {
    const { ec, qrAu, inDeg, omDeg, wDeg } = elements;
    if (!Number.isFinite(ec) || ec < 0 || ec >= 1) return null;     // apenas órbitas ligadas
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;          // periélio válido
    if (!Number.isFinite(inDeg) || !Number.isFinite(omDeg) || !Number.isFinite(wDeg)) return null;

    const a = qrAu / (1 - ec);          // semieixo maior, UA
    const p = a * (1 - ec * ec);        // semilatus rectum, UA

    const out: number[] = [];
    for (let s = 0; s <= segments; s += 1) {
        const nu = (s / segments) * Math.PI * 2; // anomalia verdadeira
        const r = p / (1 + ec * Math.cos(nu));   // UA
        const xp = r * Math.cos(nu);
        const yp = r * Math.sin(nu);

        const ecl = perifocalToEclipticAU(xp, yp, inDeg, omDeg, wDeg);

        // UA → cena (LINEAR, forma exata); eclíptico (x, y, z) → cena (x, z, −y).
        out.push(
            ecl.x * ORBIT_AU_SCALE,
            ecl.z * ORBIT_AU_SCALE,
            -ecl.y * ORBIT_AU_SCALE,
        );
    }
    return new Float32Array(out);
}

/**
 * Converte uma posição eclíptica heliocêntrica (UA, J2000) em unidades de cena, com o Sol na origem.
 * Convenção consistente com o modo geocêntrico: eclíptico (x, y, z) → cena (x, z, −y).
 * Norte eclíptico (z > 0) aponta para +Y da cena; plano XZ da cena é o plano eclíptico.
 */
export function helioAUToSunCenteredScene(p: { x: number; y: number; z: number }): [number, number, number] {
    return [p.x * ORBIT_AU_SCALE, p.z * ORBIT_AU_SCALE, -p.y * ORBIT_AU_SCALE];
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

    // A Lua (1 DL) cai exatamente em 1 unidade de cena por construção de COMPRESS_K.
    approx(compressDistanceDl(1), 1, 1e-9, 'Lua em 1 DL → 1 unidade de cena');

    // A compressão é estritamente monotônica em (0, ∞) — meia distância é mais próxima que a distância inteira.
    if (!(compressDistanceDl(0.5) < compressDistanceDl(1))) {
        throw new Error('[sceneEphemeris] compressão deve ser monotônica');
    }
    if (!(compressDistanceDl(10) < compressDistanceDl(100))) {
        throw new Error('[sceneEphemeris] compressão deve ser monotônica em raios maiores');
    }

    // A compressão preserva a direção (apenas a magnitude é reescalonada).
    const v: [number, number, number] = [10, 5, 2];
    const c = compressSceneVector(v);
    const r0 = Math.hypot(...v);
    const r1 = Math.hypot(...c);
    approx(c[0] / r1, v[0] / r0, 1e-12, 'compressão preserva direção x');
    approx(c[1] / r1, v[1] / r0, 1e-12, 'compressão preserva direção y');
    approx(c[2] / r1, v[2] / r0, 1e-12, 'compressão preserva direção z');

    // 1 UA deve dobrar para uma distância de cena claramente maior que a Lua, mas não absurdamente.
    if (!(SUN_DISPLAY_DL > 20 && SUN_DISPLAY_DL < 60)) {
        throw new Error(`[sceneEphemeris] SUN_DISPLAY_DL fora da faixa esperada: ${SUN_DISPLAY_DL}`);
    }

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
