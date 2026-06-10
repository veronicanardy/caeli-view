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
import { useContext, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_FOV_DEG, CAMERA_VIEWS } from './cameraConstants';
import type { CameraViewKey } from './cameraConstants';
import type { FocusFraming } from './cameraFraming';
import { CameraTweenContext } from './CameraTweenContext';

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
    panelBiasX = 0,
    panelBiasY = 0,
    onUserInteraction,
}: {
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    focusNonce: number;
    earthPos: [number, number, number];
    /** Vetor unitário Terra→Sol. Usado para manter a view inicial de costas para o Sol. */
    sunDir: [number, number, number];
    /** Fração [0..1] da largura do canvas coberta pelo painel lateral. Desloca o foco para o centro da área útil. */
    panelBiasX?: number;
    /** Fração [0..1] da altura do canvas coberta pela UI inferior (bottom sheet). Empurra o foco para a área livre acima. */
    panelBiasY?: number;
    onUserInteraction?: () => void;
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

    // Vetores temporários reutilizados dentro do useFrame para evitar alocação a cada frame.
    // Criados uma única vez — nunca usar fora do useFrame, pois são mutados in-place.
    const _tmpTarget = useRef(new THREE.Vector3());
    const _tmpRight  = useRef(new THREE.Vector3());
    const _tmpUp     = useRef(new THREE.Vector3());

    // No primeiro frame os OrbitControls já existem: posiciona câmera e target
    // diretamente, sem tween, para que a cena apareça centrada na Terra desde o início.
    const initialised = useRef(false);

    // Tweens explícitos só disparam após o mount — mudanças de view, foco de objeto etc.
    const tweening = useRef(false);
    /* effectiveDesired é resolvido no momento em que o tween começa (no useFrame),
       quando camera.position já tem o valor real atual — não num useMemo obsoleto. */
    const effectiveDesired = useRef(desired);

    // Tween avulso — move câmera sem alterar focusTarget global.
    const adHocTweening = useRef(false);
    const adHocDesired = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        // Não sobrescreve um tween avulso em andamento — a câmera fica onde o usuário a deixou.
        if (adHocTweening.current) return;
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

    const onUserInteractionRef = useRef(onUserInteraction);
    useEffect(() => { onUserInteractionRef.current = onUserInteraction; }, [onUserInteraction]);

    const tweenCtxRef = useContext(CameraTweenContext);
    useEffect(() => {
        if (!tweenCtxRef) return;
        tweenCtxRef.current = (position, target) => {
            adHocDesired.current = { position: position.clone(), target: target.clone() };
            adHocTweening.current = true;
            tweening.current = false;
        };
    }, [tweenCtxRef]);

    // Interação do usuário cancela o tween imediatamente.
    useEffect(() => {
        if (!controls?.addEventListener) return undefined;
        const cancel = () => {
            if (tweening.current) onUserInteractionRef.current?.();
            tweening.current = false;
            adHocTweening.current = false;
        };
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

        // Tween avulso tem prioridade — não altera focusTarget global.
        if (adHocTweening.current && adHocDesired.current) {
            const ad = adHocDesired.current;
            fc.position.lerp(ad.position, 0.055);
            if (controls?.target) {
                controls.target.lerp(ad.target, 0.055);
                controls.update();
            }
            const posClose = fc.position.distanceToSquared(ad.position) < 1e-4;
            const tgtClose = !controls?.target || controls.target.distanceToSquared(ad.target) < 1e-4;
            if (posClose && tgtClose) adHocTweening.current = false;
            return;
        }

        if (!tweening.current) return;

        const ed = effectiveDesired.current;

        // Quando há painel lateral, desloca o target para a esquerda em world-space para que
        // o objeto fique centrado na área útil (à direita do painel), não na tela inteira.
        // biasNDC = fração do canvas coberta pelo painel → o centro útil está deslocado para
        // a direita em biasNDC/2 da tela. Compensamos movendo o target na direção -right da câmera.
        let desiredTarget = ed.target;
        if ((panelBiasX > 0.01 || panelBiasY > 0.01) && focusTarget) {
            const distance = fc.position.distanceTo(ed.target);
            const halfFovRad = THREE.MathUtils.degToRad(CAMERA_FOV_DEG / 2);
            // Reutiliza ref em vez de clonar — evita alocação de Vector3 a cada frame.
            desiredTarget = _tmpTarget.current.copy(ed.target);

            if (panelBiasX > 0.01) {
                // panelBiasX é a fração coberta pelo painel; o centro útil está deslocado para a direita
                // em panelBiasX/2 do total — então compensamos movendo o target para a esquerda.
                _tmpRight.current.setFromMatrixColumn(fc.matrixWorld, 0).normalize();
                const worldOffsetX = Math.tan(halfFovRad) * distance * panelBiasX * 0.5;
                desiredTarget.addScaledVector(_tmpRight.current, -worldOffsetX);
            }

            if (panelBiasY > 0.01) {
                // panelBiasY é a fração da altura coberta pela UI inferior (bottom sheet).
                // O FOV vertical é o ângulo real; compensamos movendo o target para cima.
                const aspectRatio = fc instanceof THREE.PerspectiveCamera ? (fc as THREE.PerspectiveCamera).aspect : 1;
                const halfFovVertRad = Math.atan(Math.tan(halfFovRad) / Math.max(0.01, aspectRatio));
                // 0.38 em vez de 0.5: empurra menos para cima, objeto fica mais naturalmente centralizado na área livre.
                _tmpUp.current.setFromMatrixColumn(fc.matrixWorld, 1).normalize();
                const worldOffsetY = Math.tan(halfFovVertRad) * distance * panelBiasY * 0.38;
                desiredTarget.addScaledVector(_tmpUp.current, -worldOffsetY);
            }
        }

        /* Lerp com ease-out suave: fator baixo para movimento fluido, desacelera naturalmente
           à medida que a distância ao destino diminui. */
        fc.position.lerp(ed.position, 0.055);
        if (controls?.target) {
            controls.target.lerp(desiredTarget, 0.055);
            controls.update();
        } else {
            fc.lookAt(desiredTarget);
        }

        const posClose = fc.position.distanceToSquared(ed.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(desiredTarget) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}
