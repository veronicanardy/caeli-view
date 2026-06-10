/**
 * Camada de asteroides da cena radar.
 *
 * Responsabilidade: preparar posições atuais e estados derivados de trajetória
 * para os marcadores visuais, mantendo os corpos de `Bodies/Asteroid` focados
 * apenas em renderização, hover, seleção e rótulos.
 */

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/radar/palette';
import { currentPositionInScene } from '@/lib/radar/trajectorySampling';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { NowTrajectory } from '../Trajectory/NowTrajectory';
import { framingForBody } from './cameraFraming';
import type { FocusFraming } from './cameraFraming';
import type { SceneVector } from './scenePositions';

/**
 * Asteroides e trajetórias log-comprimidas, offsetadas pela Terra na cena.
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
    showLabels,
    showLabelForObject,
    onFocusTrajectoryPoint,
}: {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    hasSelection: boolean;
    earthPos: SceneVector;
    onSelect: (approach: UnifiedApproach) => void;
    showLabels: boolean;
    showLabelForObject: (id: string) => boolean;
    onFocusTrajectoryPoint?: (framing: FocusFraming) => void;
}) {
    const handleFocusPoint = useCallback((vec: THREE.Vector3) => {
        if (!onFocusTrajectoryPoint) return;
        const abs = new THREE.Vector3(earthPos[0] + vec.x, earthPos[1] + vec.y, earthPos[2] + vec.z);
        const framing = framingForBody(abs, 0.05, undefined, 60);
        onFocusTrajectoryPoint({ ...framing, transition: 'preserve_heading' });
    }, [earthPos, onFocusTrajectoryPoint]);

    const renderableAsteroids = useMemo(() => {
        return closestNowObjects
            .map((object) => {
                const position = currentPositionInScene(object);
                if (!position) return null;
                return { object, position };
            })
            .filter((entry): entry is { object: ClosestNowObject; position: SceneVector } => entry !== null);
    }, [closestNowObjects]);

    return (
        <group position={earthPos}>
            {renderableAsteroids.map(({ object, position }, index) => (
                <AsteroidMarker
                    key={object.approach.id}
                    object={object}
                    position={position}
                    isSelected={object.approach.id === selectedId}
                    dimmed={hasSelection && object.approach.id !== selectedId}
                    onSelect={onSelect}
                    showLabel={showLabelForObject(object.approach.id)}
                    protectLabelFromFocus={object.approach.id !== selectedId}
                    paletteColor={OBJECT_PALETTE[index % OBJECT_PALETTE.length].future}
                    showLabels={showLabels}
                />
            ))}

            {showLabels && closestNowObjects
                .map((object, index) => ({ object, palette: OBJECT_PALETTE[index % OBJECT_PALETTE.length] }))
                .filter(({ object }) => object.trajectory && object.trajectory.status === 'available' && object.approach.id === selectedId)
                .map(({ object, palette }) => {
                    const activeTrajectory = object.approach.id === selectedId;
                    return (
                        <NowTrajectory
                            key={`traj-${object.approach.id}`}
                            trajectory={object.trajectory as AsteroidTrajectory}
                            palette={palette}
                            emphasized={activeTrajectory}
                            dimmed={hasSelection && !activeTrajectory}
                            onFocusPoint={activeTrajectory ? handleFocusPoint : undefined}
                        />
                    );
                })}
        </group>
    );
}
