import { useEffect, useRef, useState } from 'react';
import type { ClosestNowObject } from '@/types';
import { computeFocusFraming, type FocusFraming } from './CameraRig';

export function useSelectionFocusFraming(
    focusedObject: ClosestNowObject | null,
    selectionFocusNonce: number,
    orbitMode: boolean,
    earthHelioPositionAU: { x: number; y: number; z: number } | null,
    earthScenePosition: [number, number, number] | null,
): FocusFraming | null {
    const [framing, setFraming] = useState<FocusFraming | null>(null);
    const latestEarthHelio = useRef(earthHelioPositionAU);
    const latestEarthScene = useRef(earthScenePosition);

    useEffect(() => { latestEarthHelio.current = earthHelioPositionAU; }, [earthHelioPositionAU]);
    useEffect(() => { latestEarthScene.current = earthScenePosition; }, [earthScenePosition]);

    useEffect(() => {
        if (!focusedObject) {
            setFraming(null);
            return;
        }
        setFraming(computeFocusFraming(
            focusedObject,
            orbitMode,
            latestEarthHelio.current,
            latestEarthScene.current ?? [0, 0, 0],
        ));
        // refs intentionally read outside dependencies.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedObject?.approach.id, selectionFocusNonce, orbitMode]);

    return framing;
}
