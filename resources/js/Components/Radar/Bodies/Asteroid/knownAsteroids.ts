/**
 * Asteroides conhecidos com identidade fixa e modelo 3D exclusivo, exibidos no radar mesmo
 * quando NÃO fazem aproximação próxima da Terra.
 *
 * Responsabilidade: guardar os elementos orbitais osculadores (eclíptico J2000) e a identidade
 * dos asteroides famosos por missões espaciais, para que a cena possa posicioná-los na régua
 * LINEAR dos planetas (helioAUToSunCenteredScene) — ao lado do planeta/região real onde estão.
 *
 * Por que aqui e não no feed: Bennu, Eros, Ceres, Vesta e Itokawa raramente passam perto da Terra,
 * então o feed de aproximações (closest-now) não os retorna. Para mostrá-los "onde estão agora" no
 * Sistema Solar, usamos os elementos abaixo + o propagador de Kepler (heliocentricPositionAU).
 *
 * Fonte dos elementos: JPL Small-Body Database (ssd.jpl.nasa.gov/tools/sbdb_lookup.html), elementos
 * osculadores na época indicada. São valores fixos: a precisão é de visualização, não de efeméride
 * operacional. A *direção* e a *região* ficam corretas; distâncias finas podem variar levemente.
 *
 * `modelKey` casa com REAL_ASTEROID_MODELS em asteroidModelRegistry.ts — a aparência (GLB N1) e a
 * posição (elementos abaixo) ficam desacopladas, exatamente como nos asteroides do feed.
 */

import type { OrbitalElements } from '@/types';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import type { AsteroidModelAsset } from './asteroidModelRegistry';
import { REAL_ASTEROID_MODELS } from './asteroidModelRegistry';

export type KnownAsteroid = {
    /** Número de catálogo (designação permanente). Identificador estável. */
    number: string;
    /** Nome próprio exibido. */
    name: string;
    /** Chave do modelo GLB em REAL_ASTEROID_MODELS. */
    modelKey: AsteroidModelAsset['key'];
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
        elements: { ec: 0.07969229514816586, qrAu: 2.545159361382861, inDeg: 10.58802780183462, omDeg: 80.24862682043221, wDeg: 73.29421453021587, tpJd: 2461599.841466614066, epochJd: 2461200.5 },
    },
    {
        number: '4',
        name: 'Vesta',
        modelKey: 'vesta',
        elements: { ec: 0.09020374382834395, qrAu: 2.148361914524259, inDeg: 7.143925545058711, omDeg: 103.701293265032, wDeg: 151.4686478221564, tpJd: 2460901.587379842988, epochJd: 2461200.5 },
    },
    {
        number: '433',
        name: 'Eros',
        modelKey: 'eros',
        elements: { ec: 0.2228779627700761, qrAu: 1.133233327946397, inDeg: 10.82854410314273, omDeg: 304.2679713350896, wDeg: 178.9181319135911, tpJd: 2461088.813494039683, epochJd: 2461200.5 },
    },
    {
        number: '101955',
        name: 'Bennu',
        modelKey: 'bennu',
        elements: { ec: 0.2037450762416414, qrAu: 0.8968944004459729, inDeg: 6.03494377024794, omDeg: 2.06086619569642, wDeg: 66.22306084084298, tpJd: 2455439.141940872670, epochJd: 2455562.5 },
    },
    {
        number: '25143',
        name: 'Itokawa',
        modelKey: 'itokawa',
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
): [number, number, number] | null {
    const helio = heliocentricPositionAU(known.elements, date);
    if (!helio) return null;
    return helioAUToSunCenteredScene(helio);
}

/** Posições de todos os conhecidos que puderam ser ancorados em `date`, na régua dos planetas. */
export function knownAsteroidPlacements(date: Date = new Date()): KnownAsteroidPlacement[] {
    return KNOWN_ASTEROIDS
        .map((known) => {
            const scenePosition = knownAsteroidScenePosition(known, date);
            return scenePosition ? { known, scenePosition } : null;
        })
        .filter((p): p is KnownAsteroidPlacement => p !== null);
}
