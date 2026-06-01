import { ReferenceSection } from '../Controls/ReferenceControls';
import { MobilePanelSectionHeader } from './MobilePanelControls';
import { RadarNavigationObjectList, RefreshButton } from './RadarNavigationObjectList';
import type { NavigationContentProps } from './radarNavigationTypes';

/**
 * Conteudo mobile do painel de navegacao.
 *
 * No mobile o painel agora abre direto no ranking de objetos para evitar a
 * navegacao extra por secoes.
 */
export function RadarNavigationMobileContent({
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:hidden">
            <div className="flex min-h-0 flex-1 flex-col">
                <MobilePanelSectionHeader
                    title={en ? 'Nearest objects' : 'Objetos proximos'}
                    trailing={<RefreshButton en={en} onRefresh={onRefresh} loading={radarLoading} />}
                />
                <div className="border-b border-white/10 px-2 py-1.5">
                    <ReferenceSection
                        en={en}
                        orbitMode={orbitMode}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        onFocusEarth={() => onFocusBody('earth')}
                        onFocusMoon={() => onFocusBody('moon')}
                        onFocusSun={onFocusSun}
                        compact
                    />
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
                    mobile
                />
            </div>
        </div>
    );
}
