/**
 * Card de foco de corpo celeste (kind: 'body' do UnifiedFocusCard).
 *
 * Abas Resumo · Perfil físico · História, com imagem real, fatos e narrativa
 * vindos de bodyData (BODIES). Renderiza dados estáticos já curados; não calcula
 * efeméride nem posição. O shell de abas e as peças comuns vivem em
 * FocusCardParts.
 */

import { BODIES } from './bodyData';
import { PanelShell } from './PanelShell';
import { BodyImagePreview } from './BodyImagePreview';
import {
    desktopRailClasses,
    FocusTabBar,
    Row,
    SheetAwarePreview,
    TAB_LABELS_EN,
    TAB_LABELS_PT,
    type BodyProps,
    type Tab,
    type TabState,
} from './FocusCardParts';

export function BodyFocusCard({
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
