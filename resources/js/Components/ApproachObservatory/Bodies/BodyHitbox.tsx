/**
 * Hitbox invisivel compartilhada pelos corpos do Approach Observatory.
 *
 * Responsabilidade: concentrar a area clicavel/hoveravel local dos corpos visuais,
 * garantindo `stopPropagation`, cursor pointer e limpeza do cursor ao desmontar.
 * O componente nao decide foco global, camera, selecao ou regra de exibicao.
 */

import { type ThreeEvent } from '@react-three/fiber';
import { useEffect } from 'react';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { BODY_HITBOX_MATERIAL } from './bodyRenderConstants';

interface BodyHitboxProps {
    radius: number;
    segments: [number, number];
    onClick: () => void;
    onHoverChange?: (hovered: boolean) => void;
}

export function BodyHitbox({
    radius,
    segments,
    onClick,
    onHoverChange,
}: BodyHitboxProps) {
    useEffect(() => {
        return () => {
            cursorPointerLeave();
            onHoverChange?.(false);
        };
    }, [onHoverChange]);

    const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHoverChange?.(true);
        cursorPointerEnter();
    };

    const handlePointerOut = () => {
        onHoverChange?.(false);
        cursorPointerLeave();
    };

    const handleClick = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onClick();
    };

    return (
        <mesh
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
            <sphereGeometry args={[radius, segments[0], segments[1]]} />
            <meshBasicMaterial
                transparent
                opacity={BODY_HITBOX_MATERIAL.opacity}
                depthWrite={BODY_HITBOX_MATERIAL.depthWrite}
            />
        </mesh>
    );
}
