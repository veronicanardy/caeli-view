/**
 * Rig de câmera da cena 3D.
 *
 * Responsabilidade: executar intenções explícitas de câmera, interpolando entre
 * presets e focos calculados por helpers puros. Não decide seleção, ranking nem
 * dados científicos; apenas move câmera e alvo dos controles.
 *
 * É a fonte de verdade para posição e target da câmera. Qualquer setup inicial
 * ou reset deve acontecer aqui — não no prop camera= do Canvas nem em useEffects
 * externos, pois só aqui os OrbitControls já existem e podem ser atualizados.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_VIEWS } from './cameraConstants';
import type { CameraViewKey } from './cameraConstants';
import type { FocusFraming } from './cameraFraming';

type Controls = {
    target: THREE.Vector3;
    update: () => void;
    addEventListener: (t: string, fn: () => void) => void;
    removeEventListener: (t: string, fn: () => void) => void;
};

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
    const camera = useThree((s) => s.camera);
    const controls = useThree((s) => s.controls) as unknown as Controls | null;

    // earthPos é lido via ref para não disparar tween a cada atualização de efeméride (10s).
    const earthPosRef = useRef(earthPos);
    useEffect(() => { earthPosRef.current = earthPos; }, [earthPos]);

    // Views predefinidas são offsets relativos à Terra: somamos earthPos para que
    // Reset/Superior/Lateral continuem centrados na Terra em qualquer posição orbital.
    const desired = useMemo(() => {
        if (focusTarget) return { position: focusTarget.position.clone(), target: focusTarget.target.clone() };
        const earth = new THREE.Vector3(...earthPosRef.current);
        return { position: earth.clone().add(CAMERA_VIEWS[view]), target: earth };
        // earthPos é lido via ref: intencionalmente fora das dependências para não reiniciar tweens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, focusTarget, focusNonce]);

    const effectiveDesired = useMemo(() => {
        if (!focusTarget || focusTarget.transition !== 'preserve_heading') {
            return desired;
        }
        const currentTarget = controls?.target?.clone() ?? new THREE.Vector3(0, 0, 0);
        const currentOffset = camera.position.clone().sub(currentTarget);
        if (currentOffset.lengthSq() < 1e-8) return desired;
        const desiredDistance = focusTarget.position.distanceTo(focusTarget.target);
        const preservedOffset = currentOffset.normalize().multiplyScalar(desiredDistance);
        return {
            position: focusTarget.target.clone().add(preservedOffset),
            target: focusTarget.target.clone(),
        };
    }, [camera.position, controls, desired, focusTarget]);

    // No primeiro frame os OrbitControls já existem: posiciona câmera e target
    // diretamente, sem tween, para que a cena apareça centrada na Terra desde o início.
    const initialised = useRef(false);

    // Tweens explícitos só disparam após o mount — mudanças de view, foco de objeto etc.
    const tweening = useRef(false);
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        tweening.current = true;
    }, [effectiveDesired]);

    // Interação do usuário cancela o tween imediatamente.
    useEffect(() => {
        if (!controls?.addEventListener) return undefined;
        const cancel = () => { tweening.current = false; };
        controls.addEventListener('start', cancel);
        return () => controls.removeEventListener('start', cancel);
    }, [controls]);

    useFrame(({ camera: fc }) => {
        // Setup inicial: roda uma única vez no primeiro frame em que os controls existem.
        if (!initialised.current) {
            if (!controls?.target) return;
            initialised.current = true;
            const earth = new THREE.Vector3(...earthPosRef.current);
            fc.position.copy(earth).add(CAMERA_VIEWS[view]);
            controls.target.copy(earth);
            controls.update();
            return;
        }

        if (!tweening.current) return;

        fc.position.lerp(effectiveDesired.position, 0.1);
        if (controls?.target) {
            controls.target.lerp(effectiveDesired.target, 0.1);
            controls.update();
        } else {
            fc.lookAt(effectiveDesired.target);
        }

        const posClose = fc.position.distanceToSquared(effectiveDesired.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(effectiveDesired.target) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}
