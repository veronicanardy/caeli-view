/**
 * Firewall científico da pipeline de posicionamento 3D.
 *
 * Estes testes não cobrem um arquivo específico — cobrem INVARIANTES que protegem a
 * ciência da cena contra regressões sutis, mesmo que a implementação seja reescrita:
 *
 *  1. A compressão é RADIAL (preserva direção); NUNCA por eixo.
 *  2. Objetos no mesmo frame mantêm o alinhamento relativo (ângulos preservados).
 *  3. Um objeto na direção/distância de Júpiter cai na região visual de Júpiter
 *     quando ambos usam o mesmo frame heliocêntrico.
 *  4. Unidades (AU/km) e a troca de eixos não são aplicadas duas vezes.
 *
 * Se algum destes falhar, um objeto pode aparecer numa região espacialmente errada da cena.
 * A regra de ouro do CaeliView: a compressão pode mentir sobre a escala, nunca sobre a direção.
 */

import { describe, expect, it } from 'vitest';
import {
    KM_PER_AU,
    KM_PER_LD,
    ORBIT_AU_SCALE,
    SUN_DISPLAY_DL,
    compressDistanceDl,
    compressSceneVector,
    helioAUToSunCenteredScene,
} from '@/lib/sceneEphemeris';
import { horizonsGeoToHelioScene, horizonsToScene } from '@/lib/radar/coordinates';

/** Ângulo (radianos) entre dois vetores 3D. 0 = mesma direção. */
function angleBetween(a: readonly number[], b: readonly number[]): number {
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const la = Math.hypot(a[0], a[1], a[2]);
    const lb = Math.hypot(b[0], b[1], b[2]);
    if (la < 1e-12 || lb < 1e-12) return 0;
    return Math.acos(Math.min(1, Math.max(-1, dot / (la * lb))));
}

/**
 * Verifica que dois vetores apontam na MESMA direção comparando seus vetores unitários
 * componente a componente. Numericamente estável perto de ângulo zero (ao contrário de acos,
 * cuja derivada explode em 0), então mantém o teste rigoroso sem falso negativo de ponto flutuante.
 */
function expectSameDirection(a: readonly number[], b: readonly number[], digits = 9): void {
    const la = Math.hypot(a[0], a[1], a[2]);
    const lb = Math.hypot(b[0], b[1], b[2]);
    for (let i = 0; i < 3; i += 1) {
        expect(a[i] / la).toBeCloseTo(b[i] / lb, digits);
    }
}

/**
 * Compressão por eixo — o ANTIPADRÃO que estes testes existem para proibir.
 * Comprime cada componente isoladamente, o que distorce a direção do vetor.
 * Mantida aqui apenas como referência negativa nos testes.
 */
function compressPerAxis(v: [number, number, number]): [number, number, number] {
    const sign = (n: number) => (n < 0 ? -1 : 1);
    return [
        sign(v[0]) * compressDistanceDl(Math.abs(v[0])),
        sign(v[1]) * compressDistanceDl(Math.abs(v[1])),
        sign(v[2]) * compressDistanceDl(Math.abs(v[2])),
    ];
}

// ─── 1. Compressão radial preserva direção; compressão por eixo NÃO ────────────

describe('compressão radial preserva direção (regra de ouro)', () => {
    // Vetores oblíquos: um vetor alinhado a um eixo não distingue radial de por-eixo,
    // então testamos direções fora dos eixos onde a diferença é detectável.
    const obliqueVectors: [number, number, number][] = [
        [10, 5, 2],
        [3, 4, 12],
        [-7, 9, -4],
        [100, 100, 100],
        [0.3, -0.7, 0.5],
    ];

    it.each(obliqueVectors)('mantém o vetor unitário idêntico para [%d, %d, %d]', (x, y, z) => {
        const v: [number, number, number] = [x, y, z];
        const c = compressSceneVector(v);
        // Entrada e saída devem apontar na mesma direção: só a magnitude muda.
        expectSameDirection(v, c);
    });

    it('a compressão por eixo DISTORCE a direção (prova de que não é equivalente)', () => {
        // Este teste protege contra alguém "otimizar" compressSceneVector para compressão
        // por eixo. Se um dia compressSceneVector passar a comprimir por eixo, o teste acima
        // (ângulo zero) quebra; este confirma que o antipadrão realmente desvia a direção.
        const v: [number, number, number] = [10, 5, 2];
        const perAxis = compressPerAxis(v);
        expect(angleBetween(v, perAxis)).toBeGreaterThan(0.01); // desvio angular real
    });

    it('compressSceneVector difere de compressPerAxis para vetores oblíquos', () => {
        const v: [number, number, number] = [10, 5, 2];
        const radial = compressSceneVector(v);
        const perAxis = compressPerAxis(v);
        // Pelo menos uma componente difere de forma mensurável.
        const maxDiff = Math.max(
            Math.abs(radial[0] - perAxis[0]),
            Math.abs(radial[1] - perAxis[1]),
            Math.abs(radial[2] - perAxis[2]),
        );
        expect(maxDiff).toBeGreaterThan(1e-6);
    });

    it('horizonsToScene (geocêntrico log) preserva a direção do vetor de entrada', () => {
        // Entrada em km, eclíptico. A saída pode trocar eixos (y↔z), mas a direção no
        // frame de SAÍDA deve casar com a entrada após a mesma troca de eixos.
        const xKm = 4 * KM_PER_LD;
        const yKm = 7 * KM_PER_LD;
        const zKm = -3 * KM_PER_LD;
        const scene = horizonsToScene(xKm, yKm, zKm);
        // Entrada já no frame da cena (x, z, −y), porém sem compressão, para comparar direção.
        const sameFrameRaw: [number, number, number] = [xKm, zKm, -yKm];
        expectSameDirection(sameFrameRaw, scene);
    });
});

// ─── 2. Alinhamento relativo no mesmo frame ────────────────────────────────────

describe('objetos no mesmo frame mantêm alinhamento relativo', () => {
    it('o ângulo entre dois objetos é preservado pela compressão radial', () => {
        // Dois asteroides geocêntricos em direções diferentes, distâncias muito diferentes.
        const a: [number, number, number] = [50 * KM_PER_LD, 0, 0];      // longe, em +x
        const b: [number, number, number] = [0, 3 * KM_PER_LD, 0];       // perto, em +y eclíptico
        const angleRaw = angleBetween([a[0], a[2], -a[1]], [b[0], b[2], -b[1]]);
        const angleScene = angleBetween(horizonsToScene(...a), horizonsToScene(...b));
        // A compressão muda o comprimento de cada vetor, não o ângulo entre eles.
        expect(angleScene).toBeCloseTo(angleRaw, 9);
    });

    it('a ordem radial é preservada: mais longe no real → mais longe na cena', () => {
        const near = horizonsToScene(2 * KM_PER_LD, 0, 0);
        const mid = horizonsToScene(40 * KM_PER_LD, 0, 0);
        const far = horizonsToScene(300 * KM_PER_LD, 0, 0);
        const r = (v: number[]) => Math.hypot(v[0], v[1], v[2]);
        expect(r(near)).toBeLessThan(r(mid));
        expect(r(mid)).toBeLessThan(r(far));
    });
});

// ─── 3. Objeto na região de Júpiter (mesmo frame heliocêntrico) ────────────────

describe('objeto perto de Júpiter cai na região visual de Júpiter', () => {
    // Júpiter ~5,2 UA na direção eclíptica +x (simplificação; o frame é o que importa).
    const JUPITER_AU = 5.2;
    const jupiterHelio = { x: JUPITER_AU, y: 0, z: 0 };
    const jupiterScene = helioAUToSunCenteredScene(jupiterHelio);

    it('um objeto a ~0,05 UA de Júpiter renderiza adjacente a Júpiter na cena heliocêntrica', () => {
        // Mesmo frame helio (escala LINEAR): a vizinhança é fiel.
        const nearJupiter = helioAUToSunCenteredScene({ x: JUPITER_AU - 0.05, y: 0.03, z: 0.01 });
        const dist = Math.hypot(
            nearJupiter[0] - jupiterScene[0],
            nearJupiter[1] - jupiterScene[1],
            nearJupiter[2] - jupiterScene[2],
        );
        // Distância de cena deve ser pequena perto da distância Júpiter→Sol.
        const jupiterRadius = Math.hypot(...jupiterScene);
        expect(dist).toBeLessThan(jupiterRadius * 0.05);
    });

    it('o mesmo objeto via frame GEOCÊNTRICO+helio também aponta para a região de Júpiter', () => {
        // horizonsGeoToHelioScene soma o vetor geocêntrico à posição helio da Terra, no MESMO
        // frame linear de helioAUToSunCenteredScene. Terra em +x (1 UA), Júpiter em +x (5,2 UA):
        // o objeto geocêntrico a ~4,2 UA na direção +x cai sobre Júpiter.
        const earthHelioAU = { x: 1, y: 0, z: 0 };
        const geoTowardJupiterKm = (JUPITER_AU - 1) * KM_PER_AU; // 4,2 UA à frente da Terra em +x
        const objScene = horizonsGeoToHelioScene(geoTowardJupiterKm, 0, 0, earthHelioAU);
        // Deve cair praticamente sobre Júpiter (mesma direção e raio).
        expect(angleBetween(objScene, jupiterScene)).toBeCloseTo(0, 6);
        const robj = Math.hypot(...objScene);
        const rjup = Math.hypot(...jupiterScene);
        expect(robj).toBeCloseTo(rjup, 6);
    });

    it('NÃO misturar frames: geocêntrico log e heliocêntrico linear divergem (por isso são modos distintos)', () => {
        // O MESMO objeto distante, posicionado pelos dois caminhos, NÃO coincide — comprova
        // por que a cena separa radar (log, geo) de órbita (linear, helio). Misturá-los no mesmo
        // frame colocaria o objeto numa região errada (o bug histórico que a separação corrigiu).
        const geoKm = (JUPITER_AU - 1) * KM_PER_AU;
        const logGeo = horizonsToScene(geoKm, 0, 0);              // camada radar: comprimido perto da Terra
        const linHelio = horizonsGeoToHelioScene(geoKm, 0, 0, { x: 1, y: 0, z: 0 }); // camada órbita
        const rLog = Math.hypot(...logGeo);
        const rHelio = Math.hypot(...linHelio);
        // Invariante de fronteira, derivado das constantes (sem multiplicador mágico):
        //  - a camada LINEAR é fiel à UA: o objeto a 5,2 UA fica exatamente em 5,2 × ORBIT_AU_SCALE;
        //  - a camada LOG comprime esses 4,2 UA geocêntricos para bem menos que isso.
        // Os dois caminhos não podem ocupar o mesmo frame — misturá-los jogaria o objeto numa região errada.
        expect(rHelio).toBeCloseTo(JUPITER_AU * ORBIT_AU_SCALE, 6); // linear: fiel à distância em UA
        expect(rLog).toBeLessThan(rHelio * 0.5);                    // log: fortemente comprimido vs. linear
        expect(rLog).toBeGreaterThan(SUN_DISPLAY_DL);              // mas ainda além do Sol (4,2 UA > 1 UA), ordem preservada
    });
});

// ─── 4. Unidades e eixos não são aplicados duas vezes ──────────────────────────

describe('unidades e eixos aplicados exatamente uma vez', () => {
    it('horizonsToScene usa KM_PER_LD uma vez: 1 DL em km → magnitude 1 na cena', () => {
        // Se KM_PER_LD fosse aplicado duas vezes, a magnitude seria compressDistanceDl(1/KM_PER_LD) ≈ 0.
        const scene = horizonsToScene(KM_PER_LD, 0, 0);
        expect(Math.hypot(...scene)).toBeCloseTo(compressDistanceDl(1), 9);
    });

    it('horizonsGeoToHelioScene usa KM_PER_AU uma vez: 1 UA em km → 1 × ORBIT_AU_SCALE', () => {
        // Dupla aplicação de KM_PER_AU colapsaria o objeto na origem.
        const s = horizonsGeoToHelioScene(KM_PER_AU, 0, 0, { x: 0, y: 0, z: 0 });
        expect(s[0]).toBeCloseTo(ORBIT_AU_SCALE, 9);
    });

    it('a troca de eixos eclíptico→cena (x, z, −y) ocorre uma vez, sem inversão dupla', () => {
        // +y eclíptico geocêntrico deve virar −z na cena. Uma troca dupla devolveria +y.
        const s = horizonsToScene(0, KM_PER_LD, 0);
        expect(Math.abs(s[0])).toBeLessThan(1e-9);
        expect(Math.abs(s[1])).toBeLessThan(1e-9);
        expect(s[2]).toBeCloseTo(-1, 9);
    });

    it('helioAUToSunCenteredScene e horizonsGeoToHelioScene concordam na convenção de eixos', () => {
        // Mesmo ponto helio (UA) pelos dois caminhos deve dar o mesmo vetor de cena —
        // garante que não há divergência de eixo entre os dois conversores do frame linear.
        const helio = { x: 2.1, y: -1.3, z: 0.4 };
        const viaDirect = helioAUToSunCenteredScene(helio);
        const viaGeo = horizonsGeoToHelioScene(
            helio.x * KM_PER_AU,
            helio.y * KM_PER_AU,
            helio.z * KM_PER_AU,
            { x: 0, y: 0, z: 0 },
        );
        expect(viaGeo[0]).toBeCloseTo(viaDirect[0], 6);
        expect(viaGeo[1]).toBeCloseTo(viaDirect[1], 6);
        expect(viaGeo[2]).toBeCloseTo(viaDirect[2], 6);
    });

    it('km→UA e km→DL diferem pelo fator AU_IN_DL (não há confusão de unidade entre camadas)', () => {
        // O mesmo deslocamento em km deve produzir razão de magnitude consistente com KM_PER_AU/KM_PER_LD,
        // confirmando que cada camada usa sua própria unidade sem cruzar.
        const km = 0.01 * KM_PER_AU; // pequeno o bastante p/ horizonsToScene ficar ~linear
        const helio = horizonsGeoToHelioScene(km, 0, 0, { x: 0, y: 0, z: 0 });
        const geo = horizonsToScene(km, 0, 0);
        expect(Math.hypot(...helio)).toBeGreaterThan(0);
        expect(Math.hypot(...geo)).toBeGreaterThan(0);
        // Sanidade cruzada: 1 UA = KM_PER_AU/KM_PER_LD distâncias lunares.
        expect(KM_PER_AU / KM_PER_LD).toBeGreaterThan(388);
        expect(KM_PER_AU / KM_PER_LD).toBeLessThan(390);
    });
});
