/**
 * Responsabilidade: expor uma função imperativa de tween avulso para componentes
 * internos da cena que precisam mover a câmera sem alterar o focusTarget global.
 */

import { createContext, useContext } from 'react';
import * as THREE from 'three';

export type TweenTo = (position: THREE.Vector3, target: THREE.Vector3) => void;

export const CameraTweenContext = createContext<React.MutableRefObject<TweenTo> | null>(null);

export function useCameraTween(): TweenTo {
    const ref = useContext(CameraTweenContext);
    return (position, target) => ref?.current(position, target);
}
