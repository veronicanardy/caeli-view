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

import type { ClosestNowObject, OrbitalElements, SmallBodyObjectType, UnifiedApproach } from '@/types';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import { MARS } from '@/lib/radar/planetData';
import { KM_PER_AU } from '@/lib/physicalConstants';
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
): [number, number, number] | null {
    const helio = heliocentricPositionAU(known.elements, date);
    if (!helio) return null;
    return helioAUToSunCenteredScene(helio);
}

/**
 * Distância REAL Terra→conhecido em km, calculada por geometria heliocêntrica (sem Horizons):
 * |posição_conhecido − posição_Terra|, ambas em AU eclíptico. O Horizons daria o mesmo número, mas
 * estes corpos não passam pelo feed; como já temos os dois vetores heliocêntricos (Kepler + Terra do
 * ephemeris), a subtração é exata o bastante para exibir no card. Retorna null se não for ancorável.
 */
export function knownAsteroidEarthDistanceKm(
    known: KnownAsteroid,
    earthHelioAU: { x: number; y: number; z: number },
    date: Date = new Date(),
): number | null {
    const helio = heliocentricPositionAU(known.elements, date);
    if (!helio) return null;
    const dx = helio.x - earthHelioAU.x;
    const dy = helio.y - earthHelioAU.y;
    const dz = helio.z - earthHelioAU.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * KM_PER_AU;
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

/**
 * Escala visual do modelo GLB de um conhecido na cena: PADRONIZADA com os planetas ilustrativos.
 *
 * Por que tamanho único (e não proporcional ao diâmetro): os conhecidos convivem na MESMA régua dos
 * planetas ambiente, que têm raio visual entre ~0,03 (Mercúrio) e ~0,19 (Júpiter) — todos exagerados
 * de forma calibrada, não fiéis à escala. Padronizar os conhecidos por um planeta de referência
 * (Marte, um rochoso pequeno) deixa-os coerentes com a cena em vez de gigantes desproporcionais.
 *
 * Unidade: o RealAsteroidModel normaliza o GLB para "maior eixo = 2" (raio ≈ 1), então a escala
 * aplicada aqui É o raio visual em DL. Igualá-la a MARS.visualRadiusDl casa o tamanho com Marte.
 */
const KNOWN_VISUAL_SCALE = MARS.visualRadiusDl;

export function knownAsteroidVisualScale(): number {
    return KNOWN_VISUAL_SCALE;
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

/**
 * Converte um conhecido num ClosestNowObject sintético para alimentar o card de rocha
 * (UnifiedFocusCard, kind 'asteroid'). NÃO há aproximação: trajectory e campos de distância/data
 * ficam null de propósito. O card já trata esses nulos (esconde aba de aproximação, distância etc.),
 * então o usuário vê o perfil físico (diâmetro, tamanho comparado) e a identidade.
 */
export function knownAsteroidToClosestNowObject(known: KnownAsteroid): ClosestNowObject {
    const approach: UnifiedApproach = {
        id: knownAsteroidId(known),
        source: 'cad',
        sourceLabel: 'JPL Small-Body Database',
        name: known.name,
        displayName: known.name,
        designation: known.number,
        permanentNumber: known.number,
        properName: known.name,
        aliases: [known.name.toLowerCase()],
        objectType: known.objectType,
        approachDate: null,
        approachBody: null,
        nominalDistanceKm: null,
        nominalDistanceMiles: null,
        lunarDistance: null,
        relativeVelocityKph: null,
        relativeVelocityKms: null,
        estimatedDiameterMinMeters: known.diameterMeters,
        estimatedDiameterMaxMeters: known.diameterMeters,
        diameterMeters: known.diameterMeters,
        hazardFlag: false,
        detailIdentifier: known.number,
        detailSource: 'sbdb',
        detailRoute: '',
        orbitId: null,
        absoluteMagnitude: null,
        distanceContext: {
            kilometers: null,
            miles: null,
            lunarDistance: null,
            lunarReferenceKm: 384_400,
            earthDiametersApprox: null,
            proximityBand: 'unknown',
            headline: '',
            comparison: '',
        },
    };

    return {
        approach,
        trajectory: null,
        currentDistanceKm: null,
        currentDistanceLD: null,
        hasRealCurrentDistance: false,
    };
}
