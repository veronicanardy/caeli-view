/**
 * Card de foco unificado — asteroides e corpos celestes com o mesmo shell.
 *
 * kind: 'asteroid' → tabs Resumo | Perfil Físico | Aproximação
 * kind: 'body'     → tabs Resumo | Perfil Físico | História
 *
 * Mobile: bottom sheet com abas diretas, sem menu de seções intermediário.
 * Desktop: card lateral, altura estável entre abas via min-h fixo no conteúdo.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { formatDistanceAU, formatTimestamp } from '@/lib/radar/format';
import { humanSummary, motionLabel, objectTypeEyebrow, riskAssessment, sizeComparison, trajectoryStatusBadge } from './focusCardPresentation';
import { BODIES, type BodyId } from './bodyData';
import { PanelShell } from './PanelShell';
import { AsteroidModelPreview } from './AsteroidModelPreview';
import { BodyImagePreview } from './BodyImagePreview';

type Tab = 'summary' | 'physical' | 'approach' | 'history';

const TAB_LABELS_PT: Record<Tab, string> = {
    summary: 'Resumo',
    physical: 'Perfil Físico',
    approach: 'Aproximação',
    history: 'História',
};

const TAB_LABELS_EN: Record<Tab, string> = {
    summary: 'Summary',
    physical: 'Physical Profile',
    approach: 'Approach',
    history: 'History',
};

// ─── Props discriminadas ───────────────────────────────────────────────────────

type AsteroidProps = {
    kind: 'asteroid';
    object: ClosestNowObject;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    onClose: () => void;
    orbitMode: boolean;
    hasOrbit: boolean;
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    locale: 'pt-BR' | 'en';
    mobileTopAlign?: boolean;
    onShowPanel?: () => void;
    panelRef?: Ref<HTMLDivElement>;
};

type BodyProps = {
    kind: 'body';
    body: BodyId;
    onClose: () => void;
    locale: 'pt-BR' | 'en';
    mobileTopAlign?: boolean;
    panelRef?: Ref<HTMLDivElement>;
};

type Props = AsteroidProps | BodyProps;

// ─── Componente principal ──────────────────────────────────────────────────────

export function UnifiedFocusCard(props: Props) {
    const en = props.locale === 'en';

    const [tab, setTab] = useState<Tab>('summary');

    const [mounted, setMounted] = useState(false);
    useLayoutEffect(() => { setMounted(false); }, []);
    useEffect(() => {
        const t = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const currentKey = props.kind === 'asteroid' ? props.object.approach.id : props.body;
    const [contentVisible, setContentVisible] = useState(true);
    const prevKey = useRef(currentKey);
    const prevKind = useRef(props.kind);
    useEffect(() => {
        if (prevKey.current === currentKey) return;
        const kindChanged = prevKind.current !== props.kind;
        prevKey.current = currentKey;
        prevKind.current = props.kind;
        setContentVisible(false);
        if (kindChanged) setTab('summary');
        const t = setTimeout(() => setContentVisible(true), 80);
        return () => clearTimeout(t);
    }, [currentKey, props.kind]);

    const enterStyle = {
        transition: 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
    };

    if (props.kind === 'body') {
        return (
            <BodyCard
                {...props}
                en={en}
                tab={tab}
                setTab={setTab}
                contentVisible={contentVisible}
                enterStyle={enterStyle}
            />
        );
    }

    return (
        <AsteroidCard
            {...props}
            en={en}
            tab={tab}
            setTab={setTab}
            contentVisible={contentVisible}
            enterStyle={enterStyle}
        />
    );
}

// ─── Card de asteroide ─────────────────────────────────────────────────────────

function AsteroidCard({
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
    en,
    tab,
    setTab,
    contentVisible,
    enterStyle,
}: Omit<AsteroidProps, 'kind'> & TabState) {
    const a = object.approach;
    const ldText = object.currentDistanceLD !== null ? `${object.currentDistanceLD.toFixed(2)} DL` : '—';
    const auText = formatDistanceAU(object.currentDistanceKm, locale);
    const motion = motionLabel(object.trajectory?.motionState, en);
    const risk = riskAssessment(a, en);
    const summary = humanSummary(object, en);
    const trajectoryStatus = trajectoryStatusBadge(object.trajectory, en);
    const approachDaysAway = a.approachDate
        ? (new Date(a.approachDate).getTime() - Date.now()) / 86_400_000
        : null;
    const isNearClosest =
        object.trajectory?.motionState === 'near_closest' ||
        (approachDaysAway !== null && approachDaysAway >= 0 && approachDaysAway <= 3);
    const velocity = a.relativeVelocityKph ?? object.trajectory?.currentVelocityKph ?? null;

    const typeInfo = objectTypeEyebrow(a.objectType, en);
    const eyebrowText = orbitMode
        ? (en ? 'On its orbit around the Sun' : 'Em sua órbita ao redor do Sol')
        : typeInfo.label;
    const dotColor = orbitMode ? undefined : typeInfo.dotColor;

    const eyebrowPrefix = onShowPanel ? (
        <button
            type="button"
            onClick={onShowPanel}
            className="lg:hidden flex items-center gap-1 text-[11px] text-white/50 transition hover:text-white/80 mr-1"
            aria-label={en ? 'Back to list' : 'Voltar à lista'}
        >
            <ChevronDown className="-rotate-90 size-3" />
            {en ? 'List' : 'Lista'}
        </button>
    ) : undefined;

    const tabs: Tab[] = ['summary', 'physical', 'approach'];
    const tabLabels = en ? TAB_LABELS_EN : TAB_LABELS_PT;

    return (
        <PanelShell
            onClose={onClose}
            closeLabel={en ? 'Close focus card' : 'Fechar painel'}
            showCloseButton={!orbitMode}
            eyebrow={eyebrowText}
            eyebrowPrefix={eyebrowPrefix}
            title={a.displayName ?? a.name}
            subtitle={a.subtitle ?? undefined}
            dotColor={dotColor}
            borderClass="border-signal-cyan/30"
            /* Mobile: card inicia compacto (~38dvh), podendo crescer até 58dvh com scroll.
               Desktop: card lateral com largura e altura controladas. */
            className="flex max-h-[50dvh] lg:max-h-[76%] w-full lg:w-[min(25rem,48%)] flex-col lg:top-[30%]"
            style={enterStyle}
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >
            <AsteroidModelPreview object={object} locale={locale} />

            {isNearClosest ? (
                <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-signal-cyan/40 bg-signal-cyan/10 px-3 py-2 lg:mx-5 lg:mt-3">
                    <span className="shrink-0 text-base leading-none">🎯</span>
                    <div className="min-w-0">
                        <div className="text-[11.5px] font-semibold text-signal-cyan lg:text-[13px]">
                            {object.trajectory?.motionState === 'near_closest'
                                ? (en ? 'Closest approach' : 'Máxima Aproximação')
                                : (en ? 'Closest approach coming up' : 'Máxima Aproximação em breve')}
                        </div>
                        <div className="text-[10px] text-signal-cyan/70 lg:text-[11px]">
                            {a.approachDate
                                ? (en ? `Passes closest on ${formatTimestamp(a.approachDate, locale)}` : `Ponto mais próximo em ${formatTimestamp(a.approachDate, locale)}`)
                                : (en ? 'The closest it will get on this pass.' : 'O ponto mais próximo desta passagem.')}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Bloco de risco — sempre visível em ambas as plataformas */}
            <div className="mt-1.5 px-3 lg:mt-4 lg:px-5">
                <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 lg:rounded-xl lg:gap-3 lg:px-4 lg:py-3 ${risk.className}`}>
                    <span className="text-xs shrink-0 lg:text-xl">{risk.icon}</span>
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-tight lg:text-[13.5px]">{risk.title}</div>
                        <div className="hidden text-[10px] leading-snug opacity-70 lg:block lg:text-[11.5px]">{risk.subtitle}</div>
                    </div>
                </div>
            </div>

            <div className="mt-0.5 px-3 lg:mt-1.5 lg:min-h-[2rem] lg:px-4">
                {trajectoryStatus ? (
                    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] ${trajectoryStatus.className}`}>
                        <span aria-hidden="true">{trajectoryStatus.icon}</span>
                        {trajectoryStatus.text}
                    </div>
                ) : null}
            </div>

            {/* Abas — visíveis em mobile e desktop */}
            <div className="flex gap-0 border-b border-white/10 px-3 lg:mt-1 lg:px-5">
                {tabs.map((t) => (
                    <FocusTabButton key={t} active={tab === t} onClick={() => setTab(t)}>
                        {tabLabels[t]}
                    </FocusTabButton>
                ))}
            </div>

            {/* Área de conteúdo com scroll interno; py reduzido no mobile para dar espaço */}
            <div
                className="min-h-0 flex-1 overflow-y-auto px-3 py-2 lg:px-5 lg:py-4"
                style={{ transition: 'opacity 0.12s ease', opacity: contentVisible ? 1 : 0 }}
            >
                {/* min-h estabiliza o card ao trocar abas; menor no mobile para não forçar altura */}
                <div className="min-h-[5rem] lg:min-h-[11rem]">
                    {tab === 'summary' ? (
                        <div className="space-y-3">
                            <p className="text-[12.5px] leading-relaxed text-white/55 lg:text-[13px]">{summary}</p>
                            <dl className="space-y-2.5 text-[13px]">
                                <Row label={en ? 'Distance from Earth' : 'Distância da Terra'}>
                                    <span className="flex flex-col items-end gap-0.5">
                                        <span>
                                            <span className="font-semibold text-white">{compactKm(object.currentDistanceKm)}</span>
                                            <span className="text-white/50"> · {ldText} · {auText}</span>
                                        </span>
                                        <span
                                            className={`text-[10px] cursor-help ${object.hasRealCurrentDistance ? 'text-white/30' : 'text-yellow-400/50'}`}
                                            title={object.hasRealCurrentDistance
                                                ? (en ? 'Current position from JPL Horizons ephemeris — calculated for right now.' : 'Posição atual via efeméride JPL Horizons — calculada para agora.')
                                                : (en ? 'Real-time position unavailable. This is the recorded miss distance at closest approach — not the current position.' : 'Posição em tempo real indisponível. Esta é a distância registrada na máxima aproximação, não a posição atual.')}
                                        >
                                            {object.hasRealCurrentDistance
                                                ? (en ? 'live · Horizons' : 'ao vivo · Horizons')
                                                : (en ? '⚠ approach distance' : '⚠ dist. da aproximação')}
                                        </span>
                                    </span>
                                </Row>
                                {motion ? (
                                    <Row label={en ? 'Status' : 'Status'}>
                                        <span className={`font-medium ${motion.className}`}>{motion.text}</span>
                                    </Row>
                                ) : null}
                            </dl>
                            {(() => {
                                const pt = object.trajectory?.currentPoint;
                                if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return null;
                                // 750M km — mesmo limite de trajectorySampling.ts; pontos além disso são descartados da cena
                                const distKm = Math.hypot(pt.x, pt.y, typeof pt.z === 'number' ? pt.z : 0);
                                if (distKm <= 750_000_000) return null;
                                return (
                                    <p className="text-[11px] leading-4 text-amber-400/50"
                                        title={en
                                            ? 'Object is beyond 750 million km from Earth. The scene does not render its position — it would appear in an implausible location due to Horizons vector precision limits at this range.'
                                            : 'Objeto está além de 750 milhões de km da Terra. A cena não renderiza sua posição — apareceria em local implausível por limitações de precisão do Horizons a essa distância.'}>
                                        {en ? '⚠ Position not shown. too far for reliable rendering' : '⚠ Posição não exibida. distância além do limite de renderização'}
                                    </p>
                                );
                            })()}
                        </div>
                    ) : null}

                    {tab === 'physical' ? (() => {
const hFallbackMin = a.diameterMeters == null && a.estimatedDiameterMinMeters == null && a.absoluteMagnitude != null
                            ? Math.round((1329 / Math.sqrt(0.25)) * Math.pow(10, -a.absoluteMagnitude / 5) * 1000)
                            : null;
                        const hFallbackMax = a.diameterMeters == null && a.estimatedDiameterMinMeters == null && a.absoluteMagnitude != null
                            ? Math.round((1329 / Math.sqrt(0.05)) * Math.pow(10, -a.absoluteMagnitude / 5) * 1000)
                            : null;
                        const hFallbackMid = hFallbackMin != null && hFallbackMax != null
                            ? Math.round((hFallbackMin + hFallbackMax) / 2)
                            : null;
                        const estimatedMid = a.estimatedDiameterMinMeters != null && a.estimatedDiameterMaxMeters != null
                            ? Math.round((a.estimatedDiameterMinMeters + a.estimatedDiameterMaxMeters) / 2)
                            : null;
                        return (
                        <dl className="space-y-2.5 text-[13px]">
                            <Row label={en ? 'Diameter' : 'Diâmetro'}>
                                <span className="flex flex-col gap-0.5">
                                    <span>
                                        {a.diameterMeters != null
                                            ? `${Math.round(a.diameterMeters)} m`
                                            : a.estimatedDiameterMinMeters != null
                                              ? `${Math.round(a.estimatedDiameterMinMeters)}–${Math.round(a.estimatedDiameterMaxMeters ?? 0)} m`
                                              : hFallbackMin != null
                                                ? `${hFallbackMin}–${hFallbackMax} m`
                                                : '—'}
                                        {a.diameterMeters == null && (a.estimatedDiameterMinMeters != null || hFallbackMin != null)
                                            ? <span className="text-white/40"> · {en ? 'est.' : 'est.'}</span>
                                            : null}
                                    </span>
                                    {a.diameterMeters == null && a.estimatedDiameterMinMeters != null ? (
                                        <span className="text-[11px] text-white/35">
                                            {en ? 'estimated range, uncertainty ×2–5' : 'intervalo estimado, incerteza ×2 a 5'}
                                        </span>
                                    ) : null}
                                    {hFallbackMin != null ? (
                                        <span className="text-[11px] text-white/35">
                                            {en ? 'estimated from H mag, no size on record' : 'estimado pela magnitude H, sem tamanho catalogado'}
                                        </span>
                                    ) : null}
                                </span>
                            </Row>
                            <Row label={en ? 'Size compared to' : 'Tamanho comparável a'}>
                                {sizeComparison(
                                    a.diameterMeters != null ? a.diameterMeters
                                    : a.estimatedDiameterMinMeters != null ? estimatedMid
                                    : hFallbackMid,
                                    en,
                                )}
                            </Row>
                            <Row label={en ? 'Absolute magnitude (H)' : 'Magnitude absoluta (H)'}>
                                {a.absoluteMagnitude != null ? a.absoluteMagnitude.toFixed(1) : '—'}
                            </Row>
                        </dl>
                        );
                    })() : null}

                    {tab === 'approach' ? (
                        <dl className="space-y-2.5 text-[13px]">
                            {velocity != null ? (
                                <Row label={en ? 'Velocity rel. to Earth' : 'Vel. relativa à Terra'}>
                                    {new Intl.NumberFormat(locale).format(Math.round(velocity))} km/h
                                    {a.relativeVelocityKph == null
                                        ? <span className="text-white/40" title={en ? 'Derived from current JPL Horizons position vectors — this is the instantaneous speed relative to Earth, not the speed at closest approach.' : 'Derivado dos vetores de posição JPL Horizons atuais — é a velocidade instantânea relativa à Terra, não a velocidade no momento da máxima aproximação.'}> · {en ? 'from vectors' : 'dos vetores'}</span>
                                        : <span className="text-white/40" title={en ? 'Relative velocity at closest approach, from the JPL Close Approach Database.' : 'Velocidade relativa na máxima aproximação, da base JPL Close Approach.'}> · {en ? 'at closest approach' : 'na máx. aprox.'}</span>}
                                </Row>
                            ) : null}
                            {a.approachDate ? (
                                <Row label={en ? 'Closest approach' : 'Máxima aproximação'}>
                                    {formatTimestamp(a.approachDate, locale)}
                                </Row>
                            ) : null}
                            <Row label={en ? 'Min. distance' : 'Distância mínima'}>
                                {a.nominalDistanceKm != null ? compactKm(a.nominalDistanceKm) : '—'}
                                {a.lunarDistance != null ? <span className="text-white/50"> · {a.lunarDistance.toFixed(2)} DL</span> : null}
                            </Row>
                            {object.trajectory?.orbitalElements?.epochJd ? (() => {
                                const epochDate = new Date((object.trajectory.orbitalElements.epochJd - 2440587.5) * 86_400_000);
                                const ageMs = Date.now() - epochDate.getTime();
                                const ageDays = ageMs / 86_400_000;
                                const stale = ageDays > 60;
                                return (
                                    <Row label={en ? 'Orbital data from' : 'Dados orbitais de'}>
                                        <span className="flex flex-col gap-0.5">
                                            <span className={stale ? 'text-yellow-400/70' : 'text-white/50'}>
                                                {epochDate.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                {stale ? <span className="ml-1">⚠</span> : null}
                                            </span>
                                            {stale ? (
                                                <span className="text-[11px] text-yellow-400/55">
                                                    {en
                                                        ? 'old data. position in the radar may be imprecise'
                                                        : 'dado antigo. posição no radar pode ser imprecisa'}
                                                </span>
                                            ) : null}
                                        </span>
                                    </Row>
                                );
                            })() : null}
                            <Row label={en ? 'Data source' : 'Fonte dos dados'}>
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-white/50">{a.sourceLabel}</span>
                                    <span className="text-[11px] text-white/35">
                                        {a.source === 'cad'
                                            ? (en ? 'orbitally integrated, high precision' : 'órbita integrada, alta precisão')
                                            : (en ? 'broader coverage, lower precision' : 'cobertura ampla, menor precisão')}
                                    </span>
                                </span>
                            </Row>
                        </dl>
                    ) : null}
                </div>
            </div>

            {/* Ações — footer unificado */}
            <div className="shrink-0 border-t border-white/12 px-3 py-2 lg:px-5 lg:py-4">
                <div className="space-y-1.5 lg:space-y-2">
                    {hasOrbit ? (
                        <OrbitToggleButton
                            orbitMode={orbitMode}
                            canShowOrbitPosition={canShowOrbitPosition}
                            onShowOrbit={onShowOrbit}
                            onShowCloseUp={onShowCloseUp}
                            en={en}
                        />
                    ) : null}
                    {onOpenFocus ? (
                        <>
                            {/* Desktop: botão completo; mobile: link de texto compacto */}
                            <button
                                type="button"
                                onClick={() => onOpenFocus(a)}
                                className="hidden lg:inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] font-medium text-white/75 transition outline-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                {en ? 'Open full dossier →' : 'Abrir dossiê completo →'}
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenFocus(a)}
                                className="lg:hidden flex w-full items-center justify-center gap-1 py-1 text-[11.5px] text-white/40 transition outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                {en ? 'Full dossier →' : 'Dossiê completo →'}
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </PanelShell>
    );
}

// ─── Card de corpo celeste ─────────────────────────────────────────────────────

function BodyCard({
    body,
    onClose,
    mobileTopAlign,
    panelRef,
    en,
    tab,
    setTab,
    contentVisible,
    enterStyle,
}: Omit<BodyProps, 'kind'> & TabState) {
    const cfg = BODIES[body];

    // Fatos de corpo celeste armazenam PT e EN na mesma string separados por " / ".
    const localizedFact = (raw: string) => {
        const parts = raw.split(' / ');
        return en ? (parts[1] ?? parts[0]) : parts[0];
    };

    const tabs: Tab[] = ['summary', 'physical', 'history'];
    const tabLabels = en ? TAB_LABELS_EN : TAB_LABELS_PT;

    const PHYSICAL_ORDER = ['Diameter', 'Temperature (avg.)', 'Temperature (surf.)', 'Distance from Sun', 'Distance from Earth', 'Orbital period', 'Rotation period', 'Rotation', 'Natural satellites', 'Phases', 'Spectral type'];
    const physicalFacts = PHYSICAL_ORDER.flatMap((key) => cfg.facts.filter((f) => f.labelEn === key));

    return (
        <PanelShell
            onClose={onClose}
            closeLabel={en ? 'Close' : 'Fechar'}
            eyebrow={en ? cfg.subtitleEn : cfg.subtitlePt}
            title={en ? cfg.nameEn : cfg.namePt}
            dotColor={cfg.dotColor}
            borderClass="border-signal-cyan/30"
            className="flex max-h-[50dvh] lg:h-[30rem] lg:max-h-none w-full lg:w-[min(25rem,48%)] flex-col lg:top-[30%]"
            style={enterStyle}
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >
            <BodyImagePreview body={body} />

            {/* Abas — visíveis em mobile e desktop */}
            <div className="flex gap-0 border-b border-white/10 px-3 lg:mt-1 lg:px-5">
                {tabs.map((t) => (
                    <FocusTabButton key={t} active={tab === t} onClick={() => setTab(t)}>
                        {tabLabels[t]}
                    </FocusTabButton>
                ))}
            </div>

            <div
                className="min-h-0 flex-1 overflow-y-auto px-3 py-2 lg:px-5 lg:py-4"
                style={{ transition: 'opacity 0.12s ease', opacity: contentVisible ? 1 : 0 }}
            >
                {/* min-h estabiliza o card ao trocar abas; menor no mobile para não forçar altura */}
                <div className="min-h-[5rem] lg:min-h-[11rem]">
                    {tab === 'summary' ? (
                        <div className="space-y-3">
                            <p className="text-[12.5px] leading-relaxed text-white/55 lg:text-[13px]">
                                {en ? cfg.contextEn : cfg.contextPt}
                            </p>
                            <dl className="space-y-2.5 text-[13px]">
                                {cfg.facts.slice(0, 2).map((fact) => (
                                    <Row key={fact.labelEn} label={en ? fact.labelEn : fact.labelPt}>
                                        <span className="font-semibold text-white">{localizedFact(fact.value)}</span>
                                    </Row>
                                ))}
                            </dl>
                        </div>
                    ) : null}

                    {tab === 'physical' ? (
                        <dl className="space-y-2.5 text-[13px]">
                            {physicalFacts.map((fact) => (
                                <Row key={fact.labelEn} label={en ? fact.labelEn : fact.labelPt}>
                                    <span className="font-semibold text-white">{localizedFact(fact.value)}</span>
                                </Row>
                            ))}
                        </dl>
                    ) : null}

                    {tab === 'history' ? (
                        <p className="text-[12.5px] leading-relaxed text-white/55 lg:text-[13px]">
                            {en ? cfg.historyEn : cfg.historyPt}
                        </p>
                    ) : null}
                </div>
            </div>
        </PanelShell>
    );
}

// ─── Componentes auxiliares ────────────────────────────────────────────────────

type TabState = {
    en: boolean;
    tab: Tab;
    setTab: (t: Tab) => void;
    contentVisible: boolean;
    enterStyle: React.CSSProperties;
};

function OrbitToggleButton({ orbitMode, canShowOrbitPosition, onShowOrbit, onShowCloseUp, en }: {
    orbitMode: boolean;
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    en: boolean;
}) {
    const disabled = !orbitMode && !canShowOrbitPosition;
    const baseClass = 'inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold tracking-tight transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan lg:py-2.5';
    const stateClass = disabled
        ? 'cursor-not-allowed border border-white/8 bg-white/4 text-white/30'
        : orbitMode
            ? 'border border-white/12 bg-white/5 text-white/75 hover:bg-white/8 hover:text-white/90'
            : 'border border-signal-cyan/35 bg-signal-cyan/8 text-signal-cyan shadow-[0_0_20px_rgba(34,211,238,0.14)] hover:border-signal-cyan/50 hover:bg-signal-cyan/12 hover:shadow-[0_0_24px_rgba(34,211,238,0.22)]';
    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={orbitMode ? onShowCloseUp : onShowOrbit}
                disabled={disabled}
                className={`${baseClass} ${stateClass}`}
            >
                {orbitMode
                    ? (en ? '↩ Back to the asteroid' : '↩ Voltar ao asteroide')
                    : (en ? '🛰 See its orbit around the Sun' : '🛰 Ver a órbita ao redor do Sol')}
            </button>
            {disabled ? (
                <p className="text-center text-[10px] text-white/30">
                    {en ? 'Orbit unavailable — perihelion epoch missing' : 'Órbita indisponível — época de periélio ausente'}
                </p>
            ) : null}
        </div>
    );
}

function FocusTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            /* py-2 no mobile garante área de toque adequada com altura mais compacta */
            className={[
                '-mb-px border-b-2 px-3 py-2 text-[11.5px] font-medium tracking-wide transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan lg:px-3.5 lg:py-2.5 lg:text-[12.5px]',
                active
                    ? 'border-signal-cyan text-white drop-shadow-[0_1px_12px_rgba(34,211,238,0.55)]'
                    : 'border-transparent text-white/28 hover:text-white/60',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-[11px] uppercase tracking-wide text-white/40">{label}</dt>
            <dd className="text-right text-[13px] font-semibold text-white">{children}</dd>
        </div>
    );
}
