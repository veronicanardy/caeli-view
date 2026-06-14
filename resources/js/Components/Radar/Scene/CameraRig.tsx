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
 *
 * Compensação de painéis (biasX/biasY): aplicada via `setViewOffset` (projeção),
 * nunca deslocando o alvo dos OrbitControls. Assim o objeto focado permanece o
 * centro real de rotação e zoom: girar a cena com um card aberto mantém a rocha
 * fixa na área visível, em vez de orbitar um ponto vazio e fugir da tela.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useContext, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_VIEWS } from './cameraConstants';
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
    /** Fração [0..1] da largura do canvas coberta pelo trilho esquerdo. Desloca a projeção para a área útil. */
    panelBiasX?: number;
    /** Fração [0..1] da altura do canvas coberta pela UI inferior (bottom sheet). Sobe a projeção para a área livre. */
    panelBiasY?: number;
    onUserInteraction?: () => void;
}) {
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
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

    // Deslocamento de projeção atual (px), interpolado por frame para a
    // compensação de painéis entrar e sair com suavidade.
    const viewOffset = useRef({ x: 0, y: 0 });

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
        // Compensação de painéis na projeção: o centro visual desloca para a área
        // livre (direita do trilho no desktop, acima do sheet no mobile) sem mexer
        // no alvo dos OrbitControls. Interpolada para transições suaves.
        // Fatores: 0.5 centralizaria exatamente na área livre; 0.25 (desktop) evita
        // empurrar demais para a direita, 0.45 (mobile) deixa o objeto quase no
        // centro do espaço acima do sheet.
        if (fc instanceof THREE.PerspectiveCamera) {
            const targetX = panelBiasX > 0.01 ? -panelBiasX * size.width * 0.25 : 0;
            const targetY = panelBiasY > 0.01 ? panelBiasY * size.height * 0.45 : 0;
            const current = viewOffset.current;
            current.x += (targetX - current.x) * 0.08;
            current.y += (targetY - current.y) * 0.08;
            const settledAtZero = targetX === 0 && targetY === 0 && Math.abs(current.x) < 0.5 && Math.abs(current.y) < 0.5;
            if (settledAtZero) {
                if (fc.view?.enabled) {
                    fc.clearViewOffset();
                    current.x = 0;
                    current.y = 0;
                }
            } else {
                fc.setViewOffset(size.width, size.height, current.x, current.y, size.width, size.height);
            }
        }

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

        /* Lerp com ease-out suave: fator baixo para movimento fluido, desacelera naturalmente
           à medida que a distância ao destino diminui. O alvo é sempre o objeto real:
           a compensação de painéis acontece na projeção (acima), não aqui. */
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
