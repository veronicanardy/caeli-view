/**
 * Suspensão do backdrop-filter dos labels durante o movimento da câmera.
 *
 * Responsabilidade: detectar quando a câmera está em movimento (rotação, zoom,
 * pan ou tween) e alternar a classe CSS `radar-camera-moving` no host dos
 * labels da cena. A regra correspondente em app.css desliga o backdrop-filter
 * enquanto a classe está ativa.
 *
 * Motivação (diagnóstico via PerfProbe): compor o blur de dezenas de labels
 * que se reposicionam todo frame custa vários ms por frame no thread de
 * composição. Em movimento o blur é visualmente imperceptível, pois todo o
 * fundo está deslizando; parado, ele retorna em ~250ms. A classe é alternada
 * imperativamente no DOM, sem re-renders React, apenas nas transições
 * movimento↔parado.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { findLabelPortalHost } from '../Overlays/SceneLabels';

/** Tempo parado, em ms, antes de restaurar o blur. Cobre o decaimento do damping/inércia. */
const STILL_DELAY_MS = 250;
/** Deslocamento quadrático mínimo da câmera (unidades de cena) para considerar movimento. */
const MOVE_EPSILON_SQ = 1e-10;
/** Desvio mínimo do produto escalar dos quaternions para considerar rotação. */
const ROTATE_EPSILON = 1e-8;

export const CAMERA_MOVING_CLASS = 'radar-camera-moving';

export function LabelBackdropGate() {
    const gl = useThree((s) => s.gl);
    const camera = useThree((s) => s.camera);

    const prevPos = useRef(new THREE.Vector3());
    const prevQuat = useRef(new THREE.Quaternion());
    const stillSince = useRef(0);
    const moving = useRef(false);
    const hostRef = useRef<HTMLElement | null>(null);

    // O host dos portais pode montar depois deste componente; re-resolve quando necessário.
    const host = (): HTMLElement | null => {
        if (!hostRef.current || !hostRef.current.isConnected) {
            hostRef.current = findLabelPortalHost(gl.domElement);
        }
        return hostRef.current;
    };

    useEffect(() => () => {
        hostRef.current?.classList.remove(CAMERA_MOVING_CLASS);
    }, []);

    useFrame(() => {
        const movedPos = camera.position.distanceToSquared(prevPos.current) > MOVE_EPSILON_SQ;
        const movedRot = Math.abs(1 - Math.abs(camera.quaternion.dot(prevQuat.current))) > ROTATE_EPSILON;
        prevPos.current.copy(camera.position);
        prevQuat.current.copy(camera.quaternion);

        const now = performance.now();
        if (movedPos || movedRot) {
            stillSince.current = now;
            if (!moving.current) {
                moving.current = true;
                host()?.classList.add(CAMERA_MOVING_CLASS);
            }
        } else if (moving.current && now - stillSince.current >= STILL_DELAY_MS) {
            moving.current = false;
            host()?.classList.remove(CAMERA_MOVING_CLASS);
        }
    });

    return null;
}
