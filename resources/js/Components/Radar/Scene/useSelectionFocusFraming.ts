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

/**
 * Deriva o enquadramento de câmera da seleção atual sem reagir a cada tick de efeméride.
 */
export function useSelectionFocusFraming(
    focusedObject: ClosestNowObject | null,
    selectionFocusNonce: number,
    orbitMode: boolean,
    earthHelioPositionAU: { x: number; y: number; z: number } | null,
): FocusFraming | null {
    const [framing, setFraming] = useState<FocusFraming | null>(null);
    const latestEarthHelio = useRef(earthHelioPositionAU);

    useEffect(() => { latestEarthHelio.current = earthHelioPositionAU; }, [earthHelioPositionAU]);

    useEffect(() => {
        if (!focusedObject) {
            setFraming(null);
            return;
        }
        // Conhecidos (régua dos planetas) têm enquadramento próprio (knownFocusTarget, voo
        // heliocêntrico) tratado à parte no RadarSceneCanvas; aqui os NEOs do feed e os conhecidos
        // compartilham a mesma régua heliocêntrica, então computeFocusFraming serve a ambos.
        setFraming(computeFocusFraming(
            focusedObject,
            orbitMode,
            latestEarthHelio.current,
        ));
        // ref lida intencionalmente fora das dependências.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedObject?.approach.id, selectionFocusNonce, orbitMode]);

    return framing;
}
