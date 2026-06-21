/**
 * Responsabilidade: propagação orbital Kepleriana para posicionar um asteroide em seu ponto
 * instantâneo a partir dos elementos osculadores. Usado pelo modo "órbita solar" do radar 3D
 * para garantir que o asteroide renderizado caia EXATAMENTE sobre a elipse desenhada.
 *
 * Saídas em eclíptico J2000 (UA). A mesma rotação 3-1-3 de buildHeliocentricOrbit é aplicada
 * (via perifocalToEclipticAU compartilhado), eliminando qualquer deriva entre o ponto propagado
 * e a curva da órbita.
 */
import type { OrbitalElements } from '@/types';
import { perifocalToEclipticAU } from '@/lib/sceneEphemeris';
import { KM_PER_AU } from '@/lib/physicalConstants';

/**
 * Constante gravitacional gaussiana: k = √(GM_sol) em UA^1.5/dia. Expressar GM_sol assim evita
 * deriva de conversão de unidade entre km/s e UA/dia. n = k · a^(-3/2) dá o movimento médio em rad/dia.
 */
export const GAUSS_K = 0.01720209895;
export const GM_SUN_AU3_PER_DAY2 = GAUSS_K * GAUSS_K;

/** Data Juliana (UT) a partir de um JS Date. Exato para qualquer data após 1970 sem ramificações de calendário. */
export function julianDayUtc(date: Date): number {
    return date.getTime() / 86_400_000 + 2440587.5;
}

/**
 * Iteração de Newton em E − e·sin(E) = M. Seis iterações ficam abaixo do epsilon de máquina para
 * qualquer e < 1 retornado pelo Horizons (NEOs têm e ≲ 0,9). Semente em M, já no intervalo correto.
 */
export function solveKeplerEquation(meanAnomaly: number, eccentricity: number, iterations = 6): number {
    let E = meanAnomaly;
    for (let k = 0; k < iterations; k += 1) {
        const delta = (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
        E -= delta;
    }
    return E;
}

export type HelioPositionAU = { x: number; y: number; z: number };

export type OrbitFacts = {
    /** Distância ao Sol AGORA, em UA e km. */
    sunDistanceAu: number;
    sunDistanceKm: number;
    /** Periélio (ponto mais próximo do Sol), em UA e km. */
    perihelionAu: number;
    perihelionKm: number;
    /** Afélio (ponto mais distante do Sol), em UA e km. */
    aphelionAu: number;
    aphelionKm: number;
    /** Semi-eixo maior (UA). */
    semiMajorAu: number;
    /** Período orbital em anos (3ª lei de Kepler: P = a^1.5). */
    periodYears: number;
    /** Data ESTIMADA do próximo periélio (tpJd + k·período); null se faltar época. */
    nextPerihelion: Date | null;
};

/**
 * Fatos orbitais de QUALQUER objeto a partir dos elementos osculadores (não depende do Horizons ao vivo).
 * Serve à aba "Aproximação" de famosos e do feed: distância ao Sol agora, periélio/afélio, período e a
 * próxima passagem perto do Sol. Tudo em UA E km (km é a unidade principal do produto).
 *
 * Periélio = qrAu; semi-eixo a = qrAu/(1−e); afélio = a·(1+e). Período por Kepler: P[anos] = a[UA]^1.5
 * (vale para órbitas heliocêntricas). Próximo periélio: avança de tpJd em passos de um período até passar
 * de `date`. A estimativa do próximo periélio acumula erro em períodos longos (elementos fixos), então
 * convém exibir só o ano, como estimativa.
 */
export function orbitFactsFromElements(elements: OrbitalElements, date: Date = new Date()): OrbitFacts | null {
    const { ec, qrAu, tpJd } = elements;
    if (!Number.isFinite(ec) || !(ec >= 0 && ec < 1)) return null;
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;

    const helio = heliocentricPositionAU(elements, date);
    if (!helio) return null;

    const semiMajorAu = qrAu / (1 - ec);
    const perihelionAu = qrAu;
    const aphelionAu = semiMajorAu * (1 + ec);
    const sunDistanceAu = Math.hypot(helio.x, helio.y, helio.z);
    const periodYears = Math.pow(semiMajorAu, 1.5);

    // Próximo periélio só para períodos CURTOS (≤ 20 anos). Em órbitas longas, propagar muitos períodos
    // a partir de tpJd com período derivado de a^1.5 acumula anos de erro (ex.: Halley daria ~2064 vs 2061
    // real), então é mais honesto OMITIR do que mostrar uma data errada.
    let nextPerihelion: Date | null = null;
    if (Number.isFinite(tpJd) && tpJd !== 0 && periodYears <= 20) {
        const periodDays = periodYears * 365.25;
        const nowJd = julianDayUtc(date);
        const k = Math.ceil((nowJd - tpJd) / periodDays);
        nextPerihelion = new Date(((tpJd + k * periodDays) - 2440587.5) * 86_400_000);
    }

    return {
        sunDistanceAu,
        sunDistanceKm: sunDistanceAu * KM_PER_AU,
        perihelionAu,
        perihelionKm: perihelionAu * KM_PER_AU,
        aphelionAu,
        aphelionKm: aphelionAu * KM_PER_AU,
        semiMajorAu,
        periodYears,
        nextPerihelion,
    };
}

/**
 * Posição heliocêntrica eclíptico-J2000 (UA) de um objeto em `date`, a partir dos elementos osculadores.
 *
 * Retorna null quando os elementos não permitem ancorar uma posição no tempo:
 * órbita não-elíptica (e ≥ 1), periélio zero/negativo, tpJd ausente, etc.
 * A *forma* da órbita ainda pode ser desenhada nesses casos (ver buildHeliocentricOrbit),
 * mas recusamos inventar um ponto "agora" sem época de periélio.
 */
export function heliocentricPositionAU(
    elements: OrbitalElements,
    date: Date = new Date(),
): HelioPositionAU | null {
    const { ec, qrAu, inDeg, omDeg, wDeg, tpJd } = elements;
    if (!Number.isFinite(ec) || !(ec >= 0 && ec < 1)) return null;
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;
    if (!Number.isFinite(tpJd) || tpJd === 0) return null;

    const a = qrAu / (1 - ec);
    if (!(a > 0) || !Number.isFinite(a)) return null;

    const n = Math.sqrt(GM_SUN_AU3_PER_DAY2 / (a * a * a));
    const M = n * (julianDayUtc(date) - tpJd);
    const E = solveKeplerEquation(M, ec);

    // Referencial perifocal: x em direção ao periélio, y a +90° no sentido do movimento.
    const xp = a * (Math.cos(E) - ec);
    const yp = a * Math.sqrt(1 - ec * ec) * Math.sin(E);

    return perifocalToEclipticAU(xp, yp, inDeg, omDeg, wDeg);
}

/**
 * Anomalia verdadeira ν (rad, em [0, 2π)) do objeto em `date`. É o ângulo, medido a partir do
 * periélio, que indexa o ponto na órbita. Usada para amostrar a posição SOBRE A POLILINHA desenhada
 * (sampleHeliocentricEllipseAtNu), em vez de avaliar a curva ideal — assim o corpo cai exatamente
 * sobre a linha da órbita, com desvio zero em qualquer distância. Retorna null nos mesmos casos
 * degenerados de heliocentricPositionAU (sem época de periélio, hiperbólico, etc.).
 */
export function trueAnomalyNow(elements: OrbitalElements, date: Date = new Date()): number | null {
    const { ec, qrAu, tpJd } = elements;
    if (!Number.isFinite(ec) || !(ec >= 0 && ec < 1)) return null;
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;
    if (!Number.isFinite(tpJd) || tpJd === 0) return null;

    const a = qrAu / (1 - ec);
    if (!(a > 0) || !Number.isFinite(a)) return null;

    const n = Math.sqrt(GM_SUN_AU3_PER_DAY2 / (a * a * a));
    const M = n * (julianDayUtc(date) - tpJd);
    const E = solveKeplerEquation(M, ec);
    // ν a partir de E: tan(ν/2) = √((1+e)/(1−e))·tan(E/2). atan2 mantém o quadrante correto.
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + ec) * Math.sin(E / 2),
        Math.sqrt(1 - ec) * Math.cos(E / 2),
    );
    return ((nu % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

/**
 * Arco curto de posições heliocentricas (UA) em torno de uma data âncora — `pastDays` antes até
 * `futureDays` depois, amostrado em `samples` pontos. Usa a mesma propagação de Kepler do helper
 * de posição única, então cada ponto está na órbita por construção.
 *
 * Usado para visualizar "para onde o objeto está se movendo em sua órbita nos próximos N dias"
 * na vista solar — semanticamente distinto da trilha de trajetória ±h do modo radar.
 *
 * Retorna null quando os elementos não permitem ancorar posições no tempo.
 */
export function heliocentricArcAU(
    elements: OrbitalElements,
    anchor: Date = new Date(),
    pastDays = 30,
    futureDays = 60,
    samples = 96,
): HelioPositionAU[] | null {
    const { ec, qrAu, inDeg, omDeg, wDeg, tpJd } = elements;
    if (!Number.isFinite(ec) || !(ec >= 0 && ec < 1)) return null;
    if (!Number.isFinite(qrAu) || !(qrAu > 0)) return null;
    if (!Number.isFinite(tpJd) || tpJd === 0) return null;

    const a = qrAu / (1 - ec);
    if (!(a > 0) || !Number.isFinite(a)) return null;

    const n = Math.sqrt(GM_SUN_AU3_PER_DAY2 / (a * a * a));
    const sqrt1me2 = Math.sqrt(1 - ec * ec);
    const anchorJd = julianDayUtc(anchor);
    const totalDays = pastDays + futureDays;
    if (samples < 2 || totalDays <= 0) return null;

    const points: HelioPositionAU[] = [];
    for (let i = 0; i <= samples; i += 1) {
        const t = -pastDays + (totalDays * i) / samples;
        const M = n * (anchorJd + t - tpJd);
        const E = solveKeplerEquation(M, ec);
        const xp = a * (Math.cos(E) - ec);
        const yp = a * sqrt1me2 * Math.sin(E);
        points.push(perifocalToEclipticAU(xp, yp, inDeg, omDeg, wDeg));
    }
    return points;
}

/**
 * Verificações de autoconsistência científica da camada Kepler. Matemática pura, sem I/O.
 * Lança na primeira falha. A promessa do modo orbital é que o asteroide propagado está NA
 * elipse desenhada — essas verificações garantem isso, além de rejeitar entradas não-elípticas
 * e realizar um teste de sanidade do periélio.
 */
export function runKeplerOrbitAssertions(): void {
    const approx = (actual: number, expected: number, tol: number, label: string): void => {
        if (!(Math.abs(actual - expected) <= tol)) {
            throw new Error(`[keplerOrbit] ${label}: esperado ${expected} ± ${tol}, obtido ${actual}`);
        }
    };

    // O método de Newton em E - e·sin(E) = M converge para um ponto fixo: f(E) - M ≈ 0.
    const E1 = solveKeplerEquation(1.2, 0.5);
    approx(E1 - 0.5 * Math.sin(E1) - 1.2, 0, 1e-12, 'resíduo da equação de Kepler @ M=1.2, e=0.5');

    const E2 = solveKeplerEquation(0.1, 0.9);
    approx(E2 - 0.9 * Math.sin(E2) - 0.1, 0, 1e-12, 'resíduo da equação de Kepler @ M=0.1, e=0.9');

    // No periélio (M = 0 → E = 0) o raio heliocêntrico é igual a q.
    const tpJd = julianDayUtc(new Date());
    const els = { ec: 0.5, qrAu: 1.0, inDeg: 0, omDeg: 0, wDeg: 0, tpJd, epochJd: tpJd } as OrbitalElements;
    const p = heliocentricPositionAU(els, new Date());
    if (!p) throw new Error('[keplerOrbit] sanidade do periélio retornou null');
    approx(Math.hypot(p.x, p.y, p.z), 1.0, 1e-9, 'asteroide em M=0 está no raio do periélio q');

    // Órbitas hiperbólicas (e ≥ 1) são rejeitadas — recusamos propagar trajetórias não ligadas.
    const hyp = { ec: 1.2, qrAu: 1, inDeg: 0, omDeg: 0, wDeg: 0, tpJd, epochJd: tpJd } as OrbitalElements;
    if (heliocentricPositionAU(hyp, new Date()) !== null) {
        throw new Error('[keplerOrbit] deve rejeitar hiperbólico e ≥ 1');
    }

    // Periélio zero é rejeitado.
    const degenerate = { ec: 0.5, qrAu: 0, inDeg: 0, omDeg: 0, wDeg: 0, tpJd, epochJd: tpJd } as OrbitalElements;
    if (heliocentricPositionAU(degenerate, new Date()) !== null) {
        throw new Error('[keplerOrbit] deve rejeitar q ≤ 0');
    }

    // Época de periélio ausente (tpJd = 0) é rejeitada — nunca inventamos uma posição.
    const noTp = { ec: 0.5, qrAu: 1, inDeg: 0, omDeg: 0, wDeg: 0, tpJd: 0, epochJd: 0 } as OrbitalElements;
    if (heliocentricPositionAU(noTp, new Date()) !== null) {
        throw new Error('[keplerOrbit] deve rejeitar tpJd = 0');
    }
}
