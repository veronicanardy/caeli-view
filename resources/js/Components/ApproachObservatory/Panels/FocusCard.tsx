/**
 * Card compacto do objeto em foco no radar 3D.
 *
 * Responsabilidade: organizar leitura visual, abas, resumo, dados físicos,
 * detalhes de aproximação e ações locais. Recebe dados prontos e não decide
 * ranking, seleção global, cálculo orbital ou fallback científico.
 */

import { useState, type ReactNode, type Ref } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { formatDistanceAU, formatTimestamp } from '@/lib/observatory/format';
import { humanSummary, motionLabel, riskAssessment, sizeComparison, trajectoryStatusBadge } from './focusCardPresentation';
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
    /** Elementos osculadores presentes: a forma da orbita pode ser desenhada. */
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
                className="lg:hidden flex items-center gap-1 text-[11px] text-white/50 transition hover:text-white/80"
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
            className="flex max-h-[34vh] lg:max-h-[76%] w-[min(17.5rem,calc(100vw-6rem))] lg:w-[min(24rem,48%)] flex-col"
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >

            {/* Badge de risco com leitura visual baseada no flag NASA/JPL. */}
            {mobileSection === null ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2 lg:hidden">
                    <div className="space-y-1.5">
                        <MobileFocusMenuButton label={en ? 'Summary' : 'Resumo'} onClick={() => setMobileSection('summary')} />
                        <MobileFocusMenuButton label={en ? 'Physical data' : 'Dados físicos'} onClick={() => setMobileSection('physical')} />
                        <MobileFocusMenuButton label={en ? 'Approach details' : 'Detalhes da aproximação'} onClick={() => setMobileSection('approach')} />
                        <MobileFocusMenuButton label={en ? 'Actions' : 'Ações'} onClick={() => setMobileSection('actions')} />
                    </div>
                </div>
            ) : null}

            <div className={mobileSection === null ? 'hidden lg:flex lg:flex-1 lg:min-h-0 lg:flex-col' : 'flex min-h-0 flex-1 flex-col'}>
            {mobileSection !== null ? (
                <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5 lg:hidden">
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
                <div className="mt-1.5 px-2.5 lg:mt-2 lg:px-3">
                    <div className={`flex items-start gap-1.5 rounded-lg border px-2 py-1 lg:items-center lg:gap-2 lg:px-2.5 lg:py-1.5 ${risk.className}`}>
                        <span className="text-sm lg:text-base">{risk.icon}</span>
                        <div className="min-w-0">
                            <div className="text-[12px] font-semibold leading-tight lg:text-[13px]">{risk.title}</div>
                            <div className="hidden text-[11px] leading-tight opacity-80 lg:block">{risk.subtitle}</div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Status da trajetoria: exibido apenas quando os dados Horizons nao estao disponiveis. */}
            {showSectionContent && trajectoryStatus ? (
                <div className="mt-1 px-2.5 lg:mt-1.5 lg:px-3">
                    <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${trajectoryStatus.className}`}>
                        <span aria-hidden="true">{trajectoryStatus.icon}</span>
                        {trajectoryStatus.text}
                    </div>
                </div>
            ) : null}

            {/* Abas */}
            <div className="mt-2 hidden gap-1 border-b border-white/10 px-2.5 lg:flex lg:mt-2.5 lg:px-3">
                <FocusTabButton active={tab === 'summary'} onClick={() => setTab('summary')}>{en ? 'Summary' : 'Resumo'}</FocusTabButton>
                <FocusTabButton active={tab === 'physical'} onClick={() => setTab('physical')}>{en ? 'Physical' : 'Físico'}</FocusTabButton>
                <FocusTabButton active={tab === 'approach'} onClick={() => setTab('approach')}>{en ? 'Approach' : 'Aproximação'}</FocusTabButton>
            </div>

            {/* Conteudo da aba com rolagem quando necessario. */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 lg:px-3 lg:py-2.5">
                {showSectionContent && activeSection === 'summary' ? (
                    <div className="space-y-2">
                        <p className="text-[13px] leading-relaxed text-white/80">{summary}</p>
                        <dl className="space-y-1.5 text-[13px]">
                            <Row label={en ? 'Distance from Earth' : 'Distância da Terra'}>
                                {compactKm(object.currentDistanceKm)} <span className="text-white/60">· {ldText} · {auText}</span>
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
                            {a.lunarDistance != null ? <span className="text-white/60"> · {a.lunarDistance.toFixed(2)} DL</span> : null}
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
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/75 transition outline-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                {en ? 'Open full dossier' : 'Abrir dossiê completo'}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* Acoes: alternancia orbital como CTA principal; dossie como secundario. */}
            <div className="hidden space-y-0.5 border-t border-white/10 px-2.5 py-1.5 lg:block lg:space-y-1.5 lg:px-3 lg:py-2.5">
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
                            'inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan lg:gap-1.5 lg:py-2.5 lg:text-[13px]',
                            !orbitMode && !canShowOrbitPosition
                                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                                : orbitMode
                                    ? 'border border-white/15 bg-white/5 text-white/85 hover:bg-white/10'
                                    : 'border border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan shadow-[0_0_18px_rgba(34,211,238,0.18)] hover:border-signal-cyan/55 hover:bg-signal-cyan/10',
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
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/75 transition outline-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan lg:py-2 lg:text-[12px]"
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
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[12px] font-medium text-white/85 transition outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-signal-cyan"
        >
            <span>{label}</span>
            <ChevronDown className="-rotate-90 size-3.5 text-white/35" aria-hidden />
        </button>
    );
}

function FocusTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                '-mb-px border-b-2 px-2 py-1.5 text-[13px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'border-signal-cyan text-white' : 'border-transparent text-white/60 hover:text-white/80',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">{label}</dt>
            <dd className="text-right font-medium text-white/85">{children}</dd>
        </div>
    );
}
