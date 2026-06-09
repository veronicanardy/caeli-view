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
 * Arco curto de posições heliocentricas (UA) em torno de uma data âncora — `pastDays` antes até
 * `futureDays` depois, amostrado em `samples` pontos. Usa a mesma propagação de Kepler do helper
 * de posição única, então cada ponto está na órbita por construção.
 *
 * Usado para visualizar "para onde o objeto está se movendo em sua órbita nos próximos N dias"
 * na vista solar — semanticamente distinto da trajetória geocêntrica ±h do modo radar.
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
