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

/* Distância radial e elevação usadas pela view "perspective" em coordenadas solares. */
const PERSPECTIVE_DISTANCE = 15.0;
const PERSPECTIVE_ELEVATION = 5.5;

export function CameraRig({
    view,
    viewNonce,
    focusTarget,
    focusNonce,
    earthPos,
    sunDir,
}: {
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    focusNonce: number;
    earthPos: [number, number, number];
    /** Vetor unitário Terra→Sol. Usado para manter a view inicial de costas para o Sol. */
    sunDir: [number, number, number];
}) {
    const camera = useThree((s) => s.camera);
    const controls = useThree((s) => s.controls) as unknown as Controls | null;

    // earthPos e sunDir são lidos via ref para não disparar tween a cada atualização de efeméride (10s).
    const earthPosRef = useRef(earthPos);
    useEffect(() => { earthPosRef.current = earthPos; }, [earthPos]);
    const sunDirRef = useRef(sunDir);
    useEffect(() => { sunDirRef.current = sunDir; }, [sunDir]);

    /* Calcula o offset da view perspective em coordenadas solares:
       câmera fica na direção oposta ao Sol (Sol→Terra), com elevação fixa no Y. */
    const perspectiveOffset = () => {
        /* Câmera fica do lado do Sol em relação à Terra — olha para a Terra com o espaço escuro atrás. */
        const towardsSun = new THREE.Vector3(sunDirRef.current[0], 0, sunDirRef.current[2]).normalize();
        return towardsSun.multiplyScalar(PERSPECTIVE_DISTANCE).setY(PERSPECTIVE_ELEVATION);
    };

    // Views predefinidas são offsets relativos à Terra: somamos earthPos para que
    // Reset/Superior/Lateral continuem centrados na Terra em qualquer posição orbital.
    const desired = useMemo(() => {
        if (focusTarget) return { position: focusTarget.position.clone(), target: focusTarget.target.clone() };
        const earth = new THREE.Vector3(...earthPosRef.current);
        const offset = view === 'perspective' ? perspectiveOffset() : CAMERA_VIEWS[view].clone();
        return { position: earth.clone().add(offset), target: earth };
        // earthPos e sunDir são lidos via ref: intencionalmente fora das dependências para não reiniciar tweens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, focusTarget, focusNonce]);

    // No primeiro frame os OrbitControls já existem: posiciona câmera e target
    // diretamente, sem tween, para que a cena apareça centrada na Terra desde o início.
    const initialised = useRef(false);

    // Tweens explícitos só disparam após o mount — mudanças de view, foco de objeto etc.
    const tweening = useRef(false);
    /* effectiveDesired é resolvido no momento em que o tween começa (no useFrame),
       quando camera.position já tem o valor real atual — não num useMemo obsoleto. */
    const effectiveDesired = useRef(desired);
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        tweening.current = true;
        /* Resolve o desired no momento da mudança, preservando o ângulo atual da câmera
           sem forçar virada — o usuário chega ao asteroide pelo heading que já tem. */
        if (focusTarget?.transition === 'preserve_heading' && controls?.target) {
            const currentOffset = camera.position.clone().sub(controls.target);
            if (currentOffset.lengthSq() > 1e-8) {
                const desiredDistance = focusTarget.position.distanceTo(focusTarget.target);
                const offsetDir = currentOffset.normalize();
                effectiveDesired.current = {
                    position: focusTarget.target.clone().add(offsetDir.multiplyScalar(desiredDistance)),
                    target: focusTarget.target.clone(),
                };
                return;
            }
        }
        effectiveDesired.current = desired;
    }, [desired]);

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
            const initOffset = view === 'perspective' ? perspectiveOffset() : CAMERA_VIEWS[view].clone();
            fc.position.copy(earth).add(initOffset);
            controls.target.copy(earth);
            controls.update();
            return;
        }

        if (!tweening.current) return;

        const ed = effectiveDesired.current;
        /* Lerp com ease-out suave: fator baixo para movimento fluido, desacelera naturalmente
           à medida que a distância ao destino diminui. */
        fc.position.lerp(ed.position, 0.055);
        if (controls?.target) {
            controls.target.lerp(ed.target, 0.055);
            controls.update();
        } else {
            fc.lookAt(ed.target);
        }

        const posClose = fc.position.distanceToSquared(ed.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(ed.target) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}
