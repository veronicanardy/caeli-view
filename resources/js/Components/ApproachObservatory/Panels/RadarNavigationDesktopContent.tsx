import { RadarObjectControls } from '../Controls/RadarObjectControls';
import { ReferenceSection } from '../Controls/ReferenceControls';
import { listTitle } from './MobilePanelControls';
import { RadarNavigationObjectList, RefreshButton } from './RadarNavigationObjectList';
import type { NavigationContentProps } from './radarNavigationTypes';

/**
 * Conteudo desktop do painel de navegacao.
 *
 * Mantem filtros, referencias e lista em fluxo unico, apenas renderizando dados
 * e callbacks recebidos do componente principal.
 */

export function RadarNavigationDesktopContent({
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
    planetsOpen,
    onPlanetsOpenChange,
    onSelectObject,
    onFocusBody,
    onFocusSun,
}: NavigationContentProps) {
    return (
        <>
            {!orbitMode ? (
                <div className="hidden border-b border-white/10 px-2 py-2 sm:block">
                    <RadarObjectControls
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        onLimitChange={onLimitChange}
                        onModeChange={onModeChange}
                        locale={locale}
                        loading={radarLoading}
                        criterionLocked={orbitMode}
                    />
                </div>
            ) : null}

            <div className="hidden sm:block">
                <ReferenceSection
                    en={en}
                    orbitMode={orbitMode}
                    planetsOpen={planetsOpen}
                    onPlanetsOpenChange={onPlanetsOpenChange}
                    onFocusEarth={() => onFocusBody('earth')}
                    onFocusMoon={() => onFocusBody('moon')}
                    onFocusSun={onFocusSun}
                />
            </div>

            <div className="hidden min-h-0 flex-1 flex-col px-2 py-2 sm:flex">
                <div className="flex items-center justify-between px-1 pb-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-white/45">
                        {listTitle(closestNowObjects.length, selectionMode, en)}
                    </span>
                    <RefreshButton en={en} onRefresh={onRefresh} loading={radarLoading} />
                </div>
                <RadarNavigationObjectList
                    objects={closestNowObjects}
                    selectedId={selectedId}
                    objectLimit={objectLimit}
                    selectionMode={selectionMode}
                    onSelect={onSelectObject}
                    locale={locale}
                    orbitMode={orbitMode}
                    radarLoading={radarLoading}
                />
            </div>
        </>
    );
}
