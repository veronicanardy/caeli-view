/**
 * Card de foco de nave/missão (Voyager, Pioneer, New Horizons, Juno, James Webb,
 * Parker Solar Probe, Europa Clipper).
 *
 * Abas Resumo · Missão · História (via focusCardTabs), sem Aproximação (não há
 * flyby da Terra) nem Perfil físico (nave não tem diâmetro/velocidade/magnitude
 * do feed). A identidade (operadora, marcos, distância da Terra) vem de
 * KNOWN_SPACECRAFT e do conteúdo editorial em spacecraftData, casados pelo id.
 * O shell de abas e as peças comuns vivem em FocusCardParts.
 */

import { useEffect } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { approxKm } from '@/lib/format';
import { formatDistanceAU } from '@/lib/radar/format';
import { smartSummary } from './focusCardPresentation';
import { knownSpacecraftById, knownSpacecraftEarthDistanceKm } from '../Bodies/Spacecraft/knownSpacecraft';
import { spacecraftContext, spacecraftMilestones, spacecraftMissionIntro } from './spacecraftData';
import { tabsForFocusObject } from '@/lib/radar/focusCardTabs';
import { famousLoreFor } from './famousLore';
import { PanelShell } from './PanelShell';
import { SpacecraftImagePreview } from './SpacecraftImagePreview';
import {
    desktopRailClasses,
    FocusTabBar,
    Row,
    SheetAwarePreview,
    TAB_LABELS_EN,
    TAB_LABELS_PT,
    type AsteroidProps,
    type Tab,
    type TabState,
} from './FocusCardParts';

export function SpacecraftFocusCard({
    object,
    onClose,
    orbitMode,
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
    const craft = knownSpacecraftById(a.id);
    // Contexto rico (como o dos planetas); cai no resumo genérico do smartSummary se a nave não tiver
    // conteúdo editorial cadastrado.
    const context = spacecraftContext(a.id, locale)
        ?? smartSummary({ objectType: 'spacecraft', sizeMeters: null, velocityKph: null }, en);
    const milestones = spacecraftMilestones(a.id);
    const missionIntro = spacecraftMissionIntro(a.id, locale);
    // No radar a distância importante é DA TERRA. O objeto sintético já chega com ela (geocêntrica,
    // knownSpacecraftEarthDistanceKm); o fallback local cobre o caso raro de objeto montado sem ela e
    // devolve null quando não dá para calcular com honestidade (o approxKm mostra "Indisponível").
    const distanceKm = object.currentDistanceKm
        ?? (craft ? knownSpacecraftEarthDistanceKm(craft) : null);
    const auText = formatDistanceAU(distanceKm, locale);
    const operator = craft ? (en ? craft.operator.en : craft.operator.pt) : null;

    const history = famousLoreFor(a.id, locale);
    const tabs: Tab[] = tabsForFocusObject('spacecraft', history != null);
    const tabLabels = en ? TAB_LABELS_EN : TAB_LABELS_PT;

    useEffect(() => {
        if (tab !== 'summary' && !tabs.includes(tab)) setTab('summary');
    }, [tab, tabs, setTab]);

    const eyebrowPrefix = onShowPanel ? (
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

    return (
        <PanelShell
            en={en}
            onClose={onClose}
            closeLabel={en ? 'Close focus card' : 'Fechar painel'}
            showCloseButton={!orbitMode}
            eyebrow={en ? 'Spacecraft · Mission' : 'Nave · Missão'}
            eyebrowPrefix={eyebrowPrefix}
            title={a.displayName ?? a.name}
            dotColor="#9fc0e8"
            borderClass="border-signal-cyan/25"
            className={`flex w-full lg:w-[min(22rem,48%)] flex-col ${desktopRailClasses(desktopPanelCollapsed, orbitMode)}`}
            style={enterStyle}
            panelRef={panelRef}
            dataTutorial="selected-card"
        >
            <SheetAwarePreview>
                <SpacecraftImagePreview id={a.id} name={a.displayName ?? a.name} />
            </SheetAwarePreview>

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
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 lg:px-4"
                style={{ transition: 'opacity 0.12s ease', opacity: contentVisible ? 1 : 0 }}
            >
                <div className="lg:h-[15rem]">
                    {tab === 'summary' ? (
                        <div className="space-y-2.5 lg:space-y-3.5">
                            {context ? (
                                <p className="text-[12px] leading-relaxed text-white/55 lg:text-[12.5px]">{context}</p>
                            ) : null}
                            {/* Distância DA TERRA: a métrica que importa no radar. Geocêntrica de verdade
                                (geoAU do Horizons ou vetor efetivo menos a Terra da efeméride), o que importa
                                nas naves próximas: o James Webb está a 0,01 UA, e o número heliocêntrico
                                erraria por 100 vezes. */}
                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-[10.5px] font-normal uppercase tracking-wide text-white/50">
                                        {en ? 'Distance from Earth' : 'Distância da Terra'}
                                    </span>
                                    <span className={`flex items-center gap-1 text-[10px] ${object.hasRealCurrentDistance ? 'text-white/45' : 'text-yellow-400/75'}`}>
                                        {!object.hasRealCurrentDistance ? <TriangleAlert className="size-2.5 shrink-0" aria-hidden="true" /> : null}
                                        {object.hasRealCurrentDistance
                                            ? (en ? 'live · Horizons' : 'ao vivo · Horizons')
                                            : (en ? 'approximate position' : 'posição aproximada')}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                                    <span className="text-lg font-semibold leading-tight text-white">{approxKm(distanceKm)}</span>
                                    <span className="text-[11px] text-white/50">· {auText}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {tab === 'mission' ? (
                        <div className="space-y-3.5">
                            {/* Abertura que dá sentido à linha do tempo: o "porquê" da missão antes do "o quê
                                e quando" dos marcos. Conteúdo curado em spacecraftData (missionIntro). */}
                            {missionIntro ? (
                                <p className="text-[12px] leading-relaxed text-white/55 lg:text-[12.5px]">{missionIntro}</p>
                            ) : null}
                            {operator ? (
                                <dl className="space-y-3 text-[13px]">
                                    <Row label={en ? 'Operator' : 'Operadora'}>{operator}</Row>
                                </dl>
                            ) : null}
                            {/* Linha do tempo: marcos passados e previsões futuras. Futuro destacado em ciano
                                com selo "estimado", o resto neutro. Conteúdo curado em spacecraftData. */}
                            {milestones.length > 0 ? (
                                <ol className="relative space-y-2.5 border-l border-white/10 pl-3.5">
                                    {milestones.map((m, i) => (
                                        <li key={i} className="relative">
                                            <span
                                                className={`absolute -left-[1.18rem] top-1 size-1.5 rounded-full ${m.future ? 'bg-signal-cyan/80' : 'bg-white/35'}`}
                                                aria-hidden="true"
                                            />
                                            <div className="flex items-baseline gap-2">
                                                <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${m.future ? 'text-signal-cyan/85' : 'text-white/65'}`}>
                                                    {m.year}
                                                </span>
                                                {m.future ? (
                                                    <span className="rounded-full border border-signal-cyan/30 px-1.5 py-px text-[9px] uppercase tracking-wide text-signal-cyan/70">
                                                        {en ? 'forecast' : 'previsão'}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-0.5 text-[12px] leading-snug text-white/55">{en ? m.en : m.pt}</p>
                                        </li>
                                    ))}
                                </ol>
                            ) : null}
                        </div>
                    ) : null}

                    {tab === 'history' && history ? (
                        <p className="text-[12.5px] leading-relaxed text-white/55 lg:text-[13px]">{history}</p>
                    ) : null}
                </div>
            </div>
        </PanelShell>
    );
}
