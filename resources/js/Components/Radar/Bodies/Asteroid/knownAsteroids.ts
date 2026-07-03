/**
 * Asteroides conhecidos com identidade fixa e modelo 3D exclusivo (Ceres, Vesta, Eros, Bennu, Itokawa).
 *
 * Responsabilidade: guardar a identidade desses corpos (número, nome, modelo, ids sintéticos) e os
 * elementos orbitais osculadores (eclíptico J2000) usados como POSIÇÃO DE FALLBACK na régua LINEAR
 * dos planetas (helioAUToSunCenteredScene), via propagador de Kepler (heliocentricPositionAU).
 *
 * A posição PRINCIPAL agora vem do JPL Horizons ao vivo (endpoint /radar/famous → FamousAsteroidsSelector
 * no backend), igual a qualquer outro objeto da cena. Estes elementos só entram quando o Horizons falha
 * para um famoso (KnownAsteroidsLayer, via skipIds), garantindo que nenhum suma. A identidade aqui ainda
 * é a fonte para casar o GLB e o id sintético (knownAsteroidId / knownAsteroidById) na cena.
 *
 * Fonte dos elementos: JPL Small-Body Database (ssd.jpl.nasa.gov/tools/sbdb_lookup.html), elementos
 * osculadores na época indicada. São valores fixos: a precisão é de visualização, não de efeméride
 * operacional. A *direção* e a *região* ficam corretas; distâncias finas podem variar levemente.
 *
 * `modelKey` casa com REAL_ASTEROID_MODELS em asteroidModelRegistry.ts — a aparência (GLB N1) e a
 * posição (elementos abaixo) ficam desacopladas, exatamente como nos asteroides do feed.
 */

import type { OrbitalElements, SmallBodyObjectType } from '@/types';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import { symbolicRockRadiusFromDiameter } from '@/lib/radar/asteroidScale';
import type { AsteroidModelAsset } from './asteroidModelRegistry';
import { REAL_ASTEROID_MODELS } from './asteroidModelRegistry';

/** Prefixo do id sintético de um conhecido, para distinguir de objetos vindos do feed. */
export const KNOWN_ASTEROID_ID_PREFIX = 'known:';

export type KnownAsteroid = {
    /** Número de catálogo (designação permanente). Identificador estável. */
    number: string;
    /** Nome próprio exibido. */
    name: string;
    /** Chave do modelo GLB em REAL_ASTEROID_MODELS. */
    modelKey: AsteroidModelAsset['key'];
    /** Diâmetro médio real em metros (JPL SBDB). Usado para escala visual e para o card. */
    diameterMeters: number;
    /** Tipo: 'asteroid' para todos; Ceres é planeta-anão mas no radar entra como rocha. */
    objectType: SmallBodyObjectType;
    /** Elementos orbitais osculadores, eclíptico J2000. */
    elements: OrbitalElements;
};

/**
 * Os cinco asteroides com modelo 3D exclusivo. Elementos osculadores (eclíptico J2000) do JPL SBDB
 * (ssd-api.jpl.nasa.gov/sbdb.api), em precisão completa. tpJd e epochJd são Julian Dates (TDB).
 *
 * A propagação de Kepler (heliocentricPositionAU) usa tpJd como âncora; por isso o tpJd CORRETO é o
 * que mantém o asteroide no ponto certo da órbita. epochJd é registrado por fidelidade à fonte.
 * Para estes corpos (órbitas muito bem determinadas) os valores derivam pouquíssimo ao longo de anos.
 */
export const KNOWN_ASTEROIDS: KnownAsteroid[] = [
    {
        number: '1',
        name: 'Ceres',
        modelKey: 'ceres',
        diameterMeters: 939_400,
        objectType: 'asteroid',
        elements: { ec: 0.07969229514816586, qrAu: 2.545159361382861, inDeg: 10.58802780183462, omDeg: 80.24862682043221, wDeg: 73.29421453021587, tpJd: 2461599.841466614066, epochJd: 2461200.5 },
    },
    {
        number: '4',
        name: 'Vesta',
        modelKey: 'vesta',
        diameterMeters: 525_400,
        objectType: 'asteroid',
        elements: { ec: 0.09020374382834395, qrAu: 2.148361914524259, inDeg: 7.143925545058711, omDeg: 103.701293265032, wDeg: 151.4686478221564, tpJd: 2460901.587379842988, epochJd: 2461200.5 },
    },
    {
        number: '433',
        name: 'Eros',
        modelKey: 'eros',
        diameterMeters: 16_840,
        objectType: 'asteroid',
        elements: { ec: 0.2228779627700761, qrAu: 1.133233327946397, inDeg: 10.82854410314273, omDeg: 304.2679713350896, wDeg: 178.9181319135911, tpJd: 2461088.813494039683, epochJd: 2461200.5 },
    },
    {
        number: '101955',
        name: 'Bennu',
        modelKey: 'bennu',
        diameterMeters: 490,
        objectType: 'asteroid',
        elements: { ec: 0.2037450762416414, qrAu: 0.8968944004459729, inDeg: 6.03494377024794, omDeg: 2.06086619569642, wDeg: 66.22306084084298, tpJd: 2455439.141940872670, epochJd: 2455562.5 },
    },
    {
        number: '25143',
        name: 'Itokawa',
        modelKey: 'itokawa',
        diameterMeters: 330,
        objectType: 'asteroid',
        elements: { ec: 0.2801776414987972, qrAu: 0.9530824380945183, inDeg: 1.620940810523569, omDeg: 69.07449749929083, wDeg: 162.8409022415483, tpJd: 2460936.702994476837, epochJd: 2461200.5 },
    },
];

/** Recupera o asset de modelo GLB associado a um asteroide conhecido (sempre existe). */
export function modelAssetForKnown(known: KnownAsteroid): AsteroidModelAsset {
    const asset = REAL_ASTEROID_MODELS.find((a) => a.key === known.modelKey);
    if (!asset) {
        throw new Error(`[knownAsteroids] modelo "${known.modelKey}" ausente em REAL_ASTEROID_MODELS`);
    }
    return asset;
}

export type KnownAsteroidPlacement = {
    known: KnownAsteroid;
    /** Posição na cena, na régua LINEAR dos planetas (Sol na origem). */
    scenePosition: [number, number, number];
};

/**
 * Posição de cena de um asteroide conhecido na régua LINEAR dos planetas (helioAUToSunCenteredScene),
 * Sol na origem — a mesma régua dos planetas, para que ele caia ao lado da região/planeta real.
 *
 * Usamos a régua heliocêntrica (não a geocêntrica do feed) porque ela preserva a ORDEM heliocêntrica:
 * Ceres (cinturão externo) fica além de Vesta, etc. A régua geocêntrica do radar mede da Terra e
 * embaralharia essa ordem para objetos distantes. Retorna null se os elementos não permitirem ancorar.
 *
 * Posição na CURVA EXATA (heliocentricPositionAU), não amostrada de polilinha: estes corpos NÃO
 * desenham linha de órbita na cena, então não há aresta com a qual coincidir. Sem linha para casar,
 * a posição astronômica exata é o correto. (Planetas e o asteroide do modo órbita, que desenham a
 * órbita, amostram a polilinha — ver sampleHeliocentricEllipseAtNu — para coincidir com ela.)
 */
export function knownAsteroidScenePosition(
    known: KnownAsteroid,
    date: Date = new Date(),
    scale?: number,
): [number, number, number] | null {
    const helio = heliocentricPositionAU(known.elements, date);
    if (!helio) return null;
    return helioAUToSunCenteredScene(helio, scale);
}

/**
 * Posições de todos os conhecidos que puderam ser ancorados em `date`, na régua dos planetas.
 * `scale` permite ajustar a régua (default = LINEAR_AU_SCALE, a régua única da cena).
 */
export function knownAsteroidPlacements(date: Date = new Date(), scale?: number): KnownAsteroidPlacement[] {
    return KNOWN_ASTEROIDS
        .map((known) => {
            const scenePosition = knownAsteroidScenePosition(known, date, scale);
            return scenePosition ? { known, scenePosition } : null;
        })
        .filter((p): p is KnownAsteroidPlacement => p !== null);
}

/**
 * Escala visual do modelo GLB de um conhecido na cena.
 *
 * Usa a MESMA política simbólica dos asteroides do feed (symbolicRockRadiusFromDiameter), agora a
 * partir do diâmetro real do conhecido. Antes era um tamanho fixo igual ao de Marte (0,048 DL), o
 * que fazia:
 *  - Itokawa (330 m) e Bennu (490 m) parecerem do tamanho de um PLANETA (maiores que Mercúrio);
 *  - Ceres (939 km) e Bennu (490 m) terem o mesmo tamanho aparente, apesar de ~1900× de diferença;
 *  - o mesmo corpo aparecer 6× maior pelo fallback Kepler do que pelo feed do Horizons.
 * Com a política única, Ceres cai no degrau máximo e Itokawa num degrau baixo, preservando a
 * diferença entre eles e mantendo todos inequivocamente menores que os planetas.
 *
 * Unidade: o RealAsteroidModel normaliza o GLB para "maior eixo = 2" (raio ≈ 1), então a escala
 * aplicada aqui É o raio visual em DL.
 */
export function knownAsteroidVisualScale(known: KnownAsteroid): number {
    return symbolicRockRadiusFromDiameter(known.diameterMeters);
}

/** Id sintético estável de um conhecido (usado como selectedId e para reabrir o card). */
export function knownAsteroidId(known: KnownAsteroid): string {
    return `${KNOWN_ASTEROID_ID_PREFIX}${known.number}`;
}

/** True se o id pertence a um asteroide conhecido (e não a um objeto do feed). */
export function isKnownAsteroidId(id: string | null | undefined): boolean {
    return typeof id === 'string' && id.startsWith(KNOWN_ASTEROID_ID_PREFIX);
}

/** Recupera o conhecido a partir do seu id sintético (knownAsteroidId), ou null. */
export function knownAsteroidById(id: string | null | undefined): KnownAsteroid | null {
    if (!isKnownAsteroidId(id)) return null;
    const number = (id as string).slice(KNOWN_ASTEROID_ID_PREFIX.length);
    return KNOWN_ASTEROIDS.find((k) => k.number === number) ?? null;
}
