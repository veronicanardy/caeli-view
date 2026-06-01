import type { AsteroidTrajectory, ClosestNowObject, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { NowTrajectory } from '../Trajectory/NowTrajectory';
import type { SceneVector } from './scenePositions';

/**
 * Asteroides e trajetórias geocêntricas log-comprimidas, offsetadas pela Terra.
 */
export function AsteroidSceneLayer({
    closestNowObjects,
    selectedId,
    hasSelection,
    earthPos,
    onSelect,
    locale,
    showLabels,
    showLabelForObject,
}: {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    hasSelection: boolean;
    earthPos: SceneVector;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    showLabels: boolean;
    showLabelForObject: (id: string) => boolean;
}) {
    return (
        <group position={earthPos}>
            {closestNowObjects.map((object) => (
                <AsteroidMarker
                    key={object.approach.id}
                    object={object}
                    isSelected={object.approach.id === selectedId}
                    dimmed={hasSelection && object.approach.id !== selectedId}
                    onSelect={onSelect}
                    showLabel={showLabelForObject(object.approach.id)}
                    protectLabelFromFocus={object.approach.id !== selectedId}
                    locale={locale}
                />
            ))}

            {showLabels && closestNowObjects
                .map((object, index) => ({ object, palette: OBJECT_PALETTE[index % OBJECT_PALETTE.length] }))
                .filter(({ object }) => object.trajectory && object.trajectory.status === 'available')
                .map(({ object, palette }) => {
                    const activeTrajectory = object.approach.id === selectedId;
                    return (
                        <NowTrajectory
                            key={`traj-${object.approach.id}`}
                            trajectory={object.trajectory as AsteroidTrajectory}
                            palette={palette}
                            emphasized={activeTrajectory}
                            dimmed={hasSelection && !activeTrajectory}
                            locale={locale}
                        />
                    );
                })}
        </group>
    );
}
