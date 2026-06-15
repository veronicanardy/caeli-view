/**
 * Hook de enquadramento para seleção atual.
 *
 * Responsabilidade: recalcular o foco da câmera apenas quando a seleção, o nonce
 * ou o modo orbital mudam, evitando tremores a cada tick de efeméride.
 */

import { useEffect, useRef, useState } from 'react';
import type { ClosestNowObject } from '@/types';
import { computeFocusFraming } from './cameraFraming';
import type { FocusFraming } from './cameraFraming';
import { isKnownAsteroidId } from '../Bodies/Asteroid/knownAsteroids';

/**
 * Deriva o enquadramento de câmera da seleção atual sem reagir a cada tick de efeméride.
 */
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
        // Conhecidos (régua dos planetas) não têm posição geocêntrica: seu enquadramento é o
        // knownFocusTarget (voo heliocêntrico), tratado à parte no RadarSceneCanvas. Aqui retornamos
        // null para não competir com ele.
        if (isKnownAsteroidId(focusedObject.approach.id)) {
            setFraming(null);
            return;
        }
        setFraming(computeFocusFraming(
            focusedObject,
            orbitMode,
            latestEarthHelio.current,
            latestEarthScene.current ?? [0, 0, 0],
        ));
        // refs lidas intencionalmente fora das dependências.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedObject?.approach.id, selectionFocusNonce, orbitMode]);

    return framing;
}
