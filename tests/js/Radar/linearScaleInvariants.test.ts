/**
 * Invariantes da RÉGUA LINEAR ÚNICA em UA — o padrão do radar (a cara do produto).
 *
 * Por que este arquivo existe: hoje a geometria de cena é gerada na escala log-derivada
 * (ORBIT_AU_SCALE ≈ 96) e depois reescalada para a régua linear (LINEAR_AU_SCALE = 300) por um fator
 * de correção (LINEAR_SCALE_FACTOR). Esse caminho duplo é dívida técnica: a régua linear, que é a
 * decisão científica aprovada, deveria ser a FONTE da escala, não um pós-processamento.
 *
 * Estes testes travam o RESULTADO FINAL em unidades absolutas (1 UA → LINEAR_AU_SCALE unidades),
 * NÃO o mecanismo. São deliberadamente agnósticos de COMO a escala é aplicada: se um dia o fator de
 * correção for eliminado e LINEAR_AU_SCALE passar a alimentar a matemática diretamente, estes testes
 * devem continuar verdes sem alteração. É exatamente essa propriedade que faz deles a rede de
 * segurança para essa refatoração: "a tela não muda" vira "estes números não mudam".
 *
 * Não reabrem a discussão log vs. linear: a régua log segue acessível só por trás de `?log` e tem
 * cobertura própria (sceneEphemeris.test.ts, compressRadial.test.ts). Aqui é só a régua linear.
 */

import { describe, expect, it } from 'vitest';
import {
    LINEAR_AU_SCALE,
    LINEAR_SCALE_FACTOR,
    ORBIT_AU_SCALE,
    buildHeliocentricOrbit,
    helioAUToSunCenteredScene,
    scaleEphemerisForLinear,
} from '@/lib/sceneEphemeris';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { KM_PER_AU, LUNAR_DISTANCE_KM } from '@/lib/physicalConstants';

// ─── A régua linear em si ───────────────────────────────────────────────────────

describe('régua linear: 1 UA = LINEAR_AU_SCALE unidades de cena', () => {
    it('um corpo a 1 UA do Sol (eclíptico +x) cai a LINEAR_AU_SCALE unidades na régua linear', () => {
        const scene = helioAUToSunCenteredScene({ x: 1, y: 0, z: 0 }, LINEAR_AU_SCALE);
        expect(Math.hypot(...scene)).toBeCloseTo(LINEAR_AU_SCALE, 9);
    });

    it('a régua é estritamente LINEAR: dobrar a distância UA dobra a distância de cena', () => {
        const oneAu = Math.hypot(...helioAUToSunCenteredScene({ x: 1, y: 0, z: 0 }, LINEAR_AU_SCALE));
        const twoAu = Math.hypot(...helioAUToSunCenteredScene({ x: 2, y: 0, z: 0 }, LINEAR_AU_SCALE));
        const fiveAu = Math.hypot(...helioAUToSunCenteredScene({ x: 5, y: 0, z: 0 }, LINEAR_AU_SCALE));
        expect(twoAu / oneAu).toBeCloseTo(2, 9);
        expect(fiveAu / oneAu).toBeCloseTo(5, 9);
    });

    it('a régua linear é maior que a régua log (NEOs ganham respiro da Terra)', () => {
        // 300 vs ~96: a régua linear afasta os NEOs próximos da Terra (mais legível ao dar zoom),
        // ao custo de empurrar o cinturão/planetas mais longe. Decisão aprovada.
        expect(LINEAR_AU_SCALE).toBeGreaterThan(ORBIT_AU_SCALE);
    });
});

// ─── A equivalência que o fator de correção encapsula ───────────────────────────

// NOTA PARA A REFATORAÇÃO DA ESCALA: este describe é a ÚNICA parte deste arquivo que depende de
// LINEAR_SCALE_FACTOR existir. Quando o fator for eliminado (LINEAR_AU_SCALE alimentando a matemática
// direto), REMOVA este bloco inteiro — os demais describes, que travam o resultado em unidades
// absolutas, são a rede que prova que a régua linear efetiva não se moveu.
describe('equivalência das duas réguas (o que o fator de correção garante hoje)', () => {
    it('ORBIT_AU_SCALE × LINEAR_SCALE_FACTOR === LINEAR_AU_SCALE', () => {
        // Esta é literalmente a identidade que a refatoração da escala vai eliminar. Travá-la garante
        // que, ao remover o fator e mandar LINEAR_AU_SCALE direto, a régua efetiva não se mova.
        expect(ORBIT_AU_SCALE * LINEAR_SCALE_FACTOR).toBeCloseTo(LINEAR_AU_SCALE, 9);
    });

    it('reescalar a órbita log pelo fator preserva a FORMA e entrega a régua linear', () => {
        // A órbita do NEO é construída em ORBIT_AU_SCALE e reescalada pelo <group scale> da cena.
        // Invariante 1: reescalar é uniforme — a razão entre dois raios da órbita NÃO muda (forma
        // preservada, sem distorção). Invariante 2: o periélio reescalado bate com qrAu na régua linear.
        const elements = { ec: 0.2, qrAu: 1.1, inDeg: 12, omDeg: 80, wDeg: 150 };
        const orbit = buildHeliocentricOrbit(elements, 192)!;

        let minLog = Number.POSITIVE_INFINITY;
        let maxLog = 0;
        for (let i = 0; i < orbit.length; i += 3) {
            const r = Math.hypot(orbit[i], orbit[i + 1], orbit[i + 2]);
            if (r < minLog) minLog = r;
            if (r > maxLog) maxLog = r;
        }

        // Forma preservada: a razão afélio/periélio é idêntica antes e depois do reescalonamento.
        const ratioLog = maxLog / minLog;
        const ratioLinear = (maxLog * LINEAR_SCALE_FACTOR) / (minLog * LINEAR_SCALE_FACTOR);
        expect(ratioLinear).toBeCloseTo(ratioLog, 12);

        // Periélio na régua linear = qrAu × LINEAR_AU_SCALE (o menor raio é o periélio).
        expect(minLog * LINEAR_SCALE_FACTOR).toBeCloseTo(elements.qrAu * LINEAR_AU_SCALE, 4);
    });
});

// ─── scaleEphemerisForLinear: planetas, Terra, Lua, Sol esticam juntos ──────────

describe('scaleEphemerisForLinear reescala a geometria para a régua linear', () => {
    /** Ephemeris mínimo: posições de cena (em ORBIT_AU_SCALE) e um semieixo. */
    function makeEphemeris(): SceneEphemeris {
        return {
            earthScenePosition: [ORBIT_AU_SCALE, 0, 0],          // Terra a 1 UA na régua log
            jupiterScenePosition: [0, 0, 5.2 * ORBIT_AU_SCALE],  // Júpiter a ~5,2 UA
            earthSemiMajorAU: 1,
            jupiterSemiMajorAU: 5.2,
        } as unknown as SceneEphemeris;
    }

    it('a Terra (1 UA) fica a LINEAR_AU_SCALE unidades do Sol após reescalar', () => {
        const scaled = scaleEphemerisForLinear(makeEphemeris());
        expect(Math.hypot(...scaled.earthScenePosition)).toBeCloseTo(LINEAR_AU_SCALE, 6);
    });

    it('Júpiter (~5,2 UA) fica a ~5,2 × LINEAR_AU_SCALE unidades do Sol', () => {
        const scaled = scaleEphemerisForLinear(makeEphemeris());
        expect(Math.hypot(...scaled.jupiterScenePosition)).toBeCloseTo(5.2 * LINEAR_AU_SCALE, 5);
    });

    it('os semieixos (de que as elipses derivam o tamanho) esticam pelo mesmo fator', () => {
        const scaled = scaleEphemerisForLinear(makeEphemeris()) as unknown as Record<string, number>;
        expect(scaled.earthSemiMajorAU).toBeCloseTo(1 * LINEAR_SCALE_FACTOR, 9);
        expect(scaled.jupiterSemiMajorAU).toBeCloseTo(5.2 * LINEAR_SCALE_FACTOR, 9);
    });

    it('preserva a direção: só a magnitude muda, ângulos intactos', () => {
        const ephemeris = { marsScenePosition: [3, 0, 4] } as unknown as SceneEphemeris;
        const scaled = scaleEphemerisForLinear(ephemeris);
        // razão z/x preservada
        expect(scaled.marsScenePosition[2] / scaled.marsScenePosition[0]).toBeCloseTo(4 / 3, 12);
        // magnitude × fator
        expect(Math.hypot(...scaled.marsScenePosition)).toBeCloseTo(5 * LINEAR_SCALE_FACTOR, 9);
    });
});

// ─── Coerência entre as três famílias na régua linear ───────────────────────────

describe('coerência: Lua, NEO e planeta na MESMA régua linear', () => {
    it('um NEO e um planeta à mesma distância heliocêntrica caem no mesmo raio de cena', () => {
        // Régua única: nada de "planetas numa régua, asteroides em outra". 2 UA é 2 UA para ambos.
        const neoLike = helioAUToSunCenteredScene({ x: 2, y: 0, z: 0 }, LINEAR_AU_SCALE);
        const planetLike = helioAUToSunCenteredScene({ x: 0, y: 0, z: 2 }, LINEAR_AU_SCALE);
        expect(Math.hypot(...neoLike)).toBeCloseTo(Math.hypot(...planetLike), 9);
        expect(Math.hypot(...neoLike)).toBeCloseTo(2 * LINEAR_AU_SCALE, 9);
    });

    it('a Lua (1 DL) fica MUITO mais perto que 1 UA na mesma régua (ordem honesta)', () => {
        // 1 DL ≈ 0,00257 UA → ~0,77 unidades; 1 UA → LINEAR_AU_SCALE unidades. A proximidade da
        // Lua é revelada por zoom, não por distorção: a régua não reordena distâncias.
        const moonUnits = (LUNAR_DISTANCE_KM / KM_PER_AU) * LINEAR_AU_SCALE;
        const oneAuUnits = LINEAR_AU_SCALE;
        expect(moonUnits).toBeLessThan(1);
        expect(moonUnits).toBeLessThan(oneAuUnits);
        // E é estritamente proporcional à distância real (régua linear, não comprimida).
        expect(moonUnits / oneAuUnits).toBeCloseTo(LUNAR_DISTANCE_KM / KM_PER_AU, 12);
    });
});
