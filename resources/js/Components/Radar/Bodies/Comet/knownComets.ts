/**
 * Cometas famosos com identidade fixa (Halley, Encke, 67P, NEOWISE).
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
 * modelKey casa com cometModelRegistry.ts: o 67P tem shape model real (Rosetta/DLR); Halley, Encke e
 * NEOWISE usam o núcleo real do Tempel 1 (Deep Impact) como forma representativa, por não terem modelo
 * próprio. Ambos os GLBs são núcleos de cometa reais, coerentes com os asteroides reais da cena.
 *
 * Fonte dos elementos: JPL Small-Body Database (ssd.jpl.nasa.gov). Valores fixos de visualização: a
 * direção e a região ficam corretas; distâncias finas podem variar levemente. Cometas têm e alto
 * (Halley ~0,967), mas o propagador de Kepler já trata órbitas elípticas excêntricas.
 */

import type { OrbitalElements, SmallBodyObjectType } from '@/types';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import { symbolicRockRadiusFromDiameter } from '@/lib/radar/asteroidScale';
import type { CometModelKey } from './cometModelRegistry';

/** Prefixo do id sintético de um cometa conhecido. Casa com FamousComets::ID_PREFIX no backend. */
export const KNOWN_COMET_ID_PREFIX = 'comet:';

export type KnownComet = {
    /** Designação cometária (1P, 2P, 67P, C/2020 F3). Identificador estável. */
    designation: string;
    /** Nome próprio exibido. */
    name: string;
    /** Diâmetro médio estimado do núcleo, em metros (JPL/ESA). Usado para escala visual e card. */
    diameterMeters: number;
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
        designation: '1P',
        name: 'Halley',
        diameterMeters: 11_000,
        objectType: 'comet',
        modelKey: 'generic-comet',
        elements: { ec: 0.9679427911271566, qrAu: 0.5859781115141201, inDeg: 162.1951462980701, omDeg: 59.07198973478197, wDeg: 112.2128395742619, tpJd: 2446467.395109823209, epochJd: 2449400.5 },
    },
    {
        designation: '2P',
        name: 'Encke',
        diameterMeters: 4_800,
        objectType: 'comet',
        modelKey: 'generic-comet',
        elements: { ec: 0.8483, qrAu: 0.3360, inDeg: 11.78, omDeg: 334.5680, wDeg: 186.5403, tpJd: 2460416.0, epochJd: 2460400.5 },
    },
    {
        designation: '67P',
        name: '67P Churyumov-Gerasimenko',
        diameterMeters: 4_000,
        objectType: 'comet',
        modelKey: 'c67p',
        elements: { ec: 0.6499, qrAu: 1.2432, inDeg: 7.0405, omDeg: 36.3318, wDeg: 22.1481, tpJd: 2460993.0, epochJd: 2460400.5 },
    },
    {
        designation: 'C/2020 F3',
        name: 'NEOWISE',
        diameterMeters: 5_000,
        objectType: 'comet',
        modelKey: 'generic-comet',
        elements: { ec: 0.99921, qrAu: 0.2947, inDeg: 128.9375, omDeg: 61.0117, wDeg: 37.2785, tpJd: 2459035.0, epochJd: 2459000.5 },
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
