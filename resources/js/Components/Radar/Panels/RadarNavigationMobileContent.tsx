/**
 * Conteúdo do sheet de objetos do radar mobile.
 *
 * Responsabilidade: organizar referências (Sol, Terra, Lua, planetas) e a lista
 * de objetos dentro do bottom sheet de navegação. Os planetas abrem em
 * acordeão inline (não em flyout lateral, que não cabe em telas estreitas).
 * Não decide ranking nem seleção global: repassa intenções por props.
 */

import { PlanetFlyout, ReferenceSection } from '../Controls/ReferenceControls';
import type { PlanetId } from '../Scene/planetConfig';
import type { NavigationContentProps } from './radarNavigationTypes';
import { RadarNavigationObjectList } from './RadarNavigationObjectList';

type Props = NavigationContentProps & {
    onFocusPlanet: (id: PlanetId) => void;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
};

export function RadarNavigationMobileContent({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    radarLoading,
    planetsOpen,
    onPlanetsOpenChange,
    onSelectObject,
    onFocusBody,
    onFocusSun,
    onFocusPlanet,
    bodyCardOpen,
}: Props) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-white/[0.07] px-3 py-2">
                <ReferenceSection
                    en={en}
                    orbitMode={orbitMode}
                    planetsOpen={planetsOpen}
                    onPlanetsOpenChange={onPlanetsOpenChange}
                    onFocusEarth={() => onFocusBody('earth')}
                    onFocusMoon={() => onFocusBody('moon')}
                    onFocusSun={onFocusSun}
                    compact
                    labelsAlwaysVisible
                />
                {planetsOpen && !orbitMode ? (
                    <div data-tutorial="planet-flyout" className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02]">
                        <PlanetFlyout
                            en={en}
                            focusedId={bodyCardOpen as PlanetId | null}
                            onFocus={onFocusPlanet}
                        />
                    </div>
                ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
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
        </div>
    );
}
