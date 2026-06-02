/**
 * Conteúdo desktop do painel de navegação.
 *
 * Responsabilidade: renderizar referências e lista de objetos em fluxo lateral,
 * usando apenas dados e callbacks recebidos do painel principal.
 */

import { ReferenceSection } from '../Controls/ReferenceControls';
import { listTitle } from './MobilePanelControls';
import { RadarNavigationObjectList, RefreshButton } from './RadarNavigationObjectList';
import type { NavigationContentProps } from './radarNavigationTypes';

export function RadarNavigationDesktopContent({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
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
            <div className="hidden lg:block">
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

            <div className="hidden min-h-0 flex-1 flex-col px-2 py-2 lg:flex">
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
