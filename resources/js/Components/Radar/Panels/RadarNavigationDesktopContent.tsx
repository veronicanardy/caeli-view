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
    spacecraftOpen,
    onSpacecraftOpenChange,
    onSelectObject,
    onFocusBody,
    onFocusSun,
}: NavigationContentProps) {
    return (
        <>
            <ReferenceSection
                en={en}
                orbitMode={orbitMode}
                planetsOpen={planetsOpen}
                onPlanetsOpenChange={onPlanetsOpenChange}
                spacecraftOpen={spacecraftOpen}
                onSpacecraftOpenChange={onSpacecraftOpenChange}
                onFocusEarth={() => onFocusBody('earth')}
                onFocusMoon={() => onFocusBody('moon')}
                onFocusSun={onFocusSun}
            />

            <div className="mt-1 flex min-h-0 flex-1 flex-col border-t border-white/[0.07] px-2 py-1.5">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-1 pb-1.5 mb-1 pt-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">
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
