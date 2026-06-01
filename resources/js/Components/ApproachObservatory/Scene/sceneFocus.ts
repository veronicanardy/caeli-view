import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { currentPositionInScene } from '@/lib/observatory/trajectorySampling';
import type { LabelOccluder } from '../Overlays/SceneLabels';
import type { FocusFraming } from './cameraFraming';
import type { SceneVector } from './scenePositions';

/**
 * Regras locais de foco visual, labels e oclusão dentro da cena 3D.
 */
export type BodyFocus = { body: 'earth' | 'moon'; framing: FocusFraming; nonce: number };

export function shouldShowLabelForObject({
    id,
    selectedId,
    showLabels,
    orbitLabelsOnly,
    hideAsteroidLabels,
}: {
    id: string;
    selectedId: string | null;
    showLabels: boolean;
    orbitLabelsOnly: boolean;
    hideAsteroidLabels: boolean;
}) {
    if (!showLabels) return false;
    if (id === selectedId) return !orbitLabelsOnly;
    if (hideAsteroidLabels) return false;
    return !orbitLabelsOnly;
}

export function focusedObjectScenePosition(focusedObject: ClosestNowObject | null, earthPos: SceneVector): SceneVector | null {
    const focusedObjectGeoPos = focusedObject ? currentPositionInScene(focusedObject) : null;
    return focusedObjectGeoPos
        ? [earthPos[0] + focusedObjectGeoPos[0], earthPos[1] + focusedObjectGeoPos[1], earthPos[2] + focusedObjectGeoPos[2]]
        : null;
}

export function computeLabelOccluder({
    bodyFocus,
    earthPos,
    moonPos,
    focusedObjectPosition,
}: {
    bodyFocus: BodyFocus | null;
    earthPos: SceneVector;
    moonPos: SceneVector;
    focusedObjectPosition: SceneVector | null;
}): LabelOccluder {
    if (bodyFocus?.body === 'earth') {
        return { center: new THREE.Vector3(...earthPos), radius: EARTH_RADIUS_DL * 1.35 };
    }

    if (bodyFocus?.body === 'moon') {
        return { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL * 1.9 };
    }

    return focusedObjectPosition
        ? { center: new THREE.Vector3(...focusedObjectPosition), radius: 0.18 }
        : null;
}

export function shouldUseHelioScene(orbitMode: boolean, selectedHasOrbit: boolean, focusedObject: ClosestNowObject | null) {
    const focusedElements = focusedObject?.trajectory?.orbitalElements ?? null;
    return orbitMode && selectedHasOrbit && Boolean(focusedElements && Number.isFinite(focusedElements.tpJd) && focusedElements.tpJd !== 0);
}
