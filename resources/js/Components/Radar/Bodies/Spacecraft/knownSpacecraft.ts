/**
 * Naves e missões interplanetárias famosas (Voyager 1/2, Pioneer 10, New Horizons, Juno).
 *
 * Responsabilidade: guardar a identidade dessas naves (id do Horizons, nome, ids sintéticos) e uma
 * POSIÇÃO HELIOCÊNTRICA FIXA aproximada (eclíptico J2000, UA) usada como FALLBACK na régua LINEAR dos
 * planetas quando o Horizons falha. É a terceira contraparte de knownAsteroids.ts/knownComets.ts, para
 * objetos artificiais.
 *
 * Por que posição FIXA e não Kepler: naves não seguem órbita kepleriana simples. Os Voyager e o Pioneer
 * estão em trajetória HIPERBÓLICA de escape (já deixaram o Sistema Solar planetário); a Juno orbita
 * Júpiter. Propagar Kepler a partir de elementos daria posição errada. A posição PRINCIPAL vem sempre do
 * JPL Horizons ao vivo (endpoint /radar/famous → FamousSpacecraft no backend), que tem efeméride real
 * dessas naves. Este vetor fixo só entra quando o Horizons falha, garantindo que nenhuma nave suma. É
 * uma aproximação honesta: a DIREÇÃO e a REGIÃO ficam corretas; a distância fina varia com o tempo
 * (naves rápidas se afastam ~3-4 UA/ano), por isso é só rede de segurança, não a fonte primária.
 *
 * Fonte das posições: JPL Horizons, instantâneo de meados de 2026. Sem modelo 3D: o marcador é
 * estilizado (spacecraftModelRegistry), padrão "genérico agora, modelo real depois" dos cometas.
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
];

export type KnownSpacecraftPlacement = {
    craft: KnownSpacecraft;
    /** Posição na cena, na régua LINEAR dos planetas (Sol na origem). */
    scenePosition: [number, number, number];
    /** True se a posição veio do Horizons ao vivo; false se é o vetor fixo de fallback. */
    live: boolean;
};

/** Vetor heliocêntrico em UA. */
type HelioAU = { x: number; y: number; z: number };

/** Mapa horizonsId → posição heliocêntrica ao vivo (do endpoint /radar/spacecraft). */
export type LiveSpacecraftPositions = Record<string, HelioAU>;

/**
 * Vetor heliocêntrico EFETIVO da nave: a posição ao vivo do Horizons quando disponível, senão o vetor
 * fixo local. Fonte única para layer, foco e card, garantindo que todos usem a mesma posição.
 */
export function resolveSpacecraftHelioAU(
    craft: KnownSpacecraft,
    live?: LiveSpacecraftPositions,
): { helioAU: HelioAU; live: boolean } {
    const livePos = live?.[craft.horizonsId];
    return livePos ? { helioAU: livePos, live: true } : { helioAU: craft.helioAU, live: false };
}

/**
 * Posição de cena de uma nave conhecida na régua LINEAR dos planetas (helioAUToSunCenteredScene),
 * Sol na origem. Usa a posição ao vivo (live) quando disponível, senão o vetor fixo. Idêntica em
 * régua à dos cometas/asteroides conhecidos: preserva a ordem heliocêntrica real.
 */
export function knownSpacecraftScenePosition(
    craft: KnownSpacecraft,
    scale?: number,
    live?: LiveSpacecraftPositions,
): [number, number, number] {
    return helioAUToSunCenteredScene(resolveSpacecraftHelioAU(craft, live).helioAU, scale);
}

/**
 * Distância HELIOCÊNTRICA (ao Sol) da nave em km. Usa a posição ao vivo quando disponível, senão o
 * vetor fixo. A dezenas/centenas de UA, a Terra (1 UA) é desprezível, então isto aproxima também a
 * distância da Terra. Honesto como ordem de grandeza.
 */
export function knownSpacecraftHeliocentricDistanceKm(craft: KnownSpacecraft, live?: LiveSpacecraftPositions): number {
    const { x, y, z } = resolveSpacecraftHelioAU(craft, live).helioAU;
    return Math.hypot(x, y, z) * KM_PER_AU;
}

/** Posições de todas as naves na régua dos planetas. `scale` permite a escala do modo linear. */
export function knownSpacecraftPlacements(scale?: number, live?: LiveSpacecraftPositions): KnownSpacecraftPlacement[] {
    return KNOWN_SPACECRAFT.map((craft) => {
        const resolved = resolveSpacecraftHelioAU(craft, live);
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
 * não tem aproximação nem medida física honesta). A distância exibida é a HELIOCÊNTRICA aproximada, em
 * LD, só para o card ter uma ordem de grandeza. objectType 'spacecraft' dá o eyebrow próprio e a aba
 * História (famousLore casa pelo id spacecraft:<horizonsId>).
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
 * exibição. trajectory null (sem trilha do Horizons aqui, só a posição pontual); a distância
 * heliocêntrica entra em currentDistanceKm. `hasRealCurrentDistance` segue se a posição é AO VIVO do
 * Horizons (live=true) ou o vetor fixo aproximado (live=false): o card usa isso para o selo de
 * "posição aproximada" quando é fallback.
 */
export function knownSpacecraftToClosestNowObject(
    craft: KnownSpacecraft,
    live?: LiveSpacecraftPositions,
): ClosestNowObject {
    const resolved = resolveSpacecraftHelioAU(craft, live);
    const distanceKm = Math.hypot(resolved.helioAU.x, resolved.helioAU.y, resolved.helioAU.z) * KM_PER_AU;
    return {
        approach: knownSpacecraftToApproach(craft),
        trajectory: null,
        currentDistanceKm: distanceKm,
        currentDistanceLD: distanceKm / LUNAR_DISTANCE_KM,
        hasRealCurrentDistance: resolved.live,
    };
}
