/**
 * Helpers de apresentação do `FocusCard`.
 *
 * Responsabilidade: montar textos, badges e leituras visuais a partir de dados
 * já recebidos. Não chama APIs, não calcula órbita e não decide ranking.
 */

import type { AsteroidTrajectory, ClosestNowObject, HorizonsFailureKind, SmallBodyObjectType, UnifiedApproach } from '@/types';

export function objectTypeEyebrow(
    objectType: SmallBodyObjectType,
    en: boolean,
): { label: string; dotColor: string } {
    if (objectType === 'comet') {
        return {
            label: en ? 'Comet · Near-Earth Object' : 'Cometa · Objeto Próximo da Terra',
            dotColor: '#f8c76b',
        };
    }
    return {
        label: en ? 'Asteroid · Near-Earth Object' : 'Asteroide · Objeto Próximo da Terra',
        dotColor: '#54d6d6',
    };
}

export function riskAssessment(a: UnifiedApproach, en: boolean): { icon: string; title: string; subtitle: string; className: string } {
    if (a.hazardFlag) {
        return {
            icon: '⚠️',
            title: en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL',
            subtitle: en ? 'Classified “potentially hazardous”, closely monitored, not on impact course.' : 'Classificado “potencialmente perigoso”, monitorado de perto, sem rota de impacto.',
            className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
        };
    }
    return {
        icon: '✓',
        title: en ? 'No impact risk' : 'Sem risco de impacto',
        subtitle: en ? 'A routine close pass — not flagged as hazardous.' : 'Passagem próxima rotineira — não sinalizado como perigoso.',
        className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    };
}

export function humanSummary(object: ClosestNowObject, en: boolean): string {
    const a = object.approach;
    const d = a.diameterMeters ?? a.estimatedDiameterMaxMeters ?? null;
    const sizePt = d != null && isFinite(d) ? `de cerca de ${Math.round(d)} metros` : 'de tamanho ainda incerto';
    const sizeEn = d != null && isFinite(d) ? `about ${Math.round(d)} meters across` : 'of still-uncertain size';
    const ld = object.currentDistanceLD;
    const distPt = ld != null && isFinite(ld) ? `a ${ld.toFixed(1)} distâncias lunares da Terra` : 'a uma distância em apuração';
    const distEn = ld != null && isFinite(ld) ? `${ld.toFixed(1)} lunar distances from Earth` : 'at a distance being refined';
    const vel = a.relativeVelocityKph ?? object.trajectory?.currentVelocityKph ?? null;
    const velPt = vel != null && isFinite(vel) ? `, viajando a ${new Intl.NumberFormat('pt-BR').format(Math.round(vel))} km/h` : ', com velocidade não informada';
    const velEn = vel != null && isFinite(vel) ? `, traveling at ${new Intl.NumberFormat('en').format(Math.round(vel))} km/h` : ', with velocity not on record';
    const motionPt = object.trajectory?.motionState === 'approaching' ? ' Está se aproximando agora.'
        : object.trajectory?.motionState === 'receding' ? ' Já está se afastando.'
        : object.trajectory?.motionState === 'near_closest' ? ' Está perto da máxima aproximação.' : '';
    const motionEn = object.trajectory?.motionState === 'approaching' ? ' It is approaching now.'
        : object.trajectory?.motionState === 'receding' ? ' It is already receding.'
        : object.trajectory?.motionState === 'near_closest' ? ' It is near its closest approach.' : '';
    const safePt = a.hazardFlag ? ' É monitorado, mas não está em rota de impacto.' : ' Não representa risco de impacto.';
    const safeEn = a.hazardFlag ? ' It is monitored, but not on an impact course.' : ' It poses no impact risk.';

    return en
        ? `A rock ${sizeEn}, currently ${distEn}${velEn}.${motionEn}${safeEn}`
        : `Uma rocha ${sizePt}, atualmente ${distPt}${velPt}.${motionPt}${safePt}`;
}

export function sizeComparison(meters: number | null, en: boolean): string {
    if (!meters) return '—';
    if (meters <= 2)    return en ? 'a person' : 'uma pessoa';
    if (meters <= 6)    return en ? 'a car' : 'um carro';
    if (meters <= 14)   return en ? 'a bus' : 'um ônibus';
    if (meters <= 30)   return en ? 'a house' : 'uma casa';
    if (meters <= 60)   return en ? 'the Christ the Redeemer statue' : 'o Cristo Redentor';
    if (meters <= 120)  return en ? 'a football pitch' : 'um campo de futebol';
    if (meters <= 300)  return en ? 'the Statue of Liberty' : 'a Estátua da Liberdade';
    if (meters <= 1000) return en ? 'the Eiffel Tower' : 'a Torre Eiffel';
    return en ? 'larger than a kilometer' : 'maior que um quilômetro';
}

export function trajectoryStatusBadge(
    trajectory: AsteroidTrajectory | null | undefined,
    en: boolean,
): { icon: string; text: string; className: string } | null {
    if (trajectory?.status === 'available') {
        return null;
    }

    const kind: HorizonsFailureKind | null | undefined = trajectory?.horizonsFailureKind;

    if (kind === 'horizons_transient') {
        return {
            icon: '⚡',
            text: en
                ? 'Horizons temporarily unavailable — symbolic distance only.'
                : 'Horizons temporariamente indisponível — apenas distância simbólica.',
            className: 'border-amber-400/30 bg-amber-500/10 text-amber-200/80',
        };
    }

    if (kind === 'no_ephemeris') {
        return {
            icon: '🕐',
            text: en
                ? 'Recently discovered — ephemeris not yet in Horizons. Distance from catalog.'
                : 'Descoberto recentemente — efeméride ainda não disponível no Horizons. Distância do catálogo.',
            className: 'border-sky-400/30 bg-sky-500/10 text-sky-200/80',
        };
    }

    if (kind === 'no_orbital_data') {
        return {
            icon: '—',
            text: en
                ? 'No Horizons identifier available for this object.'
                : 'Sem identificador Horizons disponível para este objeto.',
            className: 'border-white/15 bg-white/5 text-white/50',
        };
    }

    if (trajectory === null || trajectory === undefined) {
        return null;
    }

    return {
        icon: '○',
        text: en ? 'Symbolic placement — approach distance only.' : 'Posição simbólica — apenas distância da aproximação.',
        className: 'border-white/15 bg-white/5 text-white/50',
    };
}

export function motionLabel(
    state: AsteroidTrajectory['motionState'] | undefined,
    en: boolean,
): { text: string; className: string } | null {
    switch (state) {
        case 'approaching':
            return { text: en ? 'Approaching' : 'Aproximando', className: 'text-amber-200' };
        case 'receding':
            return { text: en ? 'Receding' : 'Afastando', className: 'text-emerald-200' };
        case 'near_closest':
            return { text: en ? 'Near closest approach' : 'Perto da máxima aproximação', className: 'text-sky-200' };
        default:
            return null;
    }
}
