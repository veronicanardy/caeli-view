/**
 * Responsabilidade: derivar a leitura de QUALIDADE DE DADOS do radar a partir dos objetos do
 * closest-now. Alimenta exclusivamente o RadarDataQualityCard (objeto do momento, vizinhança lunar,
 * cobertura Horizons vs. simbólica).
 *
 * NÃO posiciona nada na cena 3D: o posicionamento real lê `object.trajectory.currentPoint` direto
 * (ver Components/Radar/Scene/AsteroidSceneLayer + lib/radar/trajectorySampling). Este módulo derivava
 * antes um segundo pipeline de posição (reempacotando a trajetória num shape que a cena nunca consumia);
 * isso foi removido para não haver duas fontes de verdade sobre "esse objeto tem posição real?".
 */
import { ClosestNowObject } from '@/types';
import { LUNAR_DISTANCE_KM, lunarDistanceFromKm } from '@/lib/format';

export type RadarClassification = 'within-lunar' | 'near-moon' | 'beyond-moon' | 'far';

/** Objeto enxuto consumido pelo card de qualidade. Sem geometria de cena — só leitura interpretativa. */
export type RadarObject = {
    approach: ClosestNowObject['approach'];

    distanceKm: number | null;
    distanceLD: number | null;
    classification: RadarClassification;

    closestApproachTime: string | null;
    relativeVelocityKph: number | null;

    /** Tem posição espacial real do Horizons agora (trajetória disponível com ponto atual). */
    hasHorizonsPosition: boolean;
    /** Sem posição espacial: representado só pela distância (aproximação máxima nominal). */
    isSymbolicFallback: boolean;
};

/** Classifica a distância lunar em uma das quatro faixas visuais do radar. */
export function classifyDistance(distanceLD: number | null): RadarClassification {
    if (distanceLD === null || !Number.isFinite(distanceLD)) {
        return 'far';
    }
    if (distanceLD < 1) return 'within-lunar';
    if (distanceLD <= 2) return 'near-moon';
    if (distanceLD <= 20) return 'beyond-moon';
    return 'far';
}

/** O objeto tem posição espacial real do Horizons agora? (trajetória disponível com ponto atual) */
export function hasCurrentHorizonsPosition(object: ClosestNowObject): boolean {
    const traj = object.trajectory;
    return traj?.status === 'available' && traj?.currentPoint != null;
}

/**
 * Melhor distância em km disponível: prefere a distância atual já computada pelo backend
 * (derivada do Horizons); cai para a distância nominal da aproximação como fallback.
 */
export function bestDistanceKm(object: ClosestNowObject): number | null {
    if (object.currentDistanceKm != null) {
        return object.currentDistanceKm;
    }
    return object.approach.nominalDistanceKm;
}

/** Melhor distância em DL disponível: prefere a do backend; deriva de km/nominal como fallback. */
export function bestDistanceLD(object: ClosestNowObject): number | null {
    if (object.currentDistanceLD != null) {
        return object.currentDistanceLD;
    }
    const km = object.approach.nominalDistanceKm;
    if (km !== null) return km / LUNAR_DISTANCE_KM;
    return object.approach.lunarDistance ?? lunarDistanceFromKm(km);
}

/** Constrói a lista de RadarObject (qualidade de dados) a partir dos objetos do closest-now. */
export function buildRadarObjects(objects: ClosestNowObject[]): RadarObject[] {
    return objects.map((object) => {
        const hasHorizons = hasCurrentHorizonsPosition(object);
        const distanceLD = bestDistanceLD(object);

        return {
            approach: object.approach,
            distanceKm: bestDistanceKm(object),
            distanceLD,
            classification: classifyDistance(distanceLD),
            closestApproachTime: object.trajectory?.closestApproachTime ?? object.approach.approachDate ?? null,
            relativeVelocityKph: object.approach.relativeVelocityKph,
            hasHorizonsPosition: hasHorizons,
            isSymbolicFallback: !hasHorizons,
        };
    });
}

/** Contagens de qualidade de dados: total, com posição Horizons, simbólicos, dentro da DL. */
export function radarQualityCounts(objects: RadarObject[]) {
    let withHorizons = 0;
    let symbolic = 0;
    let withinLunar = 0;
    for (const object of objects) {
        if (object.hasHorizonsPosition) withHorizons += 1;
        else symbolic += 1;
        if (object.classification === 'within-lunar') withinLunar += 1;
    }
    return { total: objects.length, withHorizons, symbolic, withinLunar };
}
