/**
 * Cometas famosos com identidade fixa (Halley, Encke, 67P).
 *
 * Responsabilidade: guardar a identidade desses cometas (designação, nome, ids sintéticos, diâmetro
 * estimado do núcleo) e os elementos orbitais osculadores (eclíptico J2000) usados como POSIÇÃO DE
 * FALLBACK na régua LINEAR dos planetas (helioAUToSunCenteredScene), via propagador de Kepler. É a
 * contraparte cometária de knownAsteroids.ts.
 *
 * A posição PRINCIPAL vem do JPL Horizons ao vivo (endpoint /radar/famous → FamousComets no backend),
 * igual a qualquer outro objeto da cena. Estes elementos só entram quando o Horizons falha para um
 * cometa, garantindo que nenhum suma.
 *
 * modelKey casa com cometModelRegistry.ts: o 67P tem shape model real (Rosetta/DLR); Halley e Encke usam
 * o mesmo GLB genérico texturizado dos asteroides como forma representativa, por não terem modelo próprio.
 * Núcleo de cometa e asteroide escuro têm a mesma cor real, então o mesmo modelo serve aos dois.
 *
 * Fonte dos elementos: JPL Small-Body Database (ssd.jpl.nasa.gov). Valores fixos de visualização: a
 * direção e a região ficam corretas; distâncias finas podem variar levemente. Cometas têm e alto
 * (Halley ~0,967), mas o propagador de Kepler já trata órbitas elípticas excêntricas.
 */

import type { OrbitalElements, SmallBodyObjectType } from '@/types';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import { KM_PER_AU } from '@/lib/physicalConstants';
import { symbolicRockRadiusFromDiameter } from '@/lib/radar/asteroidScale';
import type { CometModelKey } from './cometModelRegistry';

/** Prefixo do id sintético de um cometa conhecido. Casa com FamousComets::ID_PREFIX no backend. */
export const KNOWN_COMET_ID_PREFIX = 'comet:';

export type KnownComet = {
    /** Designação cometária (1P, 2P, 67P, C/2020 F3). Identificador estável. */
    designation: string;
    /** Nome próprio exibido. */
    name: string;
    /**
     * Maior dimensão estimada do núcleo, em metros (JPL/ESA). Núcleos de cometa são irregulares (não
     * esferas), então este é o eixo MAIOR, não um diâmetro esférico. Usado para escala visual e card.
     */
    diameterMeters: number;
    /**
     * Descrição honesta do formato/tamanho do núcleo (pt/en), porque "diâmetro" sozinho engana num corpo
     * irregular. Ex.: 67P é bilobado ("patinho"), Halley é alongado tipo amendoim.
     */
    nucleusShape: { pt: string; en: string };
    /**
     * Medida REAL do núcleo, já formatada (pt/en), espelhando a linha "Diâmetro" dos asteroides. Como o
     * núcleo é irregular, mostra os eixos (ex.: 67P "~4,3 × 4,1 × 2,6 km", da Rosetta) quando há sonda
     * que o mapeou, ou o maior eixo estimado (ex.: "~5 km, estimado") quando nunca foi visitado. É a
     * contraparte honesta do diâmetro esférico do asteroide.
     */
    nucleusSize: { pt: string; en: string };
    /** Período orbital em anos (derivado dos elementos; fixo aqui para exibição honesta no card). */
    orbitalPeriodYears: number;
    /** Tipo: sempre 'comet'. */
    objectType: SmallBodyObjectType;
    /**
     * Modelo GLB do núcleo. Só o 67P tem shape model real ('c67p'); os demais usam o cometa genérico
     * ('generic-comet'), pois nenhuma sonda mapeou seus núcleos. Casa com cometModelRegistry.ts.
     */
    modelKey: CometModelKey;
    /** Elementos orbitais osculadores, eclíptico J2000. */
    elements: OrbitalElements;
};

/**
 * Os cometas famosos. Elementos osculadores (eclíptico J2000) do JPL SBDB. tpJd e epochJd são
 * Julian Dates (TDB). A propagação de Kepler usa tpJd como âncora do periélio.
 */
export const KNOWN_COMETS: KnownComet[] = [
    {
        // Núcleo ~15 × 8 km, alongado tipo amendoim (Giotto, 1986). Maior eixo ~15 km.
        designation: '1P',
        name: 'Halley',
        diameterMeters: 15_000,
        nucleusShape: { pt: 'alongado, formato de amendoim', en: 'elongated, peanut-shaped' },
        nucleusSize: { pt: '~15 × 8 km (Giotto, 1986)', en: '~15 × 8 km (Giotto, 1986)' },
        orbitalPeriodYears: 76,
        objectType: 'comet',
        modelKey: 'generic-comet',
        elements: { ec: 0.9679427911271566, qrAu: 0.5859781115141201, inDeg: 162.1951462980701, omDeg: 59.07198973478197, wDeg: 112.2128395742619, tpJd: 2446467.395109823209, epochJd: 2449400.5 },
    },
    {
        // Núcleo ~4,8 km (estimado; nunca visitado por sonda). Cometa de período mais curto conhecido.
        designation: '2P',
        name: 'Encke',
        diameterMeters: 4_800,
        nucleusShape: { pt: 'núcleo rochoso irregular', en: 'irregular rocky nucleus' },
        nucleusSize: { pt: '~4,8 km, estimado', en: '~4.8 km, estimated' },
        orbitalPeriodYears: 3.3,
        objectType: 'comet',
        modelKey: 'generic-comet',
        elements: { ec: 0.8483, qrAu: 0.3360, inDeg: 11.78, omDeg: 334.5680, wDeg: 186.5403, tpJd: 2460416.0, epochJd: 2460400.5 },
    },
    {
        // Núcleo bilobado ("patinho de borracha") ~4,3 × 4,1 × 2,6 km, mapeado pela Rosetta/ESA (2014-16).
        designation: '67P',
        name: '67P Churyumov-Gerasimenko',
        diameterMeters: 4_300,
        nucleusShape: { pt: 'bilobado, formato de "patinho de borracha"', en: 'bilobed, "rubber-duck" shape' },
        nucleusSize: { pt: '~4,3 × 4,1 × 2,6 km (Rosetta)', en: '~4.3 × 4.1 × 2.6 km (Rosetta)' },
        orbitalPeriodYears: 6.4,
        objectType: 'comet',
        modelKey: 'c67p',
        elements: { ec: 0.6499, qrAu: 1.2432, inDeg: 7.0405, omDeg: 36.3318, wDeg: 22.1481, tpJd: 2460993.0, epochJd: 2460400.5 },
    },
];

export type KnownCometPlacement = {
    comet: KnownComet;
    /** Posição na cena, na régua LINEAR dos planetas (Sol na origem). */
    scenePosition: [number, number, number];
};

/**
 * Posição de cena de um cometa conhecido na régua LINEAR dos planetas (helioAUToSunCenteredScene),
 * Sol na origem. Idêntica em régua à dos asteroides conhecidos (knownAsteroidScenePosition): preserva
 * a ordem heliocêntrica. Retorna null se os elementos não permitirem ancorar.
 */
export function knownCometScenePosition(
    comet: KnownComet,
    date: Date = new Date(),
    scale?: number,
): [number, number, number] | null {
    const helio = heliocentricPositionAU(comet.elements, date);
    if (!helio) return null;
    return helioAUToSunCenteredScene(helio, scale);
}

/**
 * Distância HELIOCÊNTRICA (ao Sol) do cometa em km, pela órbita Kepler local, ou null se não ancorar.
 * Usada como rótulo aproximado de distância quando o Horizons não dá posição (ex.: Halley no afélio):
 * para um cometa a dezenas de UA, a Terra (1 UA) é desprezível, então isto aproxima a distância da Terra.
 */
export function knownCometHeliocentricDistanceKm(comet: KnownComet, date: Date = new Date()): number | null {
    const helio = heliocentricPositionAU(comet.elements, date);
    if (!helio) return null;
    const rAu = Math.hypot(helio.x, helio.y, helio.z);
    return rAu * KM_PER_AU;
}

/**
 * Posições de todos os cometas que puderam ser ancorados em `date`, na régua dos planetas.
 * `scale` permite a escala própria do modo linear (default = ORBIT_AU_SCALE da régua normal).
 */
export function knownCometPlacements(date: Date = new Date(), scale?: number): KnownCometPlacement[] {
    return KNOWN_COMETS
        .map((comet) => {
            const scenePosition = knownCometScenePosition(comet, date, scale);
            return scenePosition ? { comet, scenePosition } : null;
        })
        .filter((p): p is KnownCometPlacement => p !== null);
}

/**
 * Escala visual do cometa na cena. Usa a mesma política simbólica dos asteroides
 * (symbolicRockRadiusFromDiameter) a partir do diâmetro do núcleo, para coerência de tamanho na cena.
 */
export function knownCometVisualScale(comet: KnownComet): number {
    return symbolicRockRadiusFromDiameter(comet.diameterMeters);
}

/** Id sintético estável de um cometa (usado como selectedId e para reabrir o card). */
export function knownCometId(comet: KnownComet): string {
    return `${KNOWN_COMET_ID_PREFIX}${comet.designation}`;
}

/** True se o id pertence a um cometa conhecido (e não a um asteroide ou objeto do feed). */
export function isKnownCometId(id: string | null | undefined): boolean {
    return typeof id === 'string' && id.startsWith(KNOWN_COMET_ID_PREFIX);
}

/** Recupera o cometa a partir do seu id sintético (knownCometId), ou null. */
export function knownCometById(id: string | null | undefined): KnownComet | null {
    if (!isKnownCometId(id)) return null;
    const designation = (id as string).slice(KNOWN_COMET_ID_PREFIX.length);
    return KNOWN_COMETS.find((c) => c.designation === designation) ?? null;
}
