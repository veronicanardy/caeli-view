import { useMemo } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import {
    closestApproachNearPosition,
    currentPositionInScene,
} from '@/lib/observatory/trajectorySampling';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { NowTrajectory } from '../Trajectory/NowTrajectory';
import type { SceneVector } from './scenePositions';

/**
 * Asteroides e trajetórias geocêntricas log-comprimidas, offsetadas pela Terra.
 *
 * Esta camada prepara posição atual e estados derivados de trajetória antes de
 * enviar os dados para `Bodies/Asteroid`, mantendo os corpos apenas renderizando.
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
    const renderableAsteroids = useMemo(
        () => closestNowObjects
            .map((object) => {
                const position = currentPositionInScene(object);
                if (!position) return null;

                return {
                    object,
                    position,
                    nearbyClosestApproach: Boolean(closestApproachNearPosition(
                        object.trajectory,
                        new THREE.Vector3(...position),
                    )),
                };
            })
            .filter((entry): entry is {
                object: ClosestNowObject;
                position: SceneVector;
                nearbyClosestApproach: boolean;
            } => entry !== null),
        [closestNowObjects],
    );

    return (
        <group position={earthPos}>
            {renderableAsteroids.map(({ object, position, nearbyClosestApproach }) => (
                <AsteroidMarker
                    key={object.approach.id}
                    object={object}
                    position={position}
                    nearbyClosestApproach={nearbyClosestApproach}
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
