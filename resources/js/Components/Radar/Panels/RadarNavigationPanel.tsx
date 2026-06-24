/**
 * Painel de navegação do radar 3D.
 *
 * Responsabilidade: decidir a moldura por viewport. No desktop (lg:) mantém o
 * painel lateral com flyout de planetas, recolhível em pill para dar
 * protagonismo total à cena (modo explorar). No mobile renderiza bottom sheets
 * (objetos e filtros) abertos pela barra de ações inferior. O conteúdo interno
 * fica em componentes locais; seleção, ranking e regras orbitais não moram aqui.
 */

import { useEffect } from 'react';
import { List, PanelLeftClose, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';
import { PlanetFlyout } from '../Controls/ReferenceControls';
import { Tooltip } from '../Controls/Tooltip';
import { MOBILE_MEDIA_QUERY } from '../radarLayoutConstants';
import type { PlanetId } from '../Scene/planetConfig';
import { listTitle } from './MobilePanelControls';
import { MobileFiltersSheetContent } from './MobileFiltersSheetContent';
import { MobileSheet } from './MobileSheet';
import { RadarNavigationDesktopContent } from './RadarNavigationDesktopContent';
import { RadarNavigationMobileContent } from './RadarNavigationMobileContent';
import { RefreshButton } from './RadarNavigationObjectList';
import type { RadarNavigationPanelProps } from './radarNavigationTypes';

export function RadarNavigationPanel(props: RadarNavigationPanelProps) {
    const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
    return isMobile ? <MobileNavigationSheets {...props} /> : <DesktopNavigationPanel {...props} />;
}

// ─── Mobile: bottom sheets ─────────────────────────────────────────────────────

function MobileNavigationSheets({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading,
    onRefresh,
    mobileSheet,
    onMobileSheetChange,
    planetsOpen,
    onPlanetsOpenChange,
    bodyCardOpen,
    sidePanelRef,
    planetFlyoutRef,
    onSelectObject,
    onFocusBody,
    onFocusPlanet,
    onFocusSun,
}: RadarNavigationPanelProps) {
    const closeSheet = () => {
        onMobileSheetChange(null);
        onPlanetsOpenChange(false);
    };

    if (mobileSheet === 'objects') {
        return (
            <MobileSheet
                en={en}
                title={listTitle(closestNowObjects.length, selectionMode, en)}
                closeLabel={en ? 'Close objects panel' : 'Fechar painel de objetos'}
                onClose={closeSheet}
                headerTrailing={<RefreshButton en={en} onRefresh={onRefresh} loading={radarLoading} />}
                dataTutorial="object-list"
                panelRef={sidePanelRef}
            >
                <RadarNavigationMobileContent
                    en={en}
                    locale={locale}
                    orbitMode={orbitMode}
                    closestNowObjects={closestNowObjects}
                    selectedId={selectedId}
                    objectLimit={objectLimit}
                    selectionMode={selectionMode}
                    radarLoading={radarLoading}
                    planetsOpen={planetsOpen}
                    onPlanetsOpenChange={onPlanetsOpenChange}
                    onSelectObject={onSelectObject}
                    onFocusBody={onFocusBody}
                    onFocusSun={onFocusSun}
                    onFocusPlanet={onFocusPlanet}
                    bodyCardOpen={bodyCardOpen}
                />
            </MobileSheet>
        );
    }

    if (mobileSheet === 'filters') {
        return (
            <MobileSheet
                en={en}
                title={en ? 'Filters' : 'Filtros'}
                closeLabel={en ? 'Close filters' : 'Fechar filtros'}
                onClose={closeSheet}
                panelRef={planetFlyoutRef}
            >
                <MobileFiltersSheetContent
                    en={en}
                    objectLimit={objectLimit}
                    selectionMode={selectionMode}
                    onLimitChange={onLimitChange}
                    onModeChange={onModeChange}
                    loading={radarLoading}
                />
            </MobileSheet>
        );
    }

    return null;
}

// ─── Desktop: painel lateral + flyout de planetas ──────────────────────────────

function DesktopNavigationPanel({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    radarLoading,
    onRefresh,
    desktopCollapsed,
    onDesktopCollapsedChange,
    planetsOpen,
    onPlanetsOpenChange,
    bodyCardOpen,
    sidePanelRef,
    planetFlyoutRef,
    onSelectObject,
    onFocusBody,
    onFocusPlanet,
    onFocusSun,
}: RadarNavigationPanelProps) {
    const tutorial = useRadarTutorialOptional();
    const flyoutOpen = planetsOpen && !orbitMode && !desktopCollapsed;

    // Clicar fora do compartimento de planetas o fecha. Ignora cliques no próprio
    // flyout e no botão "Planetas" (que já alterna sozinho). Durante o tutorial o
    // flyout é guiado pelo passo, então não fechamos por clique fora ali.
    useEffect(() => {
        if (!flyoutOpen || tutorial?.active) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (planetFlyoutRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('[data-tutorial="reference-planets"]')) return;
            onPlanetsOpenChange(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [flyoutOpen, tutorial?.active, planetFlyoutRef, onPlanetsOpenChange]);

    return (
        <div className="pointer-events-none absolute left-3 top-3 z-40">
            <div className="pointer-events-auto relative flex items-start gap-2 overflow-visible flex-row cursor-auto">
                {/* O mesmo elemento (e ref) alterna entre painel e pill: observers de
                    labels/câmera seguem o resize sem reanexar. */}
                <div
                    ref={sidePanelRef}
                    data-tutorial="object-list"
                    className={[
                        /* Painel lateral: navegação secundária — mais discreto que o card dossiê. */
                        'relative flex flex-col overflow-visible rounded-2xl border border-white/[0.08] bg-space-950/88 backdrop-blur-xl',
                        'shadow-[0_2px_16px_rgba(0,0,0,0.4)]',
                        desktopCollapsed
                            ? 'h-auto w-auto'
                            : orbitMode
                                ? 'h-[min(16rem,40vh)] w-[min(18rem,48vw)]'
                                : 'h-[min(20rem,40vh)] w-[min(18rem,48vw)]',
                    ].join(' ')}
                >
                    {desktopCollapsed ? (
                        <button
                            type="button"
                            onClick={() => onDesktopCollapsedChange(false)}
                            aria-expanded={false}
                            className="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[12px] font-medium text-white/70 transition outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        >
                            <List className="size-3.5 text-signal-cyan/70" aria-hidden />
                            {en ? 'Objects' : 'Objetos'}
                            <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] tabular-nums text-white/50">
                                {closestNowObjects.length}
                            </span>
                        </button>
                    ) : (
                        <>
                            <Tooltip content={en ? 'Collapse panel' : 'Recolher painel'} hideDelay={150}>
                                <button
                                    type="button"
                                    onClick={() => { onDesktopCollapsedChange(true); onPlanetsOpenChange(false); }}
                                    aria-expanded={true}
                                    aria-label={en ? 'Collapse panel' : 'Recolher painel'}
                                    className="absolute right-1.5 top-1.5 z-10 rounded-full p-1 text-white/35 transition outline-none hover:bg-white/8 hover:text-white/75 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                                >
                                    <PanelLeftClose className="size-3.5" aria-hidden />
                                </button>
                            </Tooltip>
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
                        </>
                    )}
                </div>

                {flyoutOpen ? (
                    <div
                        ref={planetFlyoutRef}
                        data-tutorial="planet-flyout"
                        className="flex flex-col overflow-y-auto rounded-2xl border border-white/[0.08] bg-space-950/88 backdrop-blur-xl
                                   shadow-[0_2px_16px_rgba(0,0,0,0.4)]
                                   h-[min(20rem,40vh)] w-[min(14rem,40vw)]"
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
