import { useState } from 'react';
import type { AsteroidTrajectory, ClosestNowObject, HorizonsFailureKind, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { formatDistanceAU, formatTimestamp } from '@/lib/observatory/format';

type FocusTab = 'summary' | 'physical' | 'approach';

export function FocusCard({
    object,
    onOpenFocus,
    onClose,
    orbitMode,
    hasOrbit,
    canShowOrbitPosition,
    onShowOrbit,
    onShowCloseUp,
    locale,
}: {
    object: ClosestNowObject;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    onClose: () => void;
    orbitMode: boolean;
    /** Osculating elements present — orbit *shape* is drawable. */
    hasOrbit: boolean;
    /**
     * Whether we can place the asteroid on its drawn orbit. Requires a usable tpJd (perihelion
     * epoch) so the Kepler propagation has a time origin. Without it, the shape is drawable but
     * the "current" point on it is not — we keep the orbit button disabled rather than show a
     * fake position alongside the ellipse.
     */
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    locale: 'pt-BR' | 'en';
}) {
    const en = locale === 'en';
    const a = object.approach;
    const [tab, setTab] = useState<FocusTab>('summary');
    const ldText = object.currentDistanceLD !== null ? `${object.currentDistanceLD.toFixed(2)} DL` : '—';
    const auText = formatDistanceAU(object.currentDistanceKm, locale);
    const motion = motionLabel(object.trajectory?.motionState, en);
    const risk = riskAssessment(a, en);
    const summary = humanSummary(object, en);
    const trajectoryStatus = trajectoryStatusBadge(object.trajectory, en);

    return (
        <div className="pointer-events-auto absolute left-3 top-[56%] z-20 flex max-h-[76%] w-[min(24rem,48%)] -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-signal-cyan/25 bg-space-950/92 shadow-glow backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
                <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-white/45">
                        {orbitMode
                            ? (en ? 'On its orbit around the Sun' : 'Em sua órbita ao redor do Sol')
                            : (en ? 'Approach in focus' : 'Aproximação em foco')}
                    </div>
                    <div className="mt-0.5 truncate text-base font-semibold text-white">
                        {a.displayName ?? a.name}
                    </div>
                    {a.subtitle ? (
                        <div className="truncate text-[12px] text-white/55">{a.subtitle}</div>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1 -mt-1 rounded-full p-1 text-white/55 transition outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    aria-label={en ? 'Close focus card' : 'Fechar painel'}
                >
                    ×
                </button>
            </div>

            {/* Risk badge — prominent, color-coded by hazard. */}
            <div className="mt-2 px-3">
                <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${risk.className}`}>
                    <span className="text-base">{risk.icon}</span>
                    <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-tight">{risk.title}</div>
                        <div className="text-[11px] leading-tight opacity-80">{risk.subtitle}</div>
                    </div>
                </div>
            </div>

            {/* Trajectory status — only shown when Horizons data is not available. */}
            {trajectoryStatus ? (
                <div className="mt-1.5 px-3">
                    <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${trajectoryStatus.className}`}>
                        <span aria-hidden="true">{trajectoryStatus.icon}</span>
                        {trajectoryStatus.text}
                    </div>
                </div>
            ) : null}

            {/* Tabs */}
            <div className="mt-2.5 flex gap-1 border-b border-white/10 px-3">
                <FocusTabButton active={tab === 'summary'} onClick={() => setTab('summary')}>{en ? 'Summary' : 'Resumo'}</FocusTabButton>
                <FocusTabButton active={tab === 'physical'} onClick={() => setTab('physical')}>{en ? 'Physical' : 'Físico'}</FocusTabButton>
                <FocusTabButton active={tab === 'approach'} onClick={() => setTab('approach')}>{en ? 'Approach' : 'Aproximação'}</FocusTabButton>
            </div>

            {/* Tab content (scrolls if tall) */}
            <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {tab === 'summary' ? (
                    <div className="space-y-2">
                        <p className="text-[13px] leading-relaxed text-white/80">{summary}</p>
                        <dl className="space-y-1.5 text-[13px]">
                            <Row label={en ? 'Distance from Earth' : 'Distância da Terra'}>
                                {compactKm(object.currentDistanceKm)} <span className="text-white/55">· {ldText} · {auText}</span>
                            </Row>
                            {motion ? (
                                <Row label={en ? 'Status' : 'Status'}>
                                    <span className={motion.className}>{motion.text}</span>
                                </Row>
                            ) : null}
                        </dl>
                    </div>
                ) : null}

                {tab === 'physical' ? (
                    <dl className="space-y-1.5 text-[13px]">
                        <Row label={en ? 'Diameter' : 'Diâmetro'}>
                            {a.diameterMeters
                                ? `${Math.round(a.diameterMeters)} m`
                                : a.estimatedDiameterMinMeters !== null
                                  ? `${Math.round(a.estimatedDiameterMinMeters)}–${Math.round(a.estimatedDiameterMaxMeters ?? 0)} m`
                                  : '—'}
                        </Row>
                        <Row label={en ? 'Size compared to' : 'Tamanho comparável a'}>
                            {sizeComparison(a.diameterMeters ?? a.estimatedDiameterMaxMeters, en)}
                        </Row>
                        <Row label={en ? 'Absolute magnitude (H)' : 'Magnitude absoluta (H)'}>
                            {a.absoluteMagnitude !== null ? a.absoluteMagnitude.toFixed(1) : '—'}
                        </Row>
                        <Row label={en ? 'Type' : 'Tipo'}>
                            {a.objectType === 'comet' ? (en ? 'Comet' : 'Cometa') : (en ? 'Asteroid' : 'Asteroide')}
                        </Row>
                    </dl>
                ) : null}

                {tab === 'approach' ? (
                    <dl className="space-y-1.5 text-[13px]">
                        {a.relativeVelocityKph !== null ? (
                            <Row label={en ? 'Velocity' : 'Velocidade'}>
                                {new Intl.NumberFormat(locale).format(Math.round(a.relativeVelocityKph))} km/h
                            </Row>
                        ) : null}
                        {a.approachDate ? (
                            <Row label={en ? 'Closest approach' : 'Máxima aproximação'}>
                                {formatTimestamp(a.approachDate, locale)}
                            </Row>
                        ) : null}
                        <Row label={en ? 'Min. distance' : 'Distância mínima'}>
                            {a.nominalDistanceKm !== null ? compactKm(a.nominalDistanceKm) : '—'}
                            {a.lunarDistance !== null ? <span className="text-white/55"> · {a.lunarDistance.toFixed(2)} DL</span> : null}
                        </Row>
                        <Row label={en ? 'Source' : 'Fonte'}>JPL/Horizons</Row>
                    </dl>
                ) : null}
            </div>

            {/* Actions — the orbit toggle is the primary CTA; the dossier is secondary. */}
            <div className="space-y-1.5 border-t border-white/10 px-3 py-2.5">
                {hasOrbit ? (
                    <button
                        type="button"
                        onClick={orbitMode ? onShowCloseUp : onShowOrbit}
                        disabled={!orbitMode && !canShowOrbitPosition}
                        title={!orbitMode && !canShowOrbitPosition
                            ? (en
                                ? 'Heliocentric orbit elements incomplete for this object (missing perihelion epoch).'
                                : 'Elementos da órbita heliocêntrica incompletos para este objeto (sem época de periélio).')
                            : undefined}
                        className={[
                            'inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            !orbitMode && !canShowOrbitPosition
                                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                                : orbitMode
                                    ? 'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10'
                                    : 'bg-signal-cyan text-space-950 shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:bg-signal-cyan/90',
                        ].join(' ')}
                    >
                        {orbitMode
                            ? (en ? '↩ Back to the asteroid' : '↩ Voltar ao asteroide')
                            : (en ? '🛰 See its orbit around the Sun' : '🛰 Ver a órbita ao redor do Sol')}
                    </button>
                ) : null}
                {onOpenFocus ? (
                    <button
                        type="button"
                        onClick={() => onOpenFocus(a)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[12px] font-medium text-white/70 transition outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    >
                        {en ? 'Open full dossier' : 'Abrir dossiê completo'}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function FocusTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                '-mb-px border-b-2 px-2 py-1.5 text-[13px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'border-signal-cyan text-white' : 'border-transparent text-white/55 hover:text-white/80',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">{label}</dt>
            <dd className="text-right font-medium text-white/85">{children}</dd>
        </div>
    );
}

/**
 * Color-coded risk read-out from the NASA/JPL hazard flag + distance. We are careful NOT to imply
 * impact: a "potentially hazardous" object is just one big & close enough to be monitored. The copy
 * stays factual and reassuring.
 */
function riskAssessment(a: UnifiedApproach, en: boolean): { icon: string; title: string; subtitle: string; className: string } {
    if (a.hazardFlag) {
        return {
            icon: '⚠️',
            title: en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL',
            subtitle: en ? 'Classified “potentially hazardous” — watched, not on impact course.' : 'Classificado “potencialmente perigoso” — vigiado, sem rota de impacto.',
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

/**
 * A plain-language, one-paragraph summary built from the numbers we already have — no external
 * source needed. Makes the object feel concrete: size, how close, how fast, where it's heading.
 */
function humanSummary(object: ClosestNowObject, en: boolean): string {
    const a = object.approach;
    const d = a.diameterMeters ?? a.estimatedDiameterMaxMeters;
    const sizePt = d ? `de cerca de ${Math.round(d)} metros` : 'de tamanho ainda incerto';
    const sizeEn = d ? `about ${Math.round(d)} meters across` : 'of still-uncertain size';
    const ld = object.currentDistanceLD;
    const distPt = ld !== null ? `a ${ld.toFixed(1)} distâncias lunares da Terra` : 'a uma distância em apuração';
    const distEn = ld !== null ? `${ld.toFixed(1)} lunar distances from Earth` : 'at a distance being refined';
    const vel = a.relativeVelocityKph;
    const velPt = vel !== null ? `, viajando a ${new Intl.NumberFormat('pt-BR').format(Math.round(vel))} km/h` : '';
    const velEn = vel !== null ? `, traveling at ${new Intl.NumberFormat('en').format(Math.round(vel))} km/h` : '';
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

/** A relatable size comparison for a diameter in meters. */
function sizeComparison(meters: number | null, en: boolean): string {
    if (!meters) return '—';
    if (meters < 25) return en ? 'a house' : 'uma casa';
    if (meters < 60) return en ? 'a basketball court' : 'uma quadra de basquete';
    if (meters < 120) return en ? 'a football pitch' : 'um campo de futebol';
    if (meters < 250) return en ? 'a city block' : 'um quarteirão';
    if (meters < 500) return en ? 'a cruise ship' : 'um navio de cruzeiro';
    if (meters < 1000) return en ? 'a small mountain' : 'uma pequena montanha';
    return en ? 'larger than a kilometer' : 'maior que um quilômetro';
}

/**
 * Returns a badge descriptor when Horizons trajectory is unavailable, describing why.
 * Returns null when trajectory is available (nothing to show — good path).
 */
function trajectoryStatusBadge(
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

function motionLabel(
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
