import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_VIEWS } from './cameraConstants';
import type { CameraViewKey } from './cameraConstants';
import type { FocusFraming } from './cameraFraming';

/**
 * Transição controlada da câmera entre visões predefinidas e focos explícitos da cena.
 */
export function CameraRig({
    view,
    viewNonce,
    focusTarget,
    focusNonce,
    earthPos,
}: {
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    focusNonce: number;
    earthPos: [number, number, number];
}) {
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; addEventListener: (t: string, fn: () => void) => void; removeEventListener: (t: string, fn: () => void) => void }
        | null;

    // earthPos é lido via ref para não disparar tween a cada atualização de efeméride (10s).
    const earthPosRef = useRef(earthPos);
    useEffect(() => { earthPosRef.current = earthPos; }, [earthPos]);

    // Posição e alvo desejados da câmera para a transição atual.
    // Views predefinidas são offsets relativos à Terra: somamos earthPos para que Reset/Superior/Lateral
    // continuem centrados na Terra independente de onde ela esteja na órbita heliocêntrica.
    const desired = useMemo(() => {
        if (focusTarget) return { position: focusTarget.position.clone(), target: focusTarget.target.clone() };
        const earth = new THREE.Vector3(...earthPosRef.current);
        return { position: earth.clone().add(CAMERA_VIEWS[view]), target: earth };
        // earthPos é lido via ref: intencionalmente fora das dependências para não reiniciar tweens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, focusTarget, focusNonce]);

    const tweening = useRef(false);
    useEffect(() => {
        tweening.current = true;
    }, [desired]);

    // Qualquer interação do usuário cancela o tween imediatamente e devolve o controle.
    useEffect(() => {
        if (!controls?.addEventListener) return undefined;
        const cancel = () => { tweening.current = false; };
        controls.addEventListener('start', cancel);
        return () => controls.removeEventListener('start', cancel);
    }, [controls]);

    useFrame(({ camera }) => {
        if (!tweening.current) return;

        camera.position.lerp(desired.position, 0.1);
        if (controls?.target) {
            controls.target.lerp(desired.target, 0.1);
            controls.update();
        } else {
            camera.lookAt(desired.target);
        }

        // Chegou perto o suficiente: para de conduzir e libera a câmera para o usuário.
        const posClose = camera.position.distanceToSquared(desired.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(desired.target) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}
