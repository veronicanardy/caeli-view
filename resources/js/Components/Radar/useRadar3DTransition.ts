/**
 * Hook de transição visual da cena 3D do radar.
 *
 * Responsabilidade: controlar o overlay curto que mascara reenquadramentos
 * abruptos de câmera (radar ↔ orbital). Garante que a mudança de modo não
 * seja percebida como salto visual pelo usuário.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const SCENE_TRANSITION_MS = 420;

/**
 * Controla o overlay curto usado para mascarar reenquadramentos de câmera.
 */
export function useRadar3DTransition() {
    const [sceneTransitioning, setSceneTransitioning] = useState(false);
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerTransition = useCallback((fn: () => void) => {
        if (transitionTimerRef.current !== null) {
            clearTimeout(transitionTimerRef.current);
        }

        setSceneTransitioning(true);
        fn();

        transitionTimerRef.current = setTimeout(() => {
            setSceneTransitioning(false);
            transitionTimerRef.current = null;
        }, SCENE_TRANSITION_MS);
    }, []);

    useEffect(() => {
        return () => {
            if (transitionTimerRef.current !== null) clearTimeout(transitionTimerRef.current);
        };
    }, []);

    return { sceneTransitioning, triggerTransition };
}
