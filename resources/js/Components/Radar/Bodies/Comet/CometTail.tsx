/**
 * Coma e DUAS caudas de um cometa na cena 3D do radar.
 *
 * Responsabilidade: desenhar o que diferencia visualmente um cometa de um asteroide, com o visual
 * clássico de cometa grande (ex.: Halley):
 *  - cauda de íon (gás): estreita, azulada, RETA, apontando para o lado oposto ao Sol (anti-solar);
 *  - cauda de poeira: mais larga e curta, tom âmbar/dourado, levemente DESVIADA do anti-solar (a poeira
 *    é mais pesada e "fica para trás", defasando da cauda de íon). É o que dá o leque duplo real.
 *
 * Por que NUVEM DE PARTÍCULAS (THREE.Points), e não plano/cone: qualquer superfície (plano com textura,
 * par cruzado, cone, billboard giratório) vira uma "chapa"/feixe/seta quando a cauda aponta quase pra
 * câmera (cometa entre observador e Sol). Partículas são sprites redondos independentes: lidas como
 * poeira/gás de QUALQUER ângulo, nunca como chapa, e somam brilho com blending aditivo. O truque pra não
 * virar borrão é distribuição: muitas partículas pequenas, densas perto da cabeça e rareando pra ponta,
 * com leve dispersão lateral (cone fino), e tamanho/opacidade caindo ao longo da cauda.
 *
 * Sol está na origem da cena (régua heliocêntrica): direção anti-solar de um cometa em P é normalize(P).
 * A cauda de poeira não usa velocidade real (a do feed é geocêntrica, não casaria com o espaço da cena):
 * usa um desvio angular fixo a partir do anti-solar, que é o suficiente para ler como "segunda cauda".
 *
 * Atividade por distância ao Sol: cometa só tem cauda perto do Sol (o calor sublima o gelo). A distância
 * sai de length(scenePosition)/LINEAR_AU_SCALE (Sol na origem) e modula comprimento, largura e opacidade
 * da cauda, sumindo de vez além de ~3 UA. Longe, o componente não desenha nada (só o núcleo aparece).
 *
 * Não calcula física nem posição: recebe posição e escala prontas e só desenha.
 */

import { useEffect, useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { LINEAR_AU_SCALE } from '@/lib/sceneEphemeris';

type CometTailProps = {
    /** Posição do cometa na cena (origem = Sol). Define a direção anti-solar das caudas. */
    scenePosition: [number, number, number];
    /** Raio visual do núcleo (DL), base para dimensionar coma e caudas em unidades de mundo. */
    nucleusRadius: number;
    /** Opacidade global (0..1), para acompanhar dimming/hover do corpo. */
    opacity?: number;
};

/** Cauda de íon: reta, longa. Comprimento e dispersão lateral em múltiplos do raio do núcleo. */
const ION_LENGTH_FACTOR = 32;
const ION_SPREAD_FACTOR = 2.3;
const ION_PARTICLES = 1900;
/** Cauda de poeira: mais curta, mais larga/difusa, e desviada do anti-solar por este ângulo (graus). */
const DUST_LENGTH_FACTOR = 20;
const DUST_SPREAD_FACTOR = 4.6;
const DUST_PARTICLES = 2100;
const DUST_OFFSET_DEG = 22;
/** Tamanho-base de cada partícula (unidades de mundo), em múltiplos do raio do núcleo. */
const ION_POINT_FACTOR = 1.7;
const DUST_POINT_FACTOR = 2.6;
/**
 * Camada de GLOW da cauda: sob a nuvem nítida, poucas partículas MUITO maiores e fracas que envolvem os
 * grãos numa névoa luminosa, o mesmo halo macio da cabeça mas ao longo de toda a cauda. Multiplicadores
 * sobre tamanho/contagem da nuvem nítida e a opacidade (baixa) do material de glow.
 */
const GLOW_POINT_MULTIPLIER = 3.5;
const GLOW_PARTICLE_FRACTION = 0.35;
const ION_GLOW_OPACITY = 0.3;
const DUST_GLOW_OPACITY = 0.28;

/**
 * Atividade do cometa por distância ao Sol: a cauda só existe porque o calor do Sol sublima o gelo do
 * núcleo. Perto do Sol = cauda cheia; longe = núcleo pelado, sem cauda. Modela isso como uma rampa:
 *  - dentro de FULL_ACTIVITY_AU: atividade máxima (1);
 *  - entre FULL_ACTIVITY_AU e ACTIVITY_CUTOFF_AU: cai suave de 1 a 0 (não corte seco);
 *  - além de ACTIVITY_CUTOFF_AU: 0 (sem cauda).
 * ~3 UA é o valor clássico em que a sublimação da água "liga" a cauda dos cometas.
 */
const FULL_ACTIVITY_AU = 1.8;
const ACTIVITY_CUTOFF_AU = 3.0;
/** Cores: íon azul-frio, poeira âmbar (família das rochas). */
const ION_COLOR = '#9fd0ff';
const DUST_COLOR = '#e8c79a';

/**
 * Sprite redondo de cada partícula: gradiente radial branco→transparente, com margem transparente pra
 * borda sem aresta. Translúcido pra somar como brilho com blending aditivo (gás/poeira), não tinta sólida.
 */
function makeSoftDotTexture(): THREE.Texture {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.06)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
}

/**
 * Gera a geometria de uma cauda como nuvem de partículas ao longo do eixo +X (anti-solar local).
 *
 * Distribuição (determinística por `seed` pra não tremer entre renders):
 *  - posição ao longo (t em 0..1): enviesada pra cabeça (t = r²), então fica densa perto do núcleo e
 *    rareia pra ponta, como uma cauda real que se dissipa;
 *  - dispersão lateral: cone que ABRE com t (estreito na cabeça, largo na ponta), com queda gaussiana
 *    do eixo, pra ter miolo denso e bordas esgarçadas (não um tubo de raio fixo);
 *  - tamanho por partícula (atributo aSize): cai ao longo da cauda, partículas menores na ponta;
 *  - alpha por partícula (atributo aAlpha): aceso na cabeça, esvaindo a ~0 na ponta. A cabeça satura em
 *    branco com o blending aditivo (grãos amontoados) e isso é INTENCIONAL: dá o estouro de luz na base.
 */
function makeTailPoints(count: number, length: number, spread: number, pointSize: number, seed: number): THREE.BufferGeometry {
    const rng = mulberry32(seed);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const t = Math.pow(rng(), 2);             // 0 cabeça → 1 ponta, denso na cabeça
        const x = t * length;
        // Cone que abre com t; raio amostrado com viés ao centro (sqrt) e direção angular uniforme.
        const radius = spread * (0.15 + 0.85 * t) * Math.sqrt(rng());
        const ang = rng() * Math.PI * 2;
        positions[i * 3] = x;
        positions[i * 3 + 1] = Math.cos(ang) * radius;
        positions[i * 3 + 2] = Math.sin(ang) * radius;
        sizes[i] = pointSize * (1 - 0.55 * t) * (0.7 + 0.6 * rng());
        alphas[i] = Math.pow(1 - t, 1.6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    return geo;
}

/** PRNG determinístico (mulberry32): mesma seed → mesma nuvem, sem tremer entre renders. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * ShaderMaterial de partículas: cada ponto é um sprite redondo (a textura macia), com tamanho atenuado
 * pela distância à câmera (perspectiva) e alpha vindo do atributo por partícula × opacidade global.
 * Blending aditivo: translúcido vira luz somada (gás/poeira), nunca tinta sólida.
 */
function makeTailPointsMaterial(map: THREE.Texture, color: string, opacity: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: map },
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
        },
        vertexShader: `
            attribute float aSize;
            attribute float aAlpha;
            varying float vAlpha;
            void main() {
                vAlpha = aAlpha;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * (300.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: `
            uniform sampler2D uMap;
            uniform vec3 uColor;
            uniform float uOpacity;
            varying float vAlpha;
            void main() {
                vec4 tex = texture2D(uMap, gl_PointCoord);
                gl_FragColor = vec4(uColor, 1.0) * tex.a * vAlpha * uOpacity;
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

/**
 * Atividade do cometa (0..1) a partir da distância ao Sol em UA: 1 dentro de FULL_ACTIVITY_AU, caindo
 * suave (smoothstep) até 0 em ACTIVITY_CUTOFF_AU, e 0 além disso. Função pura, isolada pra teste.
 */
export function cometActivityFromSunDistanceAu(sunDistanceAu: number): number {
    if (sunDistanceAu <= FULL_ACTIVITY_AU) return 1;
    if (sunDistanceAu >= ACTIVITY_CUTOFF_AU) return 0;
    const t = (sunDistanceAu - FULL_ACTIVITY_AU) / (ACTIVITY_CUTOFF_AU - FULL_ACTIVITY_AU); // 0..1
    const eased = t * t * (3 - 2 * t); // smoothstep: queda suave nas duas pontas
    return 1 - eased;
}

export function CometTail({ scenePosition, nucleusRadius, opacity = 1 }: CometTailProps) {
    // Atividade por distância ao Sol (Sol na origem, 1 UA = LINEAR_AU_SCALE unidades de cena). Cauda só
    // existe perto do Sol; longe, o cometa é só núcleo. Encolhe comprimento/largura E apaga a opacidade.
    const activity = useMemo(() => {
        const sunDistanceAu = Math.hypot(...scenePosition) / LINEAR_AU_SCALE;
        return cometActivityFromSunDistanceAu(sunDistanceAu);
    }, [scenePosition]);

    // Direção anti-solar = do Sol (origem) para o cometa, normalizada. As caudas apontam para LÁ.
    const antiSunDir = useMemo(() => {
        const v = new THREE.Vector3(...scenePosition);
        if (v.lengthSq() < 1e-9) return new THREE.Vector3(1, 0, 0);
        return v.normalize();
    }, [scenePosition]);

    // Quaternion que alinha o eixo +X (comprimento da nuvem) ao anti-solar (cauda de íon).
    const ionQuat = useMemo(() => {
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), antiSunDir);
        return q;
    }, [antiSunDir]);

    // Cauda de poeira: anti-solar girado por DUST_OFFSET_DEG em torno de um eixo perpendicular estável,
    // simulando a defasagem da poeira sem depender de velocidade real.
    const dustQuat = useMemo(() => {
        const ref = Math.abs(antiSunDir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const axis = new THREE.Vector3().crossVectors(antiSunDir, ref).normalize();
        const offset = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(DUST_OFFSET_DEG));
        const dustDir = antiSunDir.clone().applyQuaternion(offset);
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dustDir);
        return q;
    }, [antiSunDir]);

    // A atividade encolhe a geometria (cauda curta quando longe) e, mais abaixo, apaga a opacidade.
    const ionLength = nucleusRadius * ION_LENGTH_FACTOR * activity;
    const ionSpread = nucleusRadius * ION_SPREAD_FACTOR * activity;
    const dustLength = nucleusRadius * DUST_LENGTH_FACTOR * activity;
    const dustSpread = nucleusRadius * DUST_SPREAD_FACTOR * activity;

    const dotTex = useMemo(() => makeSoftDotTexture(), []);
    // Nuvem nítida (os pontinhos) + nuvem de glow (poucas partículas grandes/fracas, MESMA seed pra ocupar
    // o mesmo volume): assim o halo difuso envolve exatamente os mesmos grãos ao longo de toda a cauda.
    const ionGeo = useMemo(
        () => makeTailPoints(ION_PARTICLES, ionLength, ionSpread, nucleusRadius * ION_POINT_FACTOR, 1),
        [ionLength, ionSpread, nucleusRadius],
    );
    const dustGeo = useMemo(
        () => makeTailPoints(DUST_PARTICLES, dustLength, dustSpread, nucleusRadius * DUST_POINT_FACTOR, 2),
        [dustLength, dustSpread, nucleusRadius],
    );
    const ionGlowGeo = useMemo(
        () => makeTailPoints(Math.round(ION_PARTICLES * GLOW_PARTICLE_FRACTION), ionLength, ionSpread, nucleusRadius * ION_POINT_FACTOR * GLOW_POINT_MULTIPLIER, 1),
        [ionLength, ionSpread, nucleusRadius],
    );
    const dustGlowGeo = useMemo(
        () => makeTailPoints(Math.round(DUST_PARTICLES * GLOW_PARTICLE_FRACTION), dustLength, dustSpread, nucleusRadius * DUST_POINT_FACTOR * GLOW_POINT_MULTIPLIER, 2),
        [dustLength, dustSpread, nucleusRadius],
    );

    // Opacidades BAIXAS de propósito: com blending aditivo, valores altos saturam tudo em branco. A
    // atividade também apaga a cauda: somada ao encolhimento da geometria, dá o fade gradual com o Sol.
    const ionMat = useMemo(() => makeTailPointsMaterial(dotTex, ION_COLOR, 0.85 * opacity * activity), [dotTex, opacity, activity]);
    const dustMat = useMemo(() => makeTailPointsMaterial(dotTex, DUST_COLOR, 0.65 * opacity * activity), [dotTex, opacity, activity]);
    const ionGlowMat = useMemo(() => makeTailPointsMaterial(dotTex, ION_COLOR, ION_GLOW_OPACITY * opacity * activity), [dotTex, opacity, activity]);
    const dustGlowMat = useMemo(() => makeTailPointsMaterial(dotTex, DUST_COLOR, DUST_GLOW_OPACITY * opacity * activity), [dotTex, opacity, activity]);

    useEffect(() => () => {
        dotTex.dispose(); ionGeo.dispose(); dustGeo.dispose(); ionGlowGeo.dispose(); dustGlowGeo.dispose();
        ionMat.dispose(); dustMat.dispose();
        ionGlowMat.dispose(); dustGlowMat.dispose();
    }, [dotTex, ionGeo, dustGeo, ionGlowGeo, dustGlowGeo, ionMat, dustMat, ionGlowMat, dustGlowMat]);

    // Longe do Sol o cometa é só núcleo: sem atividade, nenhuma cauda é desenhada.
    if (activity <= 0) return null;

    return (
        <group>
            {/* Cauda de poeira: glow difuso por baixo + nuvem nítida (os pontinhos) por cima. */}
            <group quaternion={dustQuat}>
                <points geometry={dustGlowGeo} material={dustGlowMat} />
                <points geometry={dustGeo} material={dustMat} />
            </group>

            {/* Cauda de íon: glow difuso por baixo + nuvem nítida (os pontinhos) por cima. */}
            <group quaternion={ionQuat}>
                <points geometry={ionGlowGeo} material={ionGlowMat} />
                <points geometry={ionGeo} material={ionMat} />
            </group>
        </group>
    );
}

