/**
 * Gestos touch na cena 3D do radar.
 *
 * Responsabilidade: interceptar toques diretamente no domElement do renderer e
 * converter em rotação (1 dedo) e zoom por pinça (2 dedos), sem interferir com
 * os tweens do CameraRig nem com a seleção por tap curto.
 *
 * Estratégia:
 *   - Tap curto (movimento < TAP_THRESHOLD px) → deixa o pointer event borbulhar
 *     normalmente para que o R3F processe onClick nos hitboxes dos objetos.
 *   - Drag (1 dedo) → cancela o tween do CameraRig (via controls 'start') e
 *     delega ao OrbitControls que já sabe rotacionar em touch.
 *   - Pinça (2 dedos) → cancela tween e aplica dolly exponencial idêntico ao
 *     InertialZoom para consistência de sensação.
 *
 * Por que rodar dentro do Canvas (R3F):
 *   - Acesso direto ao gl.domElement (sem prop drilling).
 *   - Acesso a camera e controls via useThree.
 *   - useFrame para animação sem re-render React.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Pixels de movimento necessários para considerar drag em vez de tap. */
const TAP_THRESHOLD = 8;

/** Sensibilidade da pinça: equivalente ao fator de wheel do InertialZoom. */
const PINCH_SENSITIVITY = 0.008;

/** Decaimento inercial do zoom por pinça (mesmo valor que InertialZoom). */
const PINCH_DECAY = 0.82;

type Controls = {
    target: THREE.Vector3;
    update: () => void;
    dispatchEvent?: (e: { type: string }) => void;
};

export function TouchGestures({ minDistance, maxDistance }: { minDistance: number; maxDistance: number }) {
    const { camera, gl } = useThree();
    const controls = useThree((s) => s.controls) as unknown as Controls | null;

    // Velocidade de zoom inercial acumulada pela pinça.
    const pinchVelocity = useRef(0);
    // Distância entre os dois dedos no frame anterior da pinça.
    const lastPinchDist = useRef(0);
    // Quantos pontos de toque estão ativos.
    const touchCount = useRef(0);
    // Rastreamento do touch primário para distinguir tap de drag.
    const primaryStart = useRef<{ x: number; y: number } | null>(null);
    // Flag: o gesto atual já foi classificado como drag (não como tap).
    const isDragging = useRef(false);

    useEffect(() => {
        const el = gl.domElement;

        const onTouchStart = (e: TouchEvent) => {
            touchCount.current = e.touches.length;
            isDragging.current = false;

            if (e.touches.length === 1) {
                primaryStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }

            if (e.touches.length === 2) {
                primaryStart.current = null;
                lastPinchDist.current = getPinchDist(e);
                // Cancela tween imediatamente ao iniciar pinça.
                controls?.dispatchEvent?.({ type: 'start' });
                // Previne scroll de página durante pinça.
                e.preventDefault();
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            touchCount.current = e.touches.length;

            if (e.touches.length === 1 && primaryStart.current) {
                const dx = e.touches[0].clientX - primaryStart.current.x;
                const dy = e.touches[0].clientY - primaryStart.current.y;
                const moved = Math.sqrt(dx * dx + dy * dy);

                if (!isDragging.current && moved > TAP_THRESHOLD) {
                    isDragging.current = true;
                    // Primeiro movimento real: cancela tween para não lutar contra o OrbitControls.
                    controls?.dispatchEvent?.({ type: 'start' });
                }

                if (isDragging.current) {
                    // O OrbitControls do R3F já processa pointer events nativos em touch.
                    // Só precisamos garantir que o scroll da página não aconteça.
                    e.preventDefault();
                }
            }

            if (e.touches.length === 2) {
                const dist = getPinchDist(e);
                const delta = lastPinchDist.current - dist; // positivo = dedos se afastando = zoom out
                lastPinchDist.current = dist;

                if (Math.abs(delta) > 0.5) {
                    pinchVelocity.current += delta * PINCH_SENSITIVITY;
                }
                e.preventDefault();
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            touchCount.current = e.touches.length;
            if (e.touches.length < 2) {
                lastPinchDist.current = 0;
            }
            if (e.touches.length === 0) {
                primaryStart.current = null;
                isDragging.current = false;
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        el.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [gl, controls]);

    // Aplica o zoom inercial da pinça a cada frame, idêntico ao InertialZoom de roda.
    useFrame(() => {
        if (Math.abs(pinchVelocity.current) < 1e-4) {
            pinchVelocity.current = 0;
            return;
        }

        const target = controls?.target ?? new THREE.Vector3();
        const toTarget = camera.position.clone().sub(target);
        const dist = toTarget.length();
        const newDist = THREE.MathUtils.clamp(
            dist * Math.exp(pinchVelocity.current),
            minDistance,
            maxDistance,
        );
        if (dist > 1e-6) {
            camera.position.copy(target).add(toTarget.multiplyScalar(newDist / dist));
        }
        controls?.update();

        pinchVelocity.current *= PINCH_DECAY;
    });

    return null;
}

function getPinchDist(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
