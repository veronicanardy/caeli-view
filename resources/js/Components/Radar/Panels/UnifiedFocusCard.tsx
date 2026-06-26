/**
 * Card de foco unificado — asteroides e corpos celestes com o mesmo shell.
 *
 * kind: 'asteroid' → tabs Resumo | Perfil Físico | Aproximação (+ História quando é objeto famoso)
 * kind: 'body'     → tabs Resumo | Perfil Físico | História
 *
 * Mobile: bottom sheet com abas diretas, sem menu de seções intermediário.
 * Desktop: card do trilho esquerdo, ancorado logo abaixo do painel de navegação.
 * O top usa a mesma fórmula de altura do painel (min(20rem,40vh), 16rem em modo
 * órbita) para nunca colidir com ele; max-height garante folga até a base da
 * cena, com scroll interno quando faltar espaço. Altura estável entre abas via
 * min-h fixo no conteúdo.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Tooltip } from '../Controls/Tooltip';
import { ArrowRight, Check, ChevronDown, Circle, Clock, Info, Minus, Orbit, Target, TriangleAlert, Undo2, Zap } from 'lucide-react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { approxKm, compactKm } from '@/lib/format';
import { formatDistanceAU, formatRelativeDayLabel, formatTimestamp } from '@/lib/radar/format';
import { isBeyondRenderLimit } from '@/lib/radar/trajectorySampling';
import { albedoExplanation, motionLabel, objectTypeEyebrow, orbitClassContext, orbitClassLabel, riskAssessment, rotationExplanation, sizeComparison, smartSummary, trajectoryStatusBadge, velocityComparison, type StatusBadgeIcon } from './focusCardPresentation';
import { knownCometById, knownCometHeliocentricDistanceKm } from '../Bodies/Comet/knownComets';
import { orbitFactsFromElements } from '@/lib/keplerOrbit';
import { famousLoreFor } from './famousLore';
import { BODIES, type BodyId } from './bodyData';
import { PanelShell, usePanelSheetState } from './PanelShell';
import { AsteroidModelPreview } from './AsteroidModelPreview';
import { SpacecraftCardPreview } from './SpacecraftCardPreview';
import { BodyImagePreview } from './BodyImagePreview';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';

/**
 * Slot do preview decorativo: no bottom sheet mobile, só aparece no estado
 * expandido. Meio aberto prioriza dados (e evita um segundo contexto WebGL
 * ativo enquanto o usuário só lê métricas).
 */
function SheetAwarePreview({ children }: { children: ReactNode }) {
    const { isMobileSheet, snap } = usePanelSheetState();
    if (isMobileSheet && snap !== 'full') return null;
    return <>{children}</>;
}

type Tab = 'summary' | 'physical' | 'approach' | 'history';

const TAB_LABELS_PT: Record<Tab, string> = {
    summary: 'Resumo',
    physical: 'Perfil físico',
    approach: 'Aproximação',
    history: 'História',
};

const TAB_LABELS_EN: Record<Tab, string> = {
    summary: 'Summary',
    physical: 'Physical Profile',
    approach: 'Approach',
    history: 'History',
};

/** Mapeia nomes semânticos de ícones dos helpers de apresentação para componentes lucide. */
const STATUS_BADGE_ICONS: Record<StatusBadgeIcon, typeof Zap> = {
    zap: Zap,
    clock: Clock,
    minus: Minus,
    circle: Circle,
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
    onShowPanel?: () => void;
    panelRef?: Ref<HTMLDivElement>;
    /** Desktop: painel de navegação recolhido em pill — o card sobe para logo abaixo dele. */
    desktopPanelCollapsed?: boolean;
};

type BodyProps = {
    kind: 'body';
    body: BodyId;
    onClose: () => void;
    locale: 'pt-BR' | 'en';
    panelRef?: Ref<HTMLDivElement>;
    desktopPanelCollapsed?: boolean;
};

/**
 * Classes desktop de top/max-height do card no trilho esquerdo.
 * O top soma top-3 do painel (0.75rem) + altura do painel + gap (0.5rem);
 * o max-height desconta o top e a folga inferior (0.75rem).
 */
function desktopRailClasses(panelCollapsed: boolean, orbitMode: boolean): string {
    if (panelCollapsed) return 'lg:top-[3.75rem] lg:max-h-[calc(100%-4.5rem)]';
    if (orbitMode) return 'lg:top-[calc(min(16rem,40vh)+1.25rem)] lg:max-h-[calc(100%-min(16rem,40vh)-2rem)]';
    return 'lg:top-[calc(min(20rem,40vh)+1.25rem)] lg:max-h-[calc(100%-min(20rem,40vh)-2rem)]';
}

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
    onShowPanel,
    panelRef,
    desktopPanelCollapsed = false,
    en,
    tab,
    setTab,
    contentVisible,
    enterStyle,
}: Omit<AsteroidProps, 'kind'> & TabState) {
    const a = object.approach;
    // Cometa famoso sem distância do Horizons (ex.: Halley no afélio, ~36 UA): em vez de "Indisponível",
    // mostra a distância heliocêntrica da órbita Kepler local (estimada). Para corpos a dezenas de UA, a
    // Terra (1 UA) é desprezível, então isso aproxima a distância da Terra. Sabemos onde ele está; só não
    // pelo feed do Horizons.
    const cometKeplerDistanceKm = object.currentDistanceKm == null
        ? (() => { const c = knownCometById(a.id); return c ? knownCometHeliocentricDistanceKm(c) : null; })()
        : null;
    const effectiveDistanceKm = object.currentDistanceKm ?? cometKeplerDistanceKm;
    const isKeplerDistance = object.currentDistanceKm == null && cometKeplerDistanceKm != null;
    // Fatos orbitais (distância ao Sol, periélio/afélio, próxima passagem) pela órbita Kepler. Vale pra
    // qualquer objeto COM elementos: do Horizons (asteroides famosos, NEOs) ou do catálogo de cometa
    // (Halley & cia.). Enriquecem a aba "Aproximação" pra todos, não só quem tem evento de aproximação.
    const effectiveElements = object.trajectory?.orbitalElements ?? knownCometById(a.id)?.elements ?? null;
    const orbitFacts = effectiveElements ? orbitFactsFromElements(effectiveElements) : null;
    // Ressalva (Resumo) só quando é cometa famoso SEM Horizons: aí os números vêm só da órbita conhecida.
    const showKeplerOnlyNote = object.trajectory?.status !== 'available' && knownCometById(a.id) != null;
    const auText = formatDistanceAU(effectiveDistanceKm, locale);
    const motion = motionLabel(object.trajectory?.motionState, en);
    const risk = riskAssessment(a, en);
    const trajectoryStatus = trajectoryStatusBadge(object.trajectory, en);
    const approachDaysAway = a.approachDate
        ? (new Date(a.approachDate).getTime() - Date.now()) / 86_400_000
        : null;
    const isNearClosest =
        object.trajectory?.motionState === 'near_closest' ||
        (approachDaysAway !== null && approachDaysAway >= 0 && approachDaysAway <= 3);
    const currentVelocity = object.trajectory?.currentVelocityKph ?? null;
    const velocity = currentVelocity ?? a.relativeVelocityKph ?? null;

    // Tamanho efetivo do corpo (m), na mesma ordem de preferência do Perfil físico: diâmetro real,
    // meio do intervalo estimado, ou estimativa por magnitude absoluta. Usado pelo mini-resumo.
    const hSummaryMin = a.diameterMeters == null && a.estimatedDiameterMinMeters == null && a.absoluteMagnitude != null
        ? Math.round((1329 / Math.sqrt(0.25)) * Math.pow(10, -a.absoluteMagnitude / 5) * 1000)
        : null;
    const hSummaryMax = a.diameterMeters == null && a.estimatedDiameterMinMeters == null && a.absoluteMagnitude != null
        ? Math.round((1329 / Math.sqrt(0.05)) * Math.pow(10, -a.absoluteMagnitude / 5) * 1000)
        : null;
    const knownComet = knownCometById(a.id);
    const summarySizeMeters = knownComet?.diameterMeters
        ?? (a.diameterMeters != null ? a.diameterMeters
            : a.estimatedDiameterMinMeters != null && a.estimatedDiameterMaxMeters != null
                ? Math.round((a.estimatedDiameterMinMeters + a.estimatedDiameterMaxMeters) / 2)
                : hSummaryMin != null && hSummaryMax != null
                    ? Math.round((hSummaryMin + hSummaryMax) / 2)
                    : null);
    const summary = smartSummary(
        { objectType: a.objectType, sizeMeters: summarySizeMeters, velocityKph: velocity },
        en,
    );
    const approachRelative = a.approachDate ? formatRelativeDayLabel(a.approachDate, Date.now(), locale) : null;
    const TrajectoryStatusIcon = trajectoryStatus ? STATUS_BADGE_ICONS[trajectoryStatus.icon] : null;

    const typeInfo = objectTypeEyebrow(a.objectType, en);
    const eyebrowText = orbitMode
        ? (en ? 'On its orbit around the Sun' : 'Em sua órbita ao redor do Sol')
        : typeInfo.label;
    const dotColor = orbitMode ? undefined : typeInfo.dotColor;

    const eyebrowPrefix = onShowPanel ? (
        /* data-tutorial espelha o alvo da action bar: com o card aberto (barra oculta),
           o tutorial resolve este botão como caminho visível para a lista. */
        <button
            type="button"
            onClick={onShowPanel}
            data-tutorial="object-list-toggle"
            className="lg:hidden flex items-center gap-1 py-1 text-[11px] text-white/50 transition hover:text-white/80 mr-1"
            aria-label={en ? 'Back to list' : 'Voltar à lista'}
        >
            <ChevronDown className="-rotate-90 size-3" />
            {en ? 'List' : 'Lista'}
        </button>
    ) : undefined;

    // História só aparece quando o objeto é famoso (tem lore cadastrada). Asteroides comuns do feed
    // seguem com as 3 abas de sempre.
    const history = famousLoreFor(a.id, locale);
    const tabs: Tab[] = history ? ['summary', 'physical', 'approach', 'history'] : ['summary', 'physical', 'approach'];
    const tabLabels = en ? TAB_LABELS_EN : TAB_LABELS_PT;

    // Trocar de um famoso (com História) para um objeto sem História deixaria a aba ativa órfã:
    // volta ao Resumo nesse caso.
    useEffect(() => {
        if (tab === 'history' && !history) setTab('summary');
    }, [tab, history, setTab]);

    return (
        <PanelShell
            en={en}
            onClose={onClose}
            closeLabel={en ? 'Close focus card' : 'Fechar painel'}
            showCloseButton={!orbitMode}
            eyebrow={eyebrowText}
            eyebrowPrefix={eyebrowPrefix}
            title={a.displayName ?? a.name}
            dotColor={dotColor}
            borderClass="border-signal-cyan/25"
            /* Mobile: altura controlada pelo PanelShell (snaps minimizado/meio/expandido).
               Desktop: card do trilho esquerdo, abaixo do painel de navegação. */
            className={`flex w-full lg:w-[min(22rem,48%)] flex-col ${desktopRailClasses(desktopPanelCollapsed, orbitMode)}`}
            style={enterStyle}
            panelRef={panelRef}
            dataTutorial="selected-card"
        >
            <SheetAwarePreview>
                {a.objectType === 'spacecraft'
                    ? <SpacecraftCardPreview name={a.displayName ?? a.name} />
                    : <AsteroidModelPreview object={object} locale={locale} />}
            </SheetAwarePreview>

            {/* Abas — visíveis em mobile e desktop */}
            <FocusTabBar
                tabs={tabs}
                tab={tab}
                setTab={setTab}
                labels={tabLabels}
                ariaLabel={en ? 'Focus card sections' : 'Seções do painel de foco'}
            />

            {/* Área de conteúdo com scroll interno; py contido: altura disputada no trilho */}
            <div
                role="tabpanel"
                id="focus-tabpanel"
                aria-labelledby={`focus-tab-${tab}`}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 lg:px-4"
                style={{ transition: 'opacity 0.12s ease', opacity: contentVisible ? 1 : 0 }}
            >
                {/* Desktop: altura FIXA do miolo, igual em todas as abas. A aba mais alta (Perfil físico,
                    com muitos campos) rola DENTRO desta caixa (o pai já tem overflow-y-auto), em vez de
                    esticar o card. Assim o card mantém a mesma altura ao trocar de aba. No mobile a altura
                    vem do snap do sheet, então não fixamos. */}
                <div className="lg:h-[15rem]">
                    {tab === 'summary' ? (
                        <div className="space-y-2.5 lg:space-y-3.5">
                            {isNearClosest ? (
                                /* Compacto no mobile: o banner disputa altura com a métrica principal no sheet */
                                <div className="flex items-center justify-center gap-2 rounded-lg border border-signal-cyan/40 bg-signal-cyan/10 px-2.5 py-1.5 lg:px-3 lg:py-2">
                                    <Target className="size-3.5 shrink-0 text-signal-cyan lg:size-4" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-signal-cyan lg:text-[11.5px]">
                                            {object.trajectory?.motionState === 'near_closest'
                                                ? (en ? 'Closest approach' : 'Máxima aproximação')
                                                : (en ? 'Closest approach coming up' : 'Máxima aproximação em breve')}
                                        </div>
                                        <div className="text-[10px] text-signal-cyan/70">
                                            {a.approachDate
                                                ? approachRelative
                                                    ? (en
                                                        ? `Passes closest ${approachRelative} (${formatTimestamp(a.approachDate, locale)})`
                                                        : `Ponto mais próximo ${approachRelative} (${formatTimestamp(a.approachDate, locale)})`)
                                                    : (en
                                                        ? `Passes closest on ${formatTimestamp(a.approachDate, locale)}`
                                                        : `Ponto mais próximo em ${formatTimestamp(a.approachDate, locale)}`)
                                                : (en ? 'The closest it will get on this pass.' : 'O ponto mais próximo desta passagem.')}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            {/* Mini-resumo: leitura humana do corpo (tamanho e velocidade comparáveis +
                               tipo), sem números nem o que distância/risco e as outras abas já mostram.
                               Abre o Resumo dando contexto e convidando a explorar o resto. */}
                            {summary ? (
                                <p className="text-[12px] leading-relaxed text-white/55 lg:text-[12.5px]">
                                    {summary}
                                </p>
                            ) : null}
                            {/* Ressalva: cometa famoso sem dado ao vivo do Horizons (provável que esteja muito
                               longe, ex.: Halley no afélio). Explica que os números vêm da órbita conhecida. */}
                            {showKeplerOnlyNote ? (
                                <div className="flex items-start gap-1.5 rounded-lg border border-yellow-400/25 bg-yellow-400/5 px-2.5 py-2">
                                    <TriangleAlert className="mt-0.5 size-3 shrink-0 text-yellow-400/75" aria-hidden="true" />
                                    <p className="text-[11px] leading-relaxed text-white/55">
                                        {en
                                            ? 'No live JPL Horizons data for this comet right now, most likely because it is very far from the Sun (near aphelion). The distance and the figures in the Approach tab are computed from its known orbit (Kepler), so they are reliable but not live.'
                                            : 'Sem dado ao vivo do JPL Horizons para este cometa agora, provavelmente porque ele está muito longe do Sol (perto do afélio). A distância e os números da aba Aproximação são calculados pela órbita conhecida dele (Kepler), então são confiáveis, mas não ao vivo.'}
                                    </p>
                                </div>
                            ) : null}
                            {/* Distância da Terra: métrica principal do card, em bloco próprio.
                               Rótulo e valor em linhas separadas — lado a lado não cabem na largura do card. */}
                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-[10.5px] font-normal uppercase tracking-wide text-white/50">
                                        {en ? 'Distance from Earth' : 'Distância da Terra'}
                                    </span>
                                    <span className={`flex items-center gap-1 text-[10px] ${object.hasRealCurrentDistance ? 'text-white/45' : 'text-yellow-400/75'}`}>
                                        {!object.hasRealCurrentDistance ? <TriangleAlert className="size-2.5 shrink-0" aria-hidden="true" /> : null}
                                        {object.hasRealCurrentDistance
                                            ? (en ? 'live · Horizons' : 'ao vivo · Horizons')
                                            : isKeplerDistance
                                                ? (en ? 'estimated from orbit' : 'estimado pela órbita')
                                                : (en ? 'approach distance' : 'distância da aproximação')}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                                    {/* Valor aproximado: o dado muda ao vivo e precisão de 1 km seria falsa */}
                                    <span className="text-lg font-semibold leading-tight text-white">{approxKm(effectiveDistanceKm)}</span>
                                    <span className="text-[11px] text-white/50">· {auText}</span>
                                </div>
                            </div>
                            <dl className="space-y-2 text-[13px] lg:space-y-3">
                                {trajectoryStatus ? (
                                    <Row label={en ? 'Status' : 'Status'}>
                                        <span className={`flex items-center gap-1 font-medium ${trajectoryStatus.className}`}>
                                            {TrajectoryStatusIcon ? <TrajectoryStatusIcon className="size-3 shrink-0" aria-hidden="true" /> : null}
                                            {trajectoryStatus.text}
                                        </span>
                                    </Row>
                                ) : motion && !isNearClosest ? (
                                    /* Com o banner de máxima aproximação visível, o status de movimento é redundante */
                                    <Row label={en ? 'Status' : 'Status'}>
                                        <span className={`font-medium ${motion.className}`}>{motion.text}</span>
                                    </Row>
                                ) : null}
                                {/* "Risco de impacto" não se aplica a uma nave (não é um corpo em rota
                                    de aproximação da Terra). Só asteroides/cometas mostram esta linha. */}
                                {a.objectType !== 'spacecraft' ? (
                                    <div>
                                        <Row label={en ? 'Risk' : 'Risco'}>
                                            <span className={`flex items-center justify-end gap-1 font-medium ${a.hazardFlag ? 'text-yellow-200/100' : 'text-emerald-300'}`}>
                                                {!a.hazardFlag ? <Check className="size-3 shrink-0" aria-hidden="true" /> : null}
                                                {risk.title}
                                            </span>
                                        </Row>
                                        {a.hazardFlag ? (
                                            <p className="mt-1 text-[10.5px] leading-relaxed text-white/40">
                                                {risk.subtitle}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </dl>
                            {(() => {
                                // Limite renderizável é type-aware (cometas vão muito mais longe); a regra
                                // mora em trajectorySampling para não duplicar o número aqui.
                                if (!isBeyondRenderLimit(object)) return null;
                                // Cometa distante tem explicação própria: passa quase todo o tempo longe do
                                // Sol e só fica perto (e visível) na passagem. Asteroide usa o texto genérico.
                                const isComet = object.approach.objectType === 'comet';
                                const tooltipText = isComet
                                    ? (en
                                        ? 'Comets spend almost all of their orbit far from the Sun, out in the cold outer Solar System, and only come close around their passage. This one is in that distant stretch now, so its position is off the scale.'
                                        : 'Os cometas passam quase toda a órbita longe do Sol, lá no Sistema Solar exterior gelado, e só chegam perto na passagem. Este está nesse trecho distante agora, então a posição fica fora da escala da cena.')
                                    : (en
                                        ? 'This object is currently too far from Earth to show its position in the scene.'
                                        : 'Este objeto está longe demais da Terra agora para exibir a posição na cena.');
                                return (
                                    <Tooltip side="right" wrap content={tooltipText}>
                                        <p className="flex items-start gap-1 text-[11px] leading-4 text-amber-400/70 cursor-help">
                                            <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                                            {en
                                                ? (isComet ? 'Position not shown, the comet is far from the Sun right now' : 'Position not shown, too far for reliable rendering')
                                                : (isComet ? 'Posição não exibida, o cometa está longe do Sol agora' : 'Posição não exibida, distância além do limite de renderização')}
                                        </p>
                                    </Tooltip>
                                );
                            })()}
                        </div>
                    ) : null}

                    {/* Cometa conhecido: perfil físico próprio. Núcleo é irregular (não tem "diâmetro"
                        esférico) e a magnitude é M1/M2, não o H de asteroide — então não reusamos o
                        bloco de asteroide, que mostraria "diâmetro" enganoso e um campo de H vazio. */}
                    {tab === 'physical' && knownCometById(a.id) ? (() => {
                        const comet = knownCometById(a.id)!;
                        const e = comet.elements.ec;
                        const periodPt = comet.orbitalPeriodYears >= 1000
                            ? `${new Intl.NumberFormat('pt-BR').format(Math.round(comet.orbitalPeriodYears))} anos`
                            : `${comet.orbitalPeriodYears.toLocaleString('pt-BR')} anos`;
                        const periodEn = comet.orbitalPeriodYears >= 1000
                            ? `${new Intl.NumberFormat('en').format(Math.round(comet.orbitalPeriodYears))} years`
                            : `${comet.orbitalPeriodYears} years`;
                        return (
                        <dl className="space-y-3 text-[13px]">
                            <Row label={en ? 'Nucleus' : 'Núcleo'}>
                                <span className="flex flex-col gap-0.5">
                                    <span>{en ? comet.nucleusShape.en : comet.nucleusShape.pt}</span>
                                    {comet.modelKey !== 'c67p' ? (
                                        <span className="text-[11px] text-white/50">
                                            {en ? 'size estimated, nucleus never imaged up close' : 'tamanho estimado, núcleo nunca fotografado de perto'}
                                        </span>
                                    ) : null}
                                </span>
                            </Row>
                            {/* Medida real do núcleo: espelha a linha "Diâmetro" do asteroide. Núcleo irregular
                                mostra os eixos (não um diâmetro esférico), por isso vem de nucleusSize, não de um
                                único número. Mantém coerência entre os cards de rocha e de cometa. */}
                            <Row label={en ? 'Nucleus size' : 'Tamanho do núcleo'}>
                                {en ? comet.nucleusSize.en : comet.nucleusSize.pt}
                            </Row>
                            <Row label={en ? 'Size compared to' : 'Tamanho comparável a'}>
                                {sizeComparison(comet.diameterMeters, en)}
                            </Row>
                            {/* Velocidade: o número em km/h e, logo abaixo, a comparação humana em linha PRÓPRIA
                                ("Velocidade comparável a"), espelhando o par Diâmetro / Tamanho comparável a. Só
                                aparece quando o feed traz velocidade (cometa via Horizons); no fallback Kepler some. */}
                            {velocity != null ? (
                                <>
                                    <Row label={en ? 'Speed' : 'Velocidade'}>
                                        {new Intl.NumberFormat(locale).format(Math.round(velocity))} km/h
                                    </Row>
                                    {velocityComparison(velocity, en) ? (
                                        <Row label={en ? 'Speed compared to' : 'Velocidade comparável a'}>
                                            {velocityComparison(velocity, en)}
                                        </Row>
                                    ) : null}
                                </>
                            ) : null}
                            <Row label={en ? 'Orbital period' : 'Período orbital'}>
                                {en ? periodEn : periodPt}
                            </Row>
                            <Row label={en ? 'Eccentricity' : 'Excentricidade'}>
                                <span className="flex flex-col gap-0.5">
                                    <span>{e.toFixed(e >= 0.99 ? 4 : 3).replace('.', en ? '.' : ',')}</span>
                                    <span className="text-[11px] text-white/50">
                                        {e >= 0.99 ? (en ? 'near-parabolic, a one-off visitor' : 'quase parabólica, visitante de passagem única')
                                            : e >= 0.8 ? (en ? 'highly elongated orbit' : 'órbita bem alongada')
                                            : (en ? 'elongated orbit' : 'órbita alongada')}
                                    </span>
                                </span>
                            </Row>
                        </dl>
                        );
                    })() : null}

                    {tab === 'physical' && !knownCometById(a.id) ? (() => {
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
                        <dl className="space-y-3 text-[13px]">
                            <Row label={en ? 'Diameter' : 'Diâmetro'}>
                                <span className="flex flex-col gap-0.5">
                                    <span>
                                        {a.diameterMeters != null
                                            ? `${Math.round(a.diameterMeters)} m`
                                            : a.estimatedDiameterMinMeters != null
                                              ? (en
                                                  ? `Between ${Math.round(a.estimatedDiameterMinMeters)} m and ${Math.round(a.estimatedDiameterMaxMeters ?? 0)} m`
                                                  : `Entre ${Math.round(a.estimatedDiameterMinMeters)} m e ${Math.round(a.estimatedDiameterMaxMeters ?? 0)} m`)
                                              : hFallbackMin != null
                                                ? (en
                                                    ? `Between ${hFallbackMin} m and ${hFallbackMax} m`
                                                    : `Entre ${hFallbackMin} m e ${hFallbackMax} m`)
                                                : '—'}
                                    </span>
                                    {a.diameterMeters == null && a.estimatedDiameterMinMeters != null ? (
                                        <span className="text-[11px] text-white/50">
                                            {en ? 'estimated range, uncertainty ×2–5' : 'intervalo estimado, incerteza ×2 a 5'}
                                        </span>
                                    ) : null}
                                    {hFallbackMin != null ? (
                                        <span className="text-[11px] text-white/50">
                                            {en ? 'Estimated from absolute magnitude' : 'Estimado a partir da magnitude absoluta'}
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
                            {/* Velocidade: número em km/h e, logo abaixo, a comparação em linha PRÓPRIA
                                ("Velocidade comparável a"), espelhando o par Diâmetro / Tamanho comparável a.
                                Quando não é a velocidade ao vivo, marca "na máxima aproximação" junto do número. */}
                            {velocity != null ? (
                                <>
                                    <Row label={en ? 'Speed' : 'Velocidade'}>
                                        <span className="flex flex-col items-end gap-0.5">
                                            <span className="whitespace-nowrap">{new Intl.NumberFormat(locale).format(Math.round(velocity))} km/h</span>
                                            {currentVelocity == null ? (
                                                <span className="text-[10px] font-normal text-white/45">{en ? 'at closest approach' : 'na máxima aproximação'}</span>
                                            ) : null}
                                        </span>
                                    </Row>
                                    {velocityComparison(velocity, en) ? (
                                        <Row label={en ? 'Speed compared to' : 'Velocidade comparável a'}>
                                            {velocityComparison(velocity, en)}
                                        </Row>
                                    ) : null}
                                </>
                            ) : null}
                            <Row label={en ? 'Absolute magnitude (H)' : 'Magnitude absoluta (H)'}>
                                {a.absoluteMagnitude != null ? (
                                    /* Número + ícone de info: a leitura contraintuitiva (H maior = corpo menor)
                                       vive no tooltip, não numa linha extra que inflava o card. */
                                    <span className="inline-flex items-center gap-1">
                                        {a.absoluteMagnitude.toFixed(1)}
                                        <Tooltip side="top" wrap content={en ? 'This number is the object’s brightness, like a light bulb. The higher the number, the fainter the bulb. A faint bulb means a tiny object. A bright one means a giant.' : 'Esse número é o brilho do objeto, como uma lâmpada. Quanto maior o número, mais fraca a lâmpada. Lâmpada fraca, objeto pequeno. Lâmpada forte, objeto gigante.'}>
                                            <Info className="size-3.5 cursor-help text-signal-cyan/70 transition hover:text-signal-cyan" aria-hidden="true" />
                                        </Tooltip>
                                    </span>
                                ) : '—'}
                            </Row>
                            {/* Campos do SBDB, presentes só quando o detalhe foi carregado (asteroides famosos). */}
                            {a.orbitClass ? (
                                <Row label={en ? 'Orbit class' : 'Classe orbital'}>
                                    {/* Nome da família LOCALIZADO (o backend só traz EN); o que a órbita faz
                                       vai pro tooltip de info, mantendo a linha única. */}
                                    <span className="inline-flex items-center gap-1">
                                        {orbitClassLabel(a.orbitClass, en) ?? a.orbitClass}
                                        {orbitClassContext(a.orbitClass, en) ? (
                                            <Tooltip side="top" wrap content={orbitClassContext(a.orbitClass, en) as string}>
                                                <Info className="size-3.5 cursor-help text-signal-cyan/70 transition hover:text-signal-cyan" aria-hidden="true" />
                                            </Tooltip>
                                        ) : null}
                                    </span>
                                </Row>
                            ) : null}
                            {/* Albedo e rotação: a explicação vive num tooltip de info, não numa subline cinza.
                                Empilhar três sublines (classe, albedo, rotação) era o que pesava o card. */}
                            {a.albedo != null ? (
                                <Row label={en ? 'Albedo' : 'Albedo'}>
                                    <span className="inline-flex items-center gap-1">
                                        {a.albedo.toFixed(2)}
                                        {albedoExplanation(a.albedo, en) ? (
                                            <Tooltip side="top" wrap content={albedoExplanation(a.albedo, en) as string}>
                                                <Info className="size-3.5 cursor-help text-signal-cyan/70 transition hover:text-signal-cyan" aria-hidden="true" />
                                            </Tooltip>
                                        ) : null}
                                    </span>
                                </Row>
                            ) : null}
                            {a.rotationPeriodHours != null ? (
                                <Row label={en ? 'Rotation period' : 'Período de rotação'}>
                                    <span className="inline-flex items-center gap-1">
                                        {`${a.rotationPeriodHours.toFixed(2)} h`}
                                        {rotationExplanation(a.rotationPeriodHours, en) ? (
                                            <Tooltip side="top" wrap content={rotationExplanation(a.rotationPeriodHours, en) as string}>
                                                <Info className="size-3.5 cursor-help text-signal-cyan/70 transition hover:text-signal-cyan" aria-hidden="true" />
                                            </Tooltip>
                                        ) : null}
                                    </span>
                                </Row>
                            ) : null}
                        </dl>
                        );
                    })() : null}

                    {tab === 'approach' ? (
                        <dl className="space-y-3 text-[13px]">
                            {/* Evento de aproximação (só quando o feed traz: NEOs/genéricos). Famosos distantes
                               não têm flyby da Terra, então esses campos não aparecem para eles. */}
                            {a.approachDate ? (
                                <Row label={en ? 'Closest approach to Earth' : 'Máxima aproximação da Terra'}>
                                    <span className="flex flex-col items-end gap-0.5">
                                        <span>{formatTimestamp(a.approachDate, locale)}</span>
                                        {approachRelative ? (
                                            <span className="text-[11px] font-normal text-white/50">{approachRelative}</span>
                                        ) : null}
                                    </span>
                                </Row>
                            ) : null}
                            {a.nominalDistanceKm != null ? (
                                <Row label={
                                    <LabelWithInfo
                                        text={en ? 'Closest distance to Earth' : 'Menor distância da Terra'}
                                        tip={en
                                            ? 'The gap between the object and Earth at its closest point. The line above tells you when that happens; this one tells you how close it comes.'
                                            : 'A distância entre o objeto e a Terra no ponto mais próximo. A linha de cima mostra quando isso acontece; esta mostra o quão perto ele chega.'}
                                    />
                                }>
                                    {compactKm(a.nominalDistanceKm)}
                                    {a.lunarDistance != null ? <span className="text-white/50"> · {a.lunarDistance.toFixed(2)} {en ? 'LD' : 'DL'}</span> : null}
                                </Row>
                            ) : null}

                            {/* Período orbital (quanto leva pra dar uma volta no Sol), pela 3ª lei de Kepler.
                               Vale pra qualquer objeto com elementos: famosos e genéricos do feed. */}
                            {orbitFacts ? (
                                <Row label={
                                    <LabelWithInfo
                                        text={en ? 'Orbital period' : 'Período orbital'}
                                        tip={en
                                            ? 'How long the object takes to go once around the Sun.'
                                            : 'Quanto tempo o objeto leva para dar uma volta completa ao redor do Sol.'}
                                    />
                                }>
                                    {formatOrbitalPeriod(orbitFacts.periodYears, en)}
                                </Row>
                            ) : null}

                            {/* Fatos da órbita (pela órbita Kepler), só para COMETAS: a órbita excêntrica torna
                               distância do Sol / periélio / afélio marcantes. Num asteroide do cinturão (órbita
                               quase circular) seriam pouco informativos, então não aparecem. */}
                            {orbitFacts && a.objectType === 'comet' ? (
                                <>
                                    <Row label={en ? 'Distance from Sun (now)' : 'Distância do Sol (agora)'}>
                                        <OrbitDistanceValue km={orbitFacts.sunDistanceKm} au={orbitFacts.sunDistanceAu} en={en} />
                                    </Row>
                                    <Row label={
                                        <LabelWithInfo
                                            text={en ? 'Perihelion' : 'Periélio'}
                                            tip={en
                                                ? 'Perihelion is the point in the orbit closest to the Sun. Near it the object moves fastest, and a comet warms up and grows its tail.'
                                                : 'Periélio é o ponto da órbita mais próximo do Sol. Perto dele o corpo se move mais rápido e o cometa esquenta e ganha cauda.'}
                                        />
                                    }>
                                        <OrbitDistanceValue km={orbitFacts.perihelionKm} au={orbitFacts.perihelionAu} en={en} />
                                    </Row>
                                    <Row label={
                                        <LabelWithInfo
                                            text={en ? 'Aphelion' : 'Afélio'}
                                            tip={en
                                                ? 'Aphelion is the point in the orbit farthest from the Sun, where the object moves slowest. Long-period comets spend most of their time out here.'
                                                : 'Afélio é o ponto da órbita mais distante do Sol, onde o corpo se move mais devagar. Cometas de período longo passam quase todo o tempo lá.'}
                                        />
                                    }>
                                        <OrbitDistanceValue km={orbitFacts.aphelionKm} au={orbitFacts.aphelionAu} en={en} />
                                    </Row>
                                    {orbitFacts.nextPerihelion ? (
                                        <Row label={en ? 'Next pass near the Sun' : 'Próxima passagem perto do Sol'}>
                                            <span className="inline-flex items-baseline gap-1">
                                                {orbitFacts.nextPerihelion.getUTCFullYear()}
                                                <span className="text-[11px] font-normal text-white/50">· {en ? 'estimated' : 'estimado'}</span>
                                            </span>
                                        </Row>
                                    ) : null}
                                </>
                            ) : null}

                            {/* Ressalva de fonte: cometa famoso sem Horizons usa só a órbita conhecida. */}
                            {showKeplerOnlyNote ? (
                                <Row label={en ? 'Data source' : 'Fonte dos dados'}>
                                    <span className="flex flex-col items-end gap-0.5">
                                        <span className="flex items-center gap-1 text-yellow-400/75">
                                            <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
                                            {en ? 'computed from orbit' : 'calculado pela órbita'}
                                        </span>
                                        <span className="text-[11px] text-white/45 text-right">
                                            {en
                                                ? 'no live JPL Horizons data; values from the known orbit (Kepler)'
                                                : 'sem dado ao vivo do JPL Horizons; valores da órbita conhecida (Kepler)'}
                                        </span>
                                    </span>
                                </Row>
                            ) : null}

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
                                                {stale ? <TriangleAlert className="ml-1 inline size-3" aria-hidden="true" /> : null}
                                            </span>
                                            {stale ? (
                                                <span className="text-[11px] text-yellow-400/70">
                                                    {en
                                                        ? 'old data, position in the radar may be imprecise'
                                                        : 'dado antigo, posição no radar pode ser imprecisa'}
                                                </span>
                                            ) : null}
                                        </span>
                                    </Row>
                                );
                            })() : null}
                            {!showKeplerOnlyNote ? (
                                <Row label={en ? 'Data source' : 'Fonte dos dados'}>
                                    <span className="flex flex-col gap-0.5">
                                        <span className="text-white/50">{a.sourceLabel}</span>
                                        <span className="text-[11px] text-white/50">
                                            {a.source === 'cad'
                                                ? (en ? 'orbitally integrated, high precision' : 'órbita integrada, alta precisão')
                                                : (en ? 'broader coverage, lower precision' : 'cobertura ampla, menor precisão')}
                                        </span>
                                    </span>
                                </Row>
                            ) : null}
                        </dl>
                    ) : null}

                    {tab === 'history' && history ? (
                        <p className="text-[12.5px] leading-relaxed text-white/55 lg:text-[13px]">
                            {history}
                        </p>
                    ) : null}
                </div>
            </div>

            {/* Ações — footer unificado. Separador neutro: só a moldura externa leva ciano.
               Mobile: uma linha só (órbita + dossiê lado a lado), o sheet meio aberto é baixo.
               Desktop: empilhado, com o botão completo de dossiê. */}
            <div className="shrink-0 border-t border-white/10 px-3 py-1.5 lg:px-4 lg:py-2">
                <div className="flex items-stretch gap-1.5 lg:flex-col lg:gap-0 lg:space-y-1.5">
                    {hasOrbit ? (
                        <div className="min-w-0 flex-1 lg:flex-none">
                            <OrbitToggleButton
                                orbitMode={orbitMode}
                                canShowOrbitPosition={canShowOrbitPosition}
                                onShowOrbit={onShowOrbit}
                                onShowCloseUp={onShowCloseUp}
                                isComet={a.objectType === 'comet'}
                                en={en}
                            />
                        </div>
                    ) : null}
                    {/* Naves não têm dossiê (não são small-bodies do SBDB). O botão só aparece para
                        asteroides/cometas, que têm página de detalhe. */}
                    {onOpenFocus && a.objectType !== 'spacecraft' ? (
                        <>
                            {/* Desktop: botão completo; mobile: pill compacto ao lado da órbita */}
                            <button
                                type="button"
                                onClick={() => onOpenFocus(a)}
                                className="hidden lg:inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-[12px] font-medium text-white/60 transition outline-none hover:bg-white/5 hover:text-white/90 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                {en ? 'Open full dossier' : 'Abrir dossiê completo'}
                                <ArrowRight className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenFocus(a)}
                                className="lg:hidden inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-white/10 px-3 py-2 text-[11.5px] text-white/60 transition outline-none hover:text-white/85 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                {en ? 'Dossier' : 'Dossiê'}
                                <ArrowRight className="size-3" aria-hidden="true" />
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
    panelRef,
    desktopPanelCollapsed = false,
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
            en={en}
            onClose={onClose}
            closeLabel={en ? 'Close' : 'Fechar'}
            eyebrow={en ? cfg.subtitleEn : cfg.subtitlePt}
            title={en ? cfg.nameEn : cfg.namePt}
            dotColor={cfg.dotColor}
            borderClass="border-white/20"
            /* h fixa dá estabilidade entre corpos; o max-h do trilho corta com scroll em telas baixas */
            className={`flex lg:h-[30rem] w-full lg:w-[min(22rem,48%)] flex-col ${desktopRailClasses(desktopPanelCollapsed, false)}`}
            style={enterStyle}
            panelRef={panelRef}
        >
            <SheetAwarePreview>
                <BodyImagePreview body={body} />
            </SheetAwarePreview>

            {/* Abas — visíveis em mobile e desktop */}
            <FocusTabBar
                tabs={tabs}
                tab={tab}
                setTab={setTab}
                labels={tabLabels}
                ariaLabel={en ? 'Focus card sections' : 'Seções do painel de foco'}
            />

            <div
                role="tabpanel"
                id="focus-tabpanel"
                aria-labelledby={`focus-tab-${tab}`}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 lg:px-4 lg:py-3"
                style={{ transition: 'opacity 0.12s ease', opacity: contentVisible ? 1 : 0 }}
            >
                {/* min-h estabiliza o card ao trocar abas sem cortar a aba mais alta (Resumo) */}
                {/* min-h só no desktop (estabiliza troca de abas); no mobile a altura vem do snap */}
                <div className="lg:min-h-[13rem]">
                    {tab === 'summary' ? (
                        <div className="space-y-3.5">
                            <p className="text-[12.5px] leading-relaxed text-white/55 lg:text-[13px]">
                                {en ? cfg.contextEn : cfg.contextPt}
                            </p>
                            <dl className="space-y-3 text-[13px]">
                                {cfg.facts.slice(0, 2).map((fact) => (
                                    <Row key={fact.labelEn} label={en ? fact.labelEn : fact.labelPt}>
                                        <span className="font-semibold text-white">{localizedFact(fact.value)}</span>
                                    </Row>
                                ))}
                            </dl>
                        </div>
                    ) : null}

                    {tab === 'physical' ? (
                        <dl className="space-y-3 text-[13px]">
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

function OrbitToggleButton({ orbitMode, canShowOrbitPosition, onShowOrbit, onShowCloseUp, isComet, en }: {
    orbitMode: boolean;
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    /** Cometa usa o substantivo certo no botão de voltar ("cometa", não "asteroide"). */
    isComet: boolean;
    en: boolean;
}) {
    const disabled = !orbitMode && !canShowOrbitPosition;
    const baseClass = 'inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold tracking-tight transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan';
    const stateClass = disabled
        ? 'cursor-not-allowed border border-white/8 bg-white/4 text-white/40'
        : orbitMode
            ? 'border border-white/12 bg-white/5 text-white/75 hover:bg-white/8 hover:text-white/90'
            : 'border border-signal-cyan/35 bg-signal-cyan/8 text-signal-cyan shadow-[0_0_20px_rgba(34,211,238,0.14)] hover:border-signal-cyan/50 hover:bg-signal-cyan/12 hover:shadow-[0_0_24px_rgba(34,211,238,0.22)]';
    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={orbitMode ? onShowCloseUp : onShowOrbit}
                disabled={disabled}
                data-tutorial="orbit-button"
                className={`${baseClass} ${stateClass}`}
            >
                {orbitMode ? (
                    <>
                        <Undo2 className="size-3.5 shrink-0" aria-hidden="true" />
                        {isComet
                            ? (en ? 'Back to the comet' : 'Voltar ao cometa')
                            : (en ? 'Back to the asteroid' : 'Voltar ao asteroide')}
                    </>
                ) : (
                    <>
                        <Orbit className="size-3.5 shrink-0" aria-hidden="true" />
                        {en ? 'See its orbit around the Sun' : 'Ver a órbita ao redor do Sol'}
                    </>
                )}
            </button>
            {disabled ? (
                <p className="text-center text-[10px] text-white/45">
                    {en ? 'Orbit unavailable, perihelion epoch missing' : 'Órbita indisponível, época de periélio ausente'}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Barra de abas com semântica ARIA de tablist: setas alternam e ativam as abas,
 * Home/End saltam para as pontas, e só a aba ativa participa do tab order
 * (roving tabindex). O painel de conteúdo correspondente usa id `focus-tabpanel`.
 */
function FocusTabBar({ tabs, tab, setTab, labels, ariaLabel }: {
    tabs: Tab[];
    tab: Tab;
    setTab: (t: Tab) => void;
    labels: Record<Tab, string>;
    ariaLabel: string;
}) {
    const buttonRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
    const tutorial = useRadarTutorialOptional();

    const activateTab = (next: Tab) => {
        if (!(tutorial?.isActionAllowed('card-tab', { tab: next }) ?? true)) return false;
        setTab(next);
        tutorial?.completeStep('card-tab', { tab: next });
        return true;
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const idx = tabs.indexOf(tab);
        let next: Tab | undefined;
        if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        if (activateTab(next)) buttonRefs.current[next]?.focus();
    };

    return (
        <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} data-tutorial="card-tabs" className="flex gap-0 border-b border-white/10 px-3 lg:mt-1 lg:px-4">
            {tabs.map((t) => (
                <FocusTabButton
                    key={t}
                    id={`focus-tab-${t}`}
                    active={tab === t}
                    disabled={tab !== t && !(tutorial?.isActionAllowed('card-tab', { tab: t }) ?? true)}
                    onClick={() => activateTab(t)}
                    buttonRef={(el) => { buttonRefs.current[t] = el; }}
                >
                    {labels[t]}
                </FocusTabButton>
            ))}
        </div>
    );
}

function FocusTabButton({ id, active, onClick, buttonRef, disabled = false, children }: {
    id: string;
    active: boolean;
    onClick: () => void;
    buttonRef: Ref<HTMLButtonElement>;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            ref={buttonRef}
            id={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="focus-tabpanel"
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={onClick}
            /* py-2 no mobile garante área de toque adequada com altura mais compacta */
            className={[
                '-mb-px flex-1 rounded-t-md border-b-2 px-2.5 py-2 text-center text-[11px] font-medium tracking-wide transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:opacity-35 lg:px-3 lg:py-2 lg:text-[12px]',
                active
                    ? 'border-signal-cyan text-white drop-shadow-[0_1px_12px_rgba(34,211,238,0.55)]'
                    : 'border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/80',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt className="shrink-0 text-[10.5px] font-normal uppercase tracking-wide text-white/50">{label}</dt>
            <dd className="text-right text-[12px] font-semibold text-white">{children}</dd>
        </div>
    );
}

/** Valor de distância orbital: km como principal (unidade do produto) + UA como secundário, entre parênteses. */
function OrbitDistanceValue({ km, au, en }: { km: number; au: number; en: boolean }) {
    return (
        <span className="inline-flex items-baseline gap-1">
            <span>{approxKm(km)}</span>
            <span className="text-[11px] font-normal text-white/50">
                · {au.toLocaleString(en ? 'en' : 'pt-BR', { maximumFractionDigits: au < 10 ? 2 : 1 })} {en ? 'AU' : 'UA'}
            </span>
        </span>
    );
}

/**
 * Período orbital legível: "X anos" (1 casa) no caso comum; "N meses" abaixo de 1 ano; e arredonda em
 * "mil anos" para órbitas muito longas (cometas de período longo), onde a casa decimal não faz sentido.
 */
function formatOrbitalPeriod(years: number, en: boolean): string {
    if (years < 1) {
        const months = Math.round(years * 12);
        return en ? `${months} month${months === 1 ? '' : 's'}` : `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    if (years >= 1000) {
        const formatted = new Intl.NumberFormat(en ? 'en' : 'pt-BR').format(Math.round(years));
        return en ? `${formatted} years` : `${formatted} anos`;
    }
    const formatted = years.toLocaleString(en ? 'en' : 'pt-BR', { maximumFractionDigits: 1 });
    return en ? `${formatted} years` : `${formatted} anos`;
}

/** Rótulo com ícone de info: o tooltip explica o termo (ex.: periélio/afélio) sem inflar o card. */
function LabelWithInfo({ text, tip }: { text: string; tip: string }) {
    return (
        <span className="inline-flex items-center gap-1">
            {text}
            <Tooltip side="top" wrap content={tip}>
                <Info className="size-3 cursor-help text-signal-cyan/70 transition hover:text-signal-cyan" aria-hidden="true" />
            </Tooltip>
        </span>
    );
}
