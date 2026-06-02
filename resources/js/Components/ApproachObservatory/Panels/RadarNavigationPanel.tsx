/**
 * Painel de navegação do radar 3D.
 *
 * Responsabilidade: manter moldura desktop/mobile, colapso e flyout lateral de
 * planetas. O conteúdo interno fica em componentes locais para preservar
 * legibilidade sem mover seleção, ranking ou regras orbitais para `Panels`.
 */

import { ChevronDown, ChevronUp } from 'lucide-react';
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-space-950/90 px-2.5 py-1.5 text-[11px] font-medium text-white/75 shadow-glow backdrop-blur transition hover:border-white/25 hover:text-white lg:hidden"
                    >
                        <ChevronDown className="size-3.5 -rotate-90" />
                        <span>{en ? 'Objects' : 'Objetos'}</span>
                    </button>
                ) : null}

                <div
                    ref={sidePanelRef}
                        className={[
                            'flex flex-col overflow-visible rounded-xl border border-white/10 bg-space-950/90 backdrop-blur-xl',
                        orbitMode
                            ? 'lg:flex lg:h-[min(16rem,40vh)] lg:w-[min(18rem,48vw)]'
                            : 'lg:flex lg:h-[min(20rem,40vh)] lg:w-[min(18rem,48vw)]',
                        panelCollapsed
                            ? 'hidden lg:flex'
                            : orbitMode
                                ? 'flex h-[min(10.5rem,27vh)] w-[min(15rem,calc(100vw-5rem))]'
                                : 'flex h-[min(13rem,33vh)] w-[min(15rem,calc(100vw-5rem))]',
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
                        className="flex flex-col overflow-y-auto rounded-xl border border-white/10 bg-space-950/90 backdrop-blur-xl
                                   h-[min(13rem,34vh)] w-[min(15rem,calc(100vw-5rem))]
                                   lg:h-[min(26rem,70vh)] lg:w-[min(14rem,40vw)]"
                    >
                        <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-white/45 border-b border-white/10">
                            {en ? 'Planets' : 'Planetas'}
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
