/**
 * Naves e missões famosas (Voyager 1/2, Pioneer 10/11, New Horizons, Juno, James Webb, Parker Solar
 * Probe, Europa Clipper).
 *
 * Responsabilidade: guardar a identidade dessas naves (id do Horizons, nome, ids sintéticos) e uma
 * POSIÇÃO HELIOCÊNTRICA FIXA aproximada (eclíptico J2000, UA) usada como FALLBACK na régua LINEAR dos
 * planetas quando o Horizons falha. É a terceira contraparte de knownAsteroids.ts/knownComets.ts, para
 * objetos artificiais.
 *
 * Por que posição FIXA e não Kepler: naves não seguem órbita kepleriana simples. Os Voyager e os
 * Pioneer estão em trajetória HIPERBÓLICA de escape (já deixaram o Sistema Solar planetário); a Juno
 * orbita Júpiter; o James Webb acompanha a Terra no ponto de equilíbrio L2. Propagar Kepler a partir de
 * elementos daria posição errada. A posição PRINCIPAL vem sempre do JPL Horizons ao vivo (endpoint
 * /radar/spacecraft → SpacecraftPositionSelector no backend), que tem efeméride real dessas naves. Este
 * vetor fixo só entra quando o Horizons falha, garantindo que nenhuma nave suma. É uma aproximação
 * honesta: a DIREÇÃO e a REGIÃO ficam corretas; a distância fina varia com o tempo (naves rápidas se
 * afastam ~3-4 UA/ano), por isso é só rede de segurança, não a fonte primária.
 *
 * Precisão perto da Terra: o payload ao vivo traz também o vetor GEOCÊNTRICO exato (geoAU). Quando a
 * efeméride do frontend está disponível (earthHelioPositionAU, astronomy-engine), a posição resolvida
 * é `Terra_exata + geoAU`, o que importa nas naves próximas (o James Webb fica a só ~0,01 UA da Terra,
 * menor que o erro de qualquer Terra aproximada). O James Webb também tem fallback próprio ancorado na
 * Terra (earthL2OffsetAU): um vetor heliocêntrico fixo envelheceria em semanas, já que ele viaja JUNTO
 * com a Terra.
 *
 * Fonte das posições fixas: JPL Horizons, instantâneo de meados de 2026 (03/07/2026).
 */

import type { ClosestNowObject, SmallBodyObjectType, UnifiedApproach } from '@/types';
import { helioAUToSunCenteredScene } from '@/lib/sceneEphemeris';
import { KM_PER_AU, LUNAR_DISTANCE_KM } from '@/lib/physicalConstants';

/** Prefixo do id sintético de uma nave conhecida. */
export const KNOWN_SPACECRAFT_ID_PREFIX = 'spacecraft:';

/**
 * Escala visual fixa do marcador de nave (SpacecraftMarker tem ~3,4 unidades de largura interna; isto o
 * traz para uma pegada visível na cena, ~0,1 un. de largura). Fixo, não por diâmetro: nave não tem
 * tamanho físico relevante na régua. Vive aqui (módulo puro) para o layer E o foco de câmera
 * compartilharem o mesmo valor sem o hook importar um componente Three.
 */
export const SPACECRAFT_VISUAL_SCALE = 0.03;

/**
 * Meia-largura aproximada do marcador já escalado, usada como RAIO DE FOCO da câmera. As naves ficam a
 * dezenas de milhares de unidades da origem, então o enquadramento tem de ser proporcional ao tamanho do
 * marcador (não à distância à origem), senão a câmera para longe demais e a nave vira um ponto.
 */
export const SPACECRAFT_FOCUS_RADIUS = 1.7 * SPACECRAFT_VISUAL_SCALE;

export type KnownSpacecraft = {
    /** Id da nave no Horizons (SPK negativo, ex.: '-31' = Voyager 1). Identificador estável. */
    horizonsId: string;
    /** Nome próprio exibido. */
    name: string;
    /**
     * Agência e ano de lançamento, formatados (pt/en). Espelham a linha de contexto curta do card,
     * já que nave não tem "diâmetro" nem "tipo de órbita" para mostrar como os corpos naturais.
     */
    operator: { pt: string; en: string };
    /**
     * Posição heliocêntrica FIXA aproximada (eclíptico J2000, UA), instantâneo de meados de 2026.
     * Fallback quando o Horizons falha. Direção e região corretas; distância fina varia com o tempo.
     */
    helioAU: { x: number; y: number; z: number };
    /**
     * Nave ancorada na Terra (só o James Webb): distância do ponto de equilíbrio L2, em UA, na direção
     * antissolar. Quando o Horizons falha, o fallback é calculado a partir da TERRA ATUAL (efeméride do
     * frontend) em vez do vetor fixo global, que envelheceria em semanas (a nave viaja junto com a Terra).
     */
    earthL2OffsetAU?: number;
    /** Tipo: sempre 'spacecraft'. */
    objectType: SmallBodyObjectType;
};

/**
 * As naves famosas. helioAU é um instantâneo de meados de 2026 do JPL Horizons (vetor heliocêntrico
 * eclíptico J2000, UA). Só usado como fallback de posição quando o Horizons ao vivo falha.
 */
export const KNOWN_SPACECRAFT: KnownSpacecraft[] = [
    {
        // Objeto humano mais distante. ~171 UA, alto acima do plano eclíptico (rumo norte galáctico).
        horizonsId: '-31',
        name: 'Voyager 1',
        operator: { pt: 'NASA, lançada em 1977', en: 'NASA, launched 1977' },
        helioAU: { x: -32.0, y: -136.0, z: 98.4 },
        objectType: 'spacecraft',
    },
    {
        // Segundo objeto humano mais distante. ~143 UA, mergulhando abaixo do plano eclíptico (rumo sul).
        horizonsId: '-32',
        name: 'Voyager 2',
        operator: { pt: 'NASA, lançada em 1977', en: 'NASA, launched 1977' },
        helioAU: { x: 39.7, y: -104.9, z: -89.1 },
        objectType: 'spacecraft',
    },
    {
        // ~141 UA. Telemetria perdida em 2003; o Horizons ainda propaga a trajetória do escape.
        horizonsId: '-23',
        name: 'Pioneer 10',
        operator: { pt: 'NASA, lançada em 1972', en: 'NASA, launched 1972' },
        helioAU: { x: 24.0, y: 139.0, z: 7.4 },
        objectType: 'spacecraft',
    },
    {
        // ~117 UA, acima do plano eclíptico, rumo à constelação da Águia. Muda desde 1995; o Horizons
        // ainda propaga a trajetória do escape.
        horizonsId: '-24',
        name: 'Pioneer 11',
        operator: { pt: 'NASA, lançada em 1973', en: 'NASA, launched 1973' },
        helioAU: { x: 28.9, y: -110.2, z: 28.1 },
        objectType: 'spacecraft',
    },
    {
        // ~65 UA, além de Plutão, a caminho do espaço interestelar pelo cinturão de Kuiper.
        horizonsId: '-98',
        name: 'New Horizons',
        operator: { pt: 'NASA, lançada em 2006', en: 'NASA, launched 2006' },
        helioAU: { x: 20.6, y: -61.6, z: 2.3 },
        objectType: 'spacecraft',
    },
    {
        // Orbita Júpiter (~5,3 UA). Na régua aparece colada ao planeta (a órbita ao redor é sub-pixel).
        horizonsId: '-61',
        name: 'Juno',
        operator: { pt: 'NASA, lançada em 2011', en: 'NASA, launched 2011' },
        helioAU: { x: -2.88, y: 4.41, z: 0.01 },
        objectType: 'spacecraft',
    },
    {
        // Acompanha a Terra no ponto de equilíbrio L2, ~0,01 UA na direção antissolar (~3,5 unidades de
        // cena, bem fora do disco visual da Terra). O vetor fixo é só o último recurso: o fallback real
        // é earthL2OffsetAU a partir da Terra atual, porque a nave viaja junto com ela.
        horizonsId: '-170',
        name: 'James Webb',
        operator: { pt: 'NASA, ESA e CSA, lançado em 2021', en: 'NASA, ESA and CSA, launched 2021' },
        helioAU: { x: 0.19, y: -1.01, z: -0.002 },
        earthL2OffsetAU: 0.0101,
        objectType: 'spacecraft',
    },
    {
        // Órbita solar elíptica de ~88 dias entre ~0,05 e ~0,7 UA. É a nave que MAIS se move da lista:
        // o vetor fixo indica só a região (interior à órbita da Terra); a posição real é a do Horizons.
        horizonsId: '-96',
        name: 'Parker Solar Probe',
        operator: { pt: 'NASA, lançada em 2018', en: 'NASA, launched 2018' },
        helioAU: { x: 0.44, y: -0.46, z: -0.032 },
        objectType: 'spacecraft',
    },
    {
        // Em cruzeiro (~1,5 UA do Sol), voltando em direção à Terra para a assistência gravitacional de
        // dezembro de 2026, a caminho de Júpiter (chegada em 2030).
        horizonsId: '-159',
        name: 'Europa Clipper',
        operator: { pt: 'NASA, lançada em 2024', en: 'NASA, launched 2024' },
        helioAU: { x: -0.18, y: -1.48, z: -0.011 },
        objectType: 'spacecraft',
    },
];

export type KnownSpacecraftPlacement = {
    craft: KnownSpacecraft;
    /** Posição na cena, na régua LINEAR dos planetas (Sol na origem). */
    scenePosition: [number, number, number];
    /** True se a posição veio do Horizons ao vivo; false se é o vetor fixo de fallback. */
    live: boolean;
};

/** Vetor em UA no eclíptico J2000 (heliocêntrico ou geocêntrico, conforme o campo). */
type HelioAU = { x: number; y: number; z: number };

/** Posição ao vivo de uma nave (do endpoint /radar/spacecraft). */
export type LiveSpacecraftPosition = {
    /** Heliocêntrico com Terra aproximada (backend). Compatibilidade quando não há efeméride local. */
    helioAU: HelioAU;
    /** Geocêntrico EXATO do Horizons. Com a Terra exata do frontend, dá a posição precisa. */
    geoAU?: HelioAU;
};

/** Mapa horizonsId → posição ao vivo (do endpoint /radar/spacecraft). */
export type LiveSpacecraftPositions = Record<string, LiveSpacecraftPosition>;

/**
 * Distância heliocêntrica mínima, em UA, para a distância ao Sol valer como aproximação HONESTA da
 * distância à Terra (erro máximo de ~10%, já que a Terra fica a 1 UA do Sol). Abaixo disso, sem uma
 * posição de Terra para subtrair, é melhor não mostrar número nenhum do que mostrar um errado.
 */
const HELIO_AS_EARTH_DISTANCE_MIN_AU = 10;

/**
 * Vetor heliocêntrico EFETIVO da nave: a posição ao vivo do Horizons quando disponível, senão o
 * fallback local. Fonte única para layer, foco e card, garantindo que todos usem a mesma posição.
 *
 * `earthHelioAU` é a posição heliocêntrica exata da Terra (efeméride do frontend). Com ela:
 * - a posição ao vivo é `Terra_exata + geoAU` (precisa mesmo a 0,01 UA, caso do James Webb);
 * - o fallback do James Webb é ancorado na Terra ATUAL (ponto antissolar + earthL2OffsetAU), porque um
 *   vetor fixo global envelhece em semanas para uma nave que viaja junto com a Terra.
 * Sem ela, vale o helioAU do payload (Terra aproximada) ou o vetor fixo local.
 */
export function resolveSpacecraftHelioAU(
    craft: KnownSpacecraft,
    live?: LiveSpacecraftPositions,
    earthHelioAU?: HelioAU | null,
): { helioAU: HelioAU; live: boolean } {
    const livePos = live?.[craft.horizonsId];
    if (livePos) {
        if (livePos.geoAU && earthHelioAU) {
            return {
                helioAU: {
                    x: earthHelioAU.x + livePos.geoAU.x,
                    y: earthHelioAU.y + livePos.geoAU.y,
                    z: earthHelioAU.z + livePos.geoAU.z,
                },
                live: true,
            };
        }
        return { helioAU: livePos.helioAU, live: true };
    }

    if (craft.earthL2OffsetAU != null && earthHelioAU) {
        const earthDistanceAU = Math.hypot(earthHelioAU.x, earthHelioAU.y, earthHelioAU.z);
        if (earthDistanceAU > 1e-6) {
            // L2 fica na reta Sol→Terra, além da Terra: escalar o vetor da Terra o alcança.
            const factor = 1 + craft.earthL2OffsetAU / earthDistanceAU;
            return {
                helioAU: { x: earthHelioAU.x * factor, y: earthHelioAU.y * factor, z: earthHelioAU.z * factor },
                live: false,
            };
        }
    }

    return { helioAU: craft.helioAU, live: false };
}

/**
 * Distância da nave À TERRA em km (a métrica que o radar exibe), ou null quando não dá para calcular
 * com honestidade. Prioridade: geoAU ao vivo (exato) → vetor efetivo menos a Terra exata → distância
 * heliocêntrica como ordem de grandeza, mas SÓ para naves distantes (a dezenas de UA a Terra é
 * desprezível; a 1 UA seria um erro de até 100%, caso do James Webb).
 */
export function knownSpacecraftEarthDistanceKm(
    craft: KnownSpacecraft,
    live?: LiveSpacecraftPositions,
    earthHelioAU?: HelioAU | null,
): number | null {
    const geoAU = live?.[craft.horizonsId]?.geoAU;
    if (geoAU) return Math.hypot(geoAU.x, geoAU.y, geoAU.z) * KM_PER_AU;

    const { helioAU } = resolveSpacecraftHelioAU(craft, live, earthHelioAU);
    if (earthHelioAU) {
        return Math.hypot(helioAU.x - earthHelioAU.x, helioAU.y - earthHelioAU.y, helioAU.z - earthHelioAU.z) * KM_PER_AU;
    }

    const helioDistanceAU = Math.hypot(helioAU.x, helioAU.y, helioAU.z);
    return helioDistanceAU >= HELIO_AS_EARTH_DISTANCE_MIN_AU ? helioDistanceAU * KM_PER_AU : null;
}

/**
 * Posição de cena de uma nave conhecida na régua LINEAR dos planetas (helioAUToSunCenteredScene),
 * Sol na origem. Usa a posição ao vivo (live) quando disponível, senão o fallback. Idêntica em
 * régua à dos cometas/asteroides conhecidos: preserva a ordem heliocêntrica real.
 */
export function knownSpacecraftScenePosition(
    craft: KnownSpacecraft,
    scale?: number,
    live?: LiveSpacecraftPositions,
    earthHelioAU?: HelioAU | null,
): [number, number, number] {
    return helioAUToSunCenteredScene(resolveSpacecraftHelioAU(craft, live, earthHelioAU).helioAU, scale);
}

/**
 * Distância HELIOCÊNTRICA (ao Sol) da nave em km. Usa a posição ao vivo quando disponível, senão o
 * vetor fixo. Para a distância exibida no card (da Terra), use knownSpacecraftEarthDistanceKm.
 */
export function knownSpacecraftHeliocentricDistanceKm(craft: KnownSpacecraft, live?: LiveSpacecraftPositions): number {
    const { x, y, z } = resolveSpacecraftHelioAU(craft, live).helioAU;
    return Math.hypot(x, y, z) * KM_PER_AU;
}

/** Posições de todas as naves na régua dos planetas. `scale` permite a escala do modo linear. */
export function knownSpacecraftPlacements(
    scale?: number,
    live?: LiveSpacecraftPositions,
    earthHelioAU?: HelioAU | null,
): KnownSpacecraftPlacement[] {
    return KNOWN_SPACECRAFT.map((craft) => {
        const resolved = resolveSpacecraftHelioAU(craft, live, earthHelioAU);
        return {
            craft,
            scenePosition: helioAUToSunCenteredScene(resolved.helioAU, scale),
            live: resolved.live,
        };
    });
}

/** Id sintético estável de uma nave (usado como selectedId e para reabrir o card). */
export function knownSpacecraftId(craft: KnownSpacecraft): string {
    return `${KNOWN_SPACECRAFT_ID_PREFIX}${craft.horizonsId}`;
}

/** True se o id pertence a uma nave conhecida (e não a um asteroide, cometa ou objeto do feed). */
export function isKnownSpacecraftId(id: string | null | undefined): boolean {
    return typeof id === 'string' && id.startsWith(KNOWN_SPACECRAFT_ID_PREFIX);
}

/** Recupera a nave a partir do seu id sintético (knownSpacecraftId), ou null. */
export function knownSpacecraftById(id: string | null | undefined): KnownSpacecraft | null {
    if (!isKnownSpacecraftId(id)) return null;
    const horizonsId = (id as string).slice(KNOWN_SPACECRAFT_ID_PREFIX.length);
    return KNOWN_SPACECRAFT.find((c) => c.horizonsId === horizonsId) ?? null;
}

/**
 * "approach" sintético de uma nave (UnifiedApproach), só para alimentar o card local quando ela é
 * selecionada. Naves não vêm do feed (vivem na cena como os planetas), então não há um objeto do feed:
 * este é montado no front. Campos de distância/data/velocidade/diâmetro ficam null de propósito (nave
 * não tem aproximação nem medida física honesta). A distância exibida vem à parte, no ClosestNowObject
 * (knownSpacecraftEarthDistanceKm). objectType 'spacecraft' dá o eyebrow próprio e a aba História
 * (famousLore casa pelo id spacecraft:<horizonsId>).
 */
export function knownSpacecraftToApproach(craft: KnownSpacecraft): UnifiedApproach {
    const id = knownSpacecraftId(craft);
    return {
        id,
        source: 'cad',
        sourceLabel: 'JPL Horizons',
        rawName: craft.name,
        name: craft.name,
        displayName: craft.name,
        designation: craft.horizonsId,
        spkId: null,
        permanentNumber: null,
        properName: craft.name,
        provisionalDesignation: null,
        aliases: [craft.name.toLowerCase()],
        objectType: 'spacecraft',
        approachDate: null,
        approachBody: null,
        nominalDistanceKm: null,
        nominalDistanceMiles: null,
        lunarDistance: null,
        relativeVelocityKph: null,
        relativeVelocityKms: null,
        estimatedDiameterMinMeters: null,
        estimatedDiameterMaxMeters: null,
        diameterMeters: null,
        hazardFlag: false,
        detailIdentifier: craft.horizonsId,
        detailSource: 'sbdb',
        detailRoute: '',
        orbitId: null,
        absoluteMagnitude: null,
        distanceContext: {
            kilometers: null,
            miles: null,
            lunarDistance: null,
            lunarReferenceKm: LUNAR_DISTANCE_KM,
            earthDiametersApprox: null,
            proximityBand: 'unknown',
            headline: '',
            comparison: '',
        },
    };
}

/**
 * ClosestNowObject sintético de uma nave, para o card (kind="asteroid") reaproveitar toda a máquina de
 * exibição. trajectory null (sem trilha do Horizons aqui, só a posição pontual). currentDistanceKm é a
 * distância DA TERRA (knownSpacecraftEarthDistanceKm): exata com geoAU ao vivo, derivada da Terra da
 * efeméride no fallback, e null quando não dá para calcular com honestidade. `hasRealCurrentDistance`
 * segue se a posição é AO VIVO do Horizons (live=true) ou fallback aproximado (live=false): o card usa
 * isso para o selo de "posição aproximada".
 */
export function knownSpacecraftToClosestNowObject(
    craft: KnownSpacecraft,
    live?: LiveSpacecraftPositions,
    earthHelioAU?: HelioAU | null,
): ClosestNowObject {
    const resolved = resolveSpacecraftHelioAU(craft, live, earthHelioAU);
    const distanceKm = knownSpacecraftEarthDistanceKm(craft, live, earthHelioAU);
    return {
        approach: knownSpacecraftToApproach(craft),
        trajectory: null,
        currentDistanceKm: distanceKm,
        currentDistanceLD: distanceKm != null ? distanceKm / LUNAR_DISTANCE_KM : null,
        hasRealCurrentDistance: resolved.live,
    };
}
