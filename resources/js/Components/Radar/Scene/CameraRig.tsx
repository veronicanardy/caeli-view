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
    enabled: boolean;
    update: () => void;
    addEventListener: (t: string, fn: () => void) => void;
    removeEventListener: (t: string, fn: () => void) => void;
};

/* Distância radial e elevação usadas pela view "perspective" em coordenadas solares. */
const PERSPECTIVE_DISTANCE = 15.0;
const PERSPECTIVE_ELEVATION = 5.5;

/* Duração FIXA do voo de câmera, em segundos. O voo interpola de origem→destino por um parâmetro de
   tempo (não por fração fixa por frame): com isso ele TERMINA no destino exato em ~TWEEN_DURATION_S,
   sem a cauda assintótica do lerp antigo (que arrastava o trecho final e só devolvia o controle muito
   depois). Mesma duração para voo curto e longo (previsível). Usa o delta de tempo real, então o ritmo
   é estável em qualquer FPS. */
const TWEEN_DURATION_S = 1.7;

/* Ease-out cúbico: arranca firme e desacelera suave na chegada (aterrissagem macia, sem freada seca).
   easeOutCubic(0)=0, easeOutCubic(1)=1, derivada → 0 no fim. */
function easeOutCubic(t: number): number {
    const u = 1 - t;
    return 1 - u * u * u;
}

export function CameraRig({
    view,
    viewNonce,
    focusTarget,
    focusNonce,
    earthPos,
    sunDir,
    panelBiasX = 0,
    panelBiasY = 0,
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

    // Tempo decorrido (s) no voo atual: avança o parâmetro de interpolação até TWEEN_DURATION_S.
    const tweenElapsed = useRef(0);

    // Snapshot de origem do voo (posição e target no instante em que ele começou). A interpolação é
    // ABSOLUTA (lerpVectors(origem, destino, eased)), não incremental, então em t=1 a câmera está
    // exatamente no destino — sem cauda assintótica. Capturado no primeiro frame de cada tween.
    const tweenFrom = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        // Não sobrescreve um tween avulso em andamento — a câmera fica onde o usuário a deixou.
        if (adHocTweening.current) return;
        tweening.current = true;
        tweenElapsed.current = 0;
        tweenFrom.current = null; // recapturado no 1º frame do voo (origem real da câmera)
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

    const tweenCtxRef = useContext(CameraTweenContext);
    useEffect(() => {
        if (!tweenCtxRef) return;
        tweenCtxRef.current = (position, target) => {
            adHocDesired.current = { position: position.clone(), target: target.clone() };
            adHocTweening.current = true;
            tweening.current = false;
            tweenElapsed.current = 0;
            tweenFrom.current = null;
        };
    }, [tweenCtxRef]);

    // O voo da câmera é ininterrupto: enquanto um tween (de foco ou avulso) está em
    // andamento, os OrbitControls ficam desabilitados para que rotação/pan/zoom do usuário
    // não desviem nem cancelem a navegação. O controle volta sozinho quando a câmera chega ao
    // destino. As demais camadas de input (InertialZoom, TouchGestures, KeyboardPan) também
    // respeitam controls.enabled, então roda, pinça e teclado ficam inertes durante o voo.
    const setControlsEnabled = (enabled: boolean) => {
        if (controls && controls.enabled !== enabled) controls.enabled = enabled;
    };

    /* Avança um voo de duração fixa: na primeira chamada captura a ORIGEM (posição/target atuais da
       câmera) e a cada frame interpola origem→destino por um parâmetro de tempo com ease-out. Devolve
       true quando o voo terminou (t ≥ 1, câmera EXATAMENTE no destino). dt é o delta de tempo real. */
    const advanceTween = (
        fc: THREE.Camera,
        dest: { position: THREE.Vector3; target: THREE.Vector3 },
        dt: number,
    ): boolean => {
        if (!tweenFrom.current) {
            tweenFrom.current = {
                position: fc.position.clone(),
                target: controls?.target ? controls.target.clone() : dest.target.clone(),
            };
        }
        tweenElapsed.current += dt;
        const t = Math.min(1, tweenElapsed.current / TWEEN_DURATION_S);
        const e = easeOutCubic(t);
        const from = tweenFrom.current;
        fc.position.lerpVectors(from.position, dest.position, e);
        if (controls?.target) {
            controls.target.lerpVectors(from.target, dest.target, e);
            controls.update();
        } else {
            fc.lookAt(dest.target);
        }
        return t >= 1;
    };

    useFrame(({ camera: fc }, delta) => {
        // delta pode disparar (aba em background, GC); limita o passo para o voo não "pular".
        const dt = Math.min(delta, 1 / 30);
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
            setControlsEnabled(false);
            if (advanceTween(fc, adHocDesired.current, dt)) {
                adHocTweening.current = false;
                setControlsEnabled(true);
            }
            return;
        }

        if (!tweening.current) {
            // Sem tween em andamento: garante que o usuário tenha o controle de volta.
            setControlsEnabled(true);
            return;
        }

        // Voo de foco/view: o alvo é o objeto real; a compensação de painéis acontece na projeção
        // (acima), não aqui.
        setControlsEnabled(false);
        if (advanceTween(fc, effectiveDesired.current, dt)) {
            tweening.current = false;
            setControlsEnabled(true);
        }
    });

    return null;
}
