import { RadarObjectControls } from '../Controls/RadarObjectControls';
import { PlanetFlyout, ReferenceSection } from '../Controls/ReferenceControls';
import type { PlanetId } from '../Scene/planetConfig';
import { listTitle, MobilePanelMenuButton, MobilePanelSectionHeader, type MobilePanelSection } from './MobilePanelControls';
import { RadarNavigationObjectList, RefreshButton } from './RadarNavigationObjectList';
import type { NavigationContentProps } from './radarNavigationTypes';

/**
 * Conteúdo mobile do painel de navegação.
 *
 * Separa menus e seções compactas sem alterar filtros, referências, seleção ou
 * abertura de planetas definidos pelo componente pai.
 */

export function RadarNavigationMobileContent({
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
    mobilePanelSection,
    onMobilePanelSectionChange,
    backToMenu,
    closeReferenceSection,
    planetsOpen,
    onPlanetsOpenChange,
    bodyCardOpen,
    onSelectObject,
    onFocusBody,
    onFocusPlanet,
    onFocusSun,
}: NavigationContentProps & {
    mobilePanelSection: MobilePanelSection;
    onMobilePanelSectionChange: (section: MobilePanelSection) => void;
    backToMenu: () => void;
    closeReferenceSection: () => void;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    onFocusPlanet: (id: PlanetId) => void;
}) {
    return (
        <div className="flex flex-1 flex-col sm:hidden">
            {mobilePanelSection === 'menu' ? (
                <div className="flex flex-1 flex-col gap-2 px-2 py-2">
                    {!orbitMode ? (
                        <MobilePanelMenuButton
                            label={en ? 'Filters' : 'Filtros'}
                            subtitle={en ? 'Amount and criterion' : 'Quantidade e critério'}
                            onClick={() => onMobilePanelSectionChange('filters')}
                        />
                    ) : null}
                    <MobilePanelMenuButton
                        label={en ? 'References' : 'Referências'}
                        subtitle={en ? 'Sun, Earth, Moon and planets' : 'Sol, Terra, Lua e planetas'}
                        onClick={() => onMobilePanelSectionChange('reference')}
                    />
                    <MobilePanelMenuButton
                        label={en ? 'Nearest objects' : 'Objetos próximos'}
                        subtitle={listTitle(closestNowObjects.length, selectionMode, en)}
                        onClick={() => onMobilePanelSectionChange('objects')}
                    />
                </div>
            ) : null}

            {mobilePanelSection === 'filters' && !orbitMode ? (
                <div className="flex flex-1 flex-col">
                    <MobilePanelSectionHeader
                        title={en ? 'Filters' : 'Filtros'}
                        backLabel={en ? 'Back' : 'Voltar'}
                        onBack={backToMenu}
                    />
                    <div className="min-h-0 px-2 py-2">
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
                </div>
            ) : null}

            {mobilePanelSection === 'reference' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <MobilePanelSectionHeader
                        title={en ? 'References' : 'Referências'}
                        backLabel={en ? 'Back' : 'Voltar'}
                        onBack={closeReferenceSection}
                    />
                    <ReferenceSection
                        en={en}
                        orbitMode={orbitMode}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        onFocusEarth={() => onFocusBody('earth')}
                        onFocusMoon={() => onFocusBody('moon')}
                        onFocusSun={onFocusSun}
                    />
                    {planetsOpen && !orbitMode ? (
                        <div className="min-h-0 flex-1 border-t border-white/10 px-2 py-2">
                            <div className="max-h-[8.5rem] overflow-y-auto rounded-xl border border-white/10 bg-space-950 px-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                                <PlanetFlyout
                                    en={en}
                                    focusedId={bodyCardOpen as PlanetId | null}
                                    onFocus={onFocusPlanet}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {mobilePanelSection === 'objects' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <MobilePanelSectionHeader
                        title={en ? 'Nearest objects' : 'Objetos próximos'}
                        backLabel={en ? 'Back' : 'Voltar'}
                        onBack={backToMenu}
                        trailing={<RefreshButton en={en} onRefresh={onRefresh} loading={radarLoading} />}
                    />
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
            ) : null}
        </div>
    );
}
