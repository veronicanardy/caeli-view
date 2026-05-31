import { useState, type Ref } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AsteroidTrajectory, ClosestNowObject, HorizonsFailureKind, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { formatDistanceAU, formatTimestamp } from '@/lib/observatory/format';
import { PanelShell } from './PanelShell';

type FocusTab = 'summary' | 'physical' | 'approach';
type FocusMobileSection = FocusTab | 'actions';

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
    mobileTopAlign,
    onShowPanel,
    panelRef,
}: {
    object: ClosestNowObject;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    onClose: () => void;
    orbitMode: boolean;
    /** Osculating elements present — orbit *shape* is drawable. */
    hasOrbit: boolean;
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    locale: 'pt-BR' | 'en';
    /** Em mobile, alinha ao topo substituindo o painel lateral. */
    mobileTopAlign?: boolean;
    /** Callback para reabrir o painel lateral em mobile. */
    onShowPanel?: () => void;
    panelRef?: Ref<HTMLDivElement>;
}) {
    const en = locale === 'en';
    const a = object.approach;
    const [tab, setTab] = useState<FocusTab>('summary');
    const [mobileSection, setMobileSection] = useState<FocusMobileSection | null>(null);
    const ldText = object.currentDistanceLD !== null ? `${object.currentDistanceLD.toFixed(2)} DL` : '—';
    const auText = formatDistanceAU(object.currentDistanceKm, locale);
    const motion = motionLabel(object.trajectory?.motionState, en);
    const risk = riskAssessment(a, en);
    const summary = humanSummary(object, en);
    const trajectoryStatus = trajectoryStatusBadge(object.trajectory, en);
    const activeSection = mobileSection === null || mobileSection === 'actions' ? tab : mobileSection;
    const showMobileActions = mobileSection === 'actions';
    const showSectionContent = mobileSection !== 'actions';

    const eyebrowText = orbitMode
        ? (en ? 'On its orbit around the Sun' : 'Em sua órbita ao redor do Sol')
        : (en ? 'Object in focus' : 'Objeto em Foco');

    const eyebrow = onShowPanel ? (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onShowPanel}
                className="sm:hidden flex items-center gap-1 text-[11px] text-white/50 transition hover:text-white/80"
                aria-label={en ? 'Back to list' : 'Voltar à lista'}
            >
                <ChevronDown className="-rotate-90 size-3" />
                {en ? 'List' : 'Lista'}
            </button>
            <span className="text-[11px] uppercase tracking-wide text-white/45">{eyebrowText}</span>
        </div>
    ) : eyebrowText;

    return (
        <PanelShell
            onClose={onClose}
            closeLabel={en ? 'Close focus card' : 'Fechar painel'}
            showCloseButton={!orbitMode}
            eyebrow={eyebrow}
            title={a.displayName ?? a.name}
            subtitle={a.subtitle ?? undefined}
            borderClass="border-signal-cyan/25"
            className="flex max-h-[34vh] sm:max-h-[76%] w-[min(17.5rem,calc(100vw-6rem))] sm:w-[min(24rem,48%)] flex-col"
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >

            {/* Risk badge — prominent, color-coded by hazard. */}
            {mobileSection === null ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2 sm:hidden">
                    <div className="space-y-1.5">
                        <MobileFocusMenuButton label={en ? 'Summary' : 'Resumo'} onClick={() => setMobileSection('summary')} />
                        <MobileFocusMenuButton label={en ? 'Physical data' : 'Dados físicos'} onClick={() => setMobileSection('physical')} />
                        <MobileFocusMenuButton label={en ? 'Approach details' : 'Detalhes da aproximação'} onClick={() => setMobileSection('approach')} />
                        <MobileFocusMenuButton label={en ? 'Actions' : 'Ações'} onClick={() => setMobileSection('actions')} />
                    </div>
                </div>
            ) : null}

            <div className={mobileSection === null ? 'hidden sm:flex sm:flex-1 sm:min-h-0 sm:flex-col' : 'flex min-h-0 flex-1 flex-col'}>
            {mobileSection !== null ? (
                <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5 sm:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileSection(null)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-signal-cyan/75 transition hover:text-signal-cyan"
                    >
                        <ChevronDown className="size-3 -rotate-90" aria-hidden />
                        {en ? 'Back' : 'Voltar'}
                    </button>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">
                        {mobileSection === 'actions'
                            ? (en ? 'Actions' : 'Ações')
                            : activeSection === 'summary'
                                ? (en ? 'Summary' : 'Resumo')
                                : activeSection === 'physical'
                                    ? (en ? 'Physical' : 'Físico')
                                    : (en ? 'Approach' : 'Aproximação')}
                    </span>
                    <span className="w-8" aria-hidden />
                </div>
            ) : null}

            {showSectionContent ? (
                <div className="mt-1.5 px-2.5 sm:mt-2 sm:px-3">
                    <div className={`flex items-start gap-1.5 rounded-lg border px-2 py-1 sm:items-center sm:gap-2 sm:px-2.5 sm:py-1.5 ${risk.className}`}>
                        <span className="text-sm sm:text-base">{risk.icon}</span>
                        <div className="min-w-0">
                            <div className="text-[12px] font-semibold leading-tight sm:text-[13px]">{risk.title}</div>
                            <div className="hidden text-[11px] leading-tight opacity-80 sm:block">{risk.subtitle}</div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Trajectory status — only shown when Horizons data is not available. */}
            {showSectionContent && trajectoryStatus ? (
                <div className="mt-1 px-2.5 sm:mt-1.5 sm:px-3">
                    <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${trajectoryStatus.className}`}>
                        <span aria-hidden="true">{trajectoryStatus.icon}</span>
                        {trajectoryStatus.text}
                    </div>
                </div>
            ) : null}

            {/* Tabs */}
            <div className="mt-2 hidden gap-1 border-b border-white/10 px-2.5 sm:flex sm:mt-2.5 sm:px-3">
                <FocusTabButton active={tab === 'summary'} onClick={() => setTab('summary')}>{en ? 'Summary' : 'Resumo'}</FocusTabButton>
                <FocusTabButton active={tab === 'physical'} onClick={() => setTab('physical')}>{en ? 'Physical' : 'Físico'}</FocusTabButton>
                <FocusTabButton active={tab === 'approach'} onClick={() => setTab('approach')}>{en ? 'Approach' : 'Aproximação'}</FocusTabButton>
            </div>

            {/* Tab content (scrolls if tall) */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 sm:px-3 sm:py-2.5">
                {showSectionContent && activeSection === 'summary' ? (
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

                {showSectionContent && activeSection === 'physical' ? (
                    <dl className="space-y-1.5 text-[13px]">
                        <Row label={en ? 'Diameter' : 'Diâmetro'}>
                            {a.diameterMeters != null
                                ? `${Math.round(a.diameterMeters)} m`
                                : a.estimatedDiameterMinMeters != null
                                  ? `${Math.round(a.estimatedDiameterMinMeters)}–${Math.round(a.estimatedDiameterMaxMeters ?? 0)} m`
                                  : '—'}
                        </Row>
                        <Row label={en ? 'Size compared to' : 'Tamanho comparável a'}>
                            {sizeComparison(a.diameterMeters ?? a.estimatedDiameterMaxMeters, en)}
                        </Row>
                        <Row label={en ? 'Absolute magnitude (H)' : 'Magnitude absoluta (H)'}>
                            {a.absoluteMagnitude != null ? a.absoluteMagnitude.toFixed(1) : '—'}
                        </Row>
                        <Row label={en ? 'Type' : 'Tipo'}>
                            {a.objectType === 'comet' ? (en ? 'Comet' : 'Cometa') : (en ? 'Asteroid' : 'Asteroide')}
                        </Row>
                    </dl>
                ) : null}

                {showSectionContent && activeSection === 'approach' ? (
                    <dl className="space-y-1.5 text-[13px]">
                        {(() => {
                            const v = a.relativeVelocityKph ?? object.trajectory?.currentVelocityKph ?? null;
                            return v != null ? (
                                <Row label={en ? 'Velocity' : 'Velocidade'}>
                                    {new Intl.NumberFormat(locale).format(Math.round(v))} km/h
                                    {a.relativeVelocityKph == null ? <span className="text-white/45"> · {en ? 'from vectors' : 'dos vetores'}</span> : null}
                                </Row>
                            ) : null;
                        })()}
                        {a.approachDate ? (
                            <Row label={en ? 'Closest approach' : 'Máxima aproximação'}>
                                {formatTimestamp(a.approachDate, locale)}
                            </Row>
                        ) : null}
                        <Row label={en ? 'Min. distance' : 'Distância mínima'}>
                            {a.nominalDistanceKm != null ? compactKm(a.nominalDistanceKm) : '—'}
                            {a.lunarDistance != null ? <span className="text-white/55"> · {a.lunarDistance.toFixed(2)} DL</span> : null}
                        </Row>
                        <Row label={en ? 'Source' : 'Fonte'}>JPL/Horizons</Row>
                    </dl>
                ) : null}

                {showMobileActions ? (
                    <div className="space-y-2">
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
                                    'inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
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
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[11px] font-medium text-white/75 transition outline-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                {en ? 'Open full dossier' : 'Abrir dossiê completo'}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* Actions — the orbit toggle is the primary CTA; the dossier is secondary. */}
            <div className="hidden space-y-0.5 border-t border-white/10 px-2.5 py-1.5 sm:block sm:space-y-1.5 sm:px-3 sm:py-2.5">
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
                            'inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan sm:gap-1.5 sm:py-2.5 sm:text-[13px]',
                            !orbitMode && !canShowOrbitPosition
                                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                                : orbitMode
                                    ? 'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10'
                                    : 'border border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan shadow-[0_0_18px_rgba(34,211,238,0.18)] hover:border-signal-cyan/55 hover:bg-signal-cyan/14',
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
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[11px] font-medium text-white/75 transition outline-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan sm:py-2 sm:text-[12px]"
                    >
                        {en ? 'Open full dossier' : 'Abrir dossiê completo'}
                    </button>
                ) : null}
            </div>
            </div>
        </PanelShell>
    );
}

function MobileFocusMenuButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[12px] font-medium text-white/85 transition outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-signal-cyan"
        >
            <span>{label}</span>
            <ChevronDown className="-rotate-90 size-3.5 text-white/35" aria-hidden />
        </button>
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
