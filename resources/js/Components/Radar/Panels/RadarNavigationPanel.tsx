/**
 * Painel de navegação do radar 3D.
 *
 * Responsabilidade: manter moldura desktop/mobile, colapso e flyout lateral de
 * planetas. O conteúdo interno fica em componentes locais para preservar
 * legibilidade sem mover seleção, ranking ou regras orbitais para `Panels`.
 */

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { PlanetFlyout } from '../Controls/ReferenceControls';
import type { PlanetId } from '../Scene/planetConfig';
import { RadarNavigationDesktopContent } from './RadarNavigationDesktopContent';
import { RadarNavigationMobileContent } from './RadarNavigationMobileContent';
import type { RadarNavigationPanelProps } from './radarNavigationTypes';

export function RadarNavigationPanel({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    radarLoading,
    onRefresh,
    panelCollapsed,
    onPanelCollapsedChange,
    mobilePanelSection,
    onMobilePanelSectionChange,
    planetsOpen,
    onPlanetsOpenChange,
    bodyCardOpen,
    sidePanelRef,
    planetFlyoutRef,
    onShowNavigationPanel,
    onSelectObject,
    onFocusBody,
    onFocusPlanet,
    onFocusSun,
}: RadarNavigationPanelProps) {
    const closeMobilePanel = () => {
        onPanelCollapsedChange(true);
        onMobilePanelSectionChange('objects');
        onPlanetsOpenChange(false);
    };

    return (
        <div className="pointer-events-none absolute left-3 top-3 z-40">
            <div className="pointer-events-auto relative flex flex-col items-start gap-2 overflow-visible lg:flex-row">
                {panelCollapsed ? (
                    <button
                        type="button"
                        onClick={onShowNavigationPanel}
                        aria-label={en ? 'Show navigation panel' : 'Mostrar painel de navegação'}
                        /* py-2 e px-3.5 garantem área de toque mínima de 44px no mobile */
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-space-950/92 px-3.5 py-2 text-[12px] font-medium text-white/80 shadow-glow backdrop-blur transition hover:border-white/30 hover:text-white lg:hidden"
                    >
                        <ChevronDown className="size-4 -rotate-90" />
                        <span>{en ? 'Objects' : 'Objetos'}</span>
                    </button>
                ) : null}

                <div
                    ref={sidePanelRef}
                        className={[
                            /* Painel lateral: navegação secundária — mais discreto que o card dossiê. */
                            'flex flex-col overflow-visible rounded-2xl border border-white/[0.08] bg-space-950/88 backdrop-blur-xl',
                            'shadow-[0_2px_16px_rgba(0,0,0,0.4)]',
                        orbitMode
                            ? 'lg:flex lg:h-[min(16rem,40vh)] lg:w-[min(18rem,48vw)]'
                            : 'lg:flex lg:h-[min(20rem,40vh)] lg:w-[min(18rem,48vw)]',
                        panelCollapsed
                            ? 'hidden lg:flex'
                            : orbitMode
                                /* Altura mobile um pouco maior para conteúdo respirar */
                                ? 'flex h-[min(12rem,30vh)] w-[min(17rem,calc(100vw-4rem))]'
                                : 'flex h-[min(15rem,36vh)] w-[min(17rem,calc(100vw-4rem))]',
                    ].join(' ')}
                >
                    <div className="border-b border-white/10 px-2 pt-1 pb-1.5 lg:hidden">
                        <button
                            type="button"
                            onClick={closeMobilePanel}
                            aria-label={en ? 'Collapse panel' : 'Recolher painel'}
                            className="flex w-full flex-col items-center gap-1 rounded-lg py-0.5 text-signal-cyan/75 transition hover:text-signal-cyan"
                        >
                            <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
                                <ChevronUp className="size-3" aria-hidden />
                                {en ? 'Objects' : 'Objetos'}
                            </span>
                        </button>
                    </div>

                    <RadarNavigationMobileContent
                        en={en}
                        locale={locale}
                        orbitMode={orbitMode}
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        radarLoading={radarLoading}
                        onRefresh={onRefresh}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        onSelectObject={onSelectObject}
                        onFocusBody={onFocusBody}
                        onFocusSun={onFocusSun}
                    />

                    <RadarNavigationDesktopContent
                        en={en}
                        locale={locale}
                        orbitMode={orbitMode}
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        radarLoading={radarLoading}
                        onRefresh={onRefresh}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        onSelectObject={onSelectObject}
                        onFocusBody={onFocusBody}
                        onFocusSun={onFocusSun}
                    />
                </div>

                {planetsOpen && !orbitMode ? (
                    <div
                        ref={planetFlyoutRef}
                        className="flex flex-col overflow-y-auto rounded-2xl border border-white/[0.08] bg-space-950/88 backdrop-blur-xl
                                   shadow-[0_2px_16px_rgba(0,0,0,0.4)]
                                   h-[min(15rem,36vh)] w-[min(17rem,calc(100vw-4rem))]
                                   lg:h-[min(20rem,40vh)] lg:w-[min(14rem,40vw)]"
                    >
                        <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-white/[0.07]">
                            <span className="text-[9.5px] font-medium uppercase tracking-widest text-white/50">
                                {en ? 'Planets' : 'Planetas'}
                            </span>
                            <button
                                type="button"
                                onClick={() => onPlanetsOpenChange(false)}
                                className="-mr-1 rounded-full p-1 text-white/40 transition outline-none hover:bg-white/8 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                aria-label={en ? 'Close planets' : 'Fechar planetas'}
                            >
                                <X className="size-3.5" aria-hidden />
                            </button>
                        </div>
                        <PlanetFlyout
                            en={en}
                            focusedId={bodyCardOpen as PlanetId | null}
                            onFocus={onFocusPlanet}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
