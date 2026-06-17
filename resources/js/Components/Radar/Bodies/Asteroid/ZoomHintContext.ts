/**
 * Responsabilidade: ponte entre o tracker de zoom (dentro do Canvas R3F) e o overlay
 * de botão (fora do Canvas), evitando que elementos SVG/HTML sejam interceptados pelo
 * reconciliador do fiber como objetos THREE.
 */

import { createContext, useContext } from 'react';

export type ZoomHintState = {
    visible: boolean;
    x: number;
    y: number;
    onZoomOut: () => void;
};

export type ZoomHintContextValue = {
    state: ZoomHintState | null;
    setState: (s: ZoomHintState | null) => void;
};

export const ZoomHintContext = createContext<ZoomHintContextValue>({
    state: null,
    setState: () => {},
});

export function useZoomHintSetter() {
    return useContext(ZoomHintContext).setState;
}

export function useZoomHintState() {
    return useContext(ZoomHintContext).state;
}
