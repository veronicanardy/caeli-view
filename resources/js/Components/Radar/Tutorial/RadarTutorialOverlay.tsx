/**
 * Overlay do tutorial do radar.
 *
 * Responsabilidade: para o passo atual, resolver o alvo `data-tutorial`
 * visível, acompanhar seu retângulo e detectar as ações de DOM que avançam o
 * passo (cliques, teclado completo, zoom em duas fases, rotação acumulada).
 * Renderiza spotlight e tooltip em portal sobre toda a página (acima do guia,
 * z-[110]) sem nunca bloquear a interface: tudo é pointer-events-none, exceto
 * o card do tooltip.
 *
 * Quando o provider está em `settling` (ação feita, câmera viajando ou cena
 * carregando), o escurecimento some para o usuário ver o resultado antes do
 * próximo passo.
 *
 * Performance: nada roda por frame. O retângulo do alvo é reavaliado em
 * resize/scroll (throttle por requestAnimationFrame) e por um poll leve de
 * 400 ms; os medidores de gesto acumulam em ref e atualizam estado no máximo
 * uma vez por frame via requestAnimationFrame.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRadarTutorialOptional, type RadarTutorialContextValue } from './RadarTutorialContext';
import {
    findVisibleTarget,
    isProgrammaticTutorialClick,
    isTypingTarget,
    prefersReducedMotion,
    programmaticTutorialClick,
    rectFromElement,
} from './radarTutorialDom';
import { manualSkipClickSelectors } from './radarTutorialFlow';
import { inflateRect, rectsAlmostEqual, type TutorialRect } from './radarTutorialGeometry';
import type { TutorialStep } from './radarTutorialSteps';
import { TutorialGestureExtras } from './TutorialGestureExtras';
import { TutorialBackdrop, TutorialSpotlight } from './TutorialSpotlight';
import { TutorialTooltip } from './TutorialTooltip';

/** Cadência do poll de posição do alvo (mudanças de layout sem resize/scroll). */
const TARGET_POLL_MS = 400;
/** Tempo de espera pelo alvo antes de declará-lo indisponível. */
const TARGET_GRACE_MS = 1400;
/** Folga visual do spotlight ao redor do alvo. */
const SPOTLIGHT_PADDING = 8;
/** Classe aplicada no alvo real do passo para deixar o convite ao clique evidente. */
const TARGET_PULSE_CLASS = 'radar-tutorial-target-pulse';

export function RadarTutorialOverlay() {
    const tutorial = useRadarTutorialOptional();
    if (!tutorial?.active || !tutorial.step) return null;
    // key reinicia o estado interno (retângulo, listeners, medidores) a cada passo.
    return <OverlayForStep key={tutorial.step.id} tutorial={tutorial} step={tutorial.step} />;
}

function OverlayForStep({ tutorial, step }: { tutorial: RadarTutorialContextValue; step: TutorialStep }) {
    const [targetRect, setTargetRect] = useState<TutorialRect | null>(null);
    const [targetMissing, setTargetMissing] = useState(false);
    const targetElRef = useRef<HTMLElement | null>(null);
    const scrolledIntoView = useRef(false);

    // ─── Resolução e acompanhamento do alvo ───────────────────────────────────
    useEffect(() => {
        if (step.targets.length === 0) {
            setTargetRect(null);
            return undefined;
        }

        let raf = 0;
        let pulsingEl: HTMLElement | null = null;
        const setPulsingTarget = (el: HTMLElement | null) => {
            if (pulsingEl === el) return;
            pulsingEl?.classList.remove(TARGET_PULSE_CLASS);
            pulsingEl = el;
            pulsingEl?.classList.add(TARGET_PULSE_CLASS);
        };
        const resolve = () => {
            const el = findVisibleTarget(step.targets, step.targetMustBeEnabled);
            targetElRef.current = el;
            setPulsingTarget(el);
            if (el) {
                setTargetMissing(false);
                if (!scrolledIntoView.current) {
                    scrolledIntoView.current = true;
                    el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
                }
            }
            const rect = el ? rectFromElement(el) : null;
            setTargetRect((prev) => (rectsAlmostEqual(prev, rect) ? prev : rect));
        };
        resolve();

        const onLayoutChange = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(resolve);
        };
        window.addEventListener('resize', onLayoutChange);
        window.addEventListener('scroll', onLayoutChange, true);
        const poll = setInterval(resolve, TARGET_POLL_MS);
        const grace = setTimeout(() => {
            if (!targetElRef.current) setTargetMissing(true);
        }, TARGET_GRACE_MS);

        return () => {
            setPulsingTarget(null);
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onLayoutChange);
            window.removeEventListener('scroll', onLayoutChange, true);
            clearInterval(poll);
            clearTimeout(grace);
        };
    }, [step]);

    // Alvo indisponível em passo opcional: pula o passo (e o grupo) sozinho.
    useEffect(() => {
        if (targetMissing && step.optional) tutorial.skipUnavailableStep();
    }, [targetMissing, step, tutorial]);

    // Devolve a câmera ao ponto de partida ao entrar no passo, acionando o
    // mesmo botão de resetar vista que o usuário conhecerá depois.
    useEffect(() => {
        if (!step.resetViewOnEnter) return;
        const el = findVisibleTarget(['[data-tutorial="reset-view"]'], true);
        if (el) programmaticTutorialClick(el);
    }, [step]);

    // ─── Detecção das ações que avançam o passo ───────────────────────────────
    const hasTarget = targetRect !== null;

    useStepClickAdvance(step, tutorial);
    const keyboardDone = useKeyboardAdvance(step, tutorial);
    const zoomProgress = useZoomAdvance(step, tutorial, hasTarget, targetElRef);
    const rotateProgress = useRotateAdvance(step, tutorial, hasTarget, targetElRef);

    // ─── Render ───────────────────────────────────────────────────────────────

    if (typeof document === 'undefined') return null;

    const spotlightRect = targetRect
        ? inflateRect(targetRect, SPOTLIGHT_PADDING, window.innerWidth, window.innerHeight)
        : null;

    const extras: ReactNode = (
        <TutorialGestureExtras
            step={step}
            en={tutorial.locale === 'en'}
            keyboardDone={keyboardDone}
            zoomProgress={zoomProgress}
            rotateProgress={rotateProgress}
        />
    );

    // "Pular passo": executa a ação esperada por baixo (clica a aba, abre a
    // órbita) e avança UM passo. Assim a imagem que o texto descreve sempre
    // acontece, mesmo quando o usuário não quer clicar ele mesmo. Sem clique
    // determinístico (gestos, filtros), só avança um passo. O clique é
    // programático: as detecções de avanço o ignoram, então o avanço acontece de
    // forma controlada (um passo), nunca em dobro.
    //
    // Exceção: o passo de SELEÇÃO. Pular ali significa "não quero conhecer este
    // objeto", então salta o bloco do objeto inteiro (card, abas, trajetória,
    // órbita) via skipUnavailableStep. Selecionar a rocha por baixo só prenderia
    // a pessoa no bloco que ela quis pular (e a seleção assíncrona causava loop
    // de volta ao passo de seleção).
    const handleSkipStep = () => {
        if (step.advance.kind === 'selection') {
            tutorial.skipUnavailableStep();
            return;
        }
        const selectors = manualSkipClickSelectors(step);
        const el = selectors ? findVisibleTarget(selectors, true) : null;
        if (el) programmaticTutorialClick(el);
        tutorial.next();
    };

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[120]">
            {/* Em settling o escurecimento sai de cena: o usuário vê a câmera viajar ou o radar carregar. */}
            {!tutorial.settling ? (
                spotlightRect
                    ? <TutorialSpotlight rect={spotlightRect} dim={!step.keepSceneBright} />
                    : step.targets.length === 0
                        ? <TutorialBackdrop />
                        : null
            ) : null}
            <TutorialTooltip
                step={step}
                stepNumber={tutorial.stepIndex + 1}
                stepCount={tutorial.stepCount}
                en={tutorial.locale === 'en'}
                isMobile={tutorial.isMobile}
                targetRect={spotlightRect}
                liveFacts={tutorial.liveFacts}
                extras={extras}
                onNext={() => tutorial.completeStep('manual-next')}
                onSkipStep={handleSkipStep}
                onSkipTutorial={tutorial.skip}
            />
        </div>,
        document.body,
    );
}

// ─── Hooks de avanço por ação ──────────────────────────────────────────────────

/**
 * Clique dentro do alvo (fase de captura: o clique segue para a UI real).
 * Passos com `requiredClicks` exigem cliques em elementos distintos antes de
 * avançar (ex.: visitar duas abas do card).
 */
function useStepClickAdvance(step: TutorialStep, tutorial: RadarTutorialContextValue) {
    const distinctClicks = useRef<Set<string>>(new Set());

    useEffect(() => {
        const advance = step.advance;
        if (advance.kind !== 'click') return undefined;
        const onClickCapture = (event: Event) => {
            // Clique sintetizado pelo próprio tutorial (restauração visual de um
            // passo de contemplação) não é ação do usuário: nunca avança o passo.
            if (isProgrammaticTutorialClick()) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!step.targets.some((selector) => target.closest(selector))) return;
            const required = advance.requireSelector ? target.closest(advance.requireSelector) : target;
            if (!required) return;

            if (step.requiredClicks && step.requiredClicks > 1) {
                const el = required as HTMLElement;
                distinctClicks.current.add(el.id || el.textContent || String(distinctClicks.current.size));
                if (distinctClicks.current.size < step.requiredClicks) return;
            }

            if (step.settleWhileAdvancing) tutorial.advanceAfterSettle(step.advanceDelayMs);
            else tutorial.advanceFromAction(step.advanceDelayMs);
        };
        document.addEventListener('click', onClickCapture, true);
        return () => document.removeEventListener('click', onClickCapture, true);
    }, [step, tutorial]);
}

const KEYBOARD_ALL_KEYS = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Normaliza a tecla do evento para o id da grade (wasd minúsculo, setas literais). */
function panKeyId(eventKey: string): string {
    return eventKey.startsWith('Arrow') ? eventKey : eventKey.toLowerCase();
}

/**
 * Avanço por teclado: o passo só completa depois que TODAS as teclas do mini
 * teclado (W, A, S, D e as quatro setas) foram pressionadas. O avanço espera
 * `advanceDelayMs` para a última tecla acender antes do tutorial seguir.
 */
function useKeyboardAdvance(step: TutorialStep, tutorial: RadarTutorialContextValue): boolean {
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (step.advance.kind !== 'keyboard-pan') return undefined;
        const pressed = new Set<string>();
        const onKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) return;
            const id = panKeyId(event.key);
            if (!KEYBOARD_ALL_KEYS.includes(id)) return;
            pressed.add(id);
            if (pressed.size === KEYBOARD_ALL_KEYS.length) {
                setDone(true);
                tutorial.advanceFromAction(step.advanceDelayMs ?? 700);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [step, tutorial]);

    return done;
}

/** Quanto de deltaY acumulado completa cada fase do zoom (aprox. 16 ticks de roda, gesto longo e calmo). */
const ZOOM_PHASE_AMOUNT = 1600;
/** Fator que converte pixels de pinça para a mesma escala do deltaY da roda. */
const PINCH_TO_WHEEL = 4;

export type ZoomProgress = { zoomIn: number; zoomOut: number };

/**
 * Avanço por zoom em duas fases: primeiro aproximar (scroll para cima ou
 * pinça abrindo), depois afastar. A fase de afastar só conta depois que a de
 * aproximar completa, para o usuário sentir os dois movimentos.
 */
function useZoomAdvance(
    step: TutorialStep,
    tutorial: RadarTutorialContextValue,
    hasTarget: boolean,
    targetElRef: React.RefObject<HTMLElement | null>,
): ZoomProgress {
    const [progress, setProgress] = useState<ZoomProgress>({ zoomIn: 0, zoomOut: 0 });

    useEffect(() => {
        if (step.advance.kind !== 'scene-zoom') return undefined;
        const el = targetElRef.current;
        if (!el) return undefined;

        const acc = { zoomIn: 0, zoomOut: 0 };
        let raf = 0;
        const flush = () => {
            raf = 0;
            setProgress({
                zoomIn: Math.min(1, acc.zoomIn / ZOOM_PHASE_AMOUNT),
                zoomOut: Math.min(1, acc.zoomOut / ZOOM_PHASE_AMOUNT),
            });
            if (acc.zoomIn >= ZOOM_PHASE_AMOUNT && acc.zoomOut >= ZOOM_PHASE_AMOUNT) {
                tutorial.advanceFromAction(step.advanceDelayMs ?? 700);
            }
        };
        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(flush);
        };
        const track = (amount: number) => {
            if (amount > 0 && acc.zoomIn < ZOOM_PHASE_AMOUNT) acc.zoomIn += amount;
            else if (amount < 0 && acc.zoomIn >= ZOOM_PHASE_AMOUNT) acc.zoomOut += -amount;
            schedule();
        };

        // deltaY negativo = aproximar (padrão de roda/trackpad).
        const onWheel = (event: WheelEvent) => track(-event.deltaY);

        // Pinça: distância entre dois ponteiros aumentando = aproximar.
        const pointers = new Map<number, { x: number; y: number }>();
        let lastDistance = 0;
        const pinchDistance = () => {
            const [a, b] = [...pointers.values()];
            return Math.hypot(a.x - b.x, a.y - b.y);
        };
        const onPointerDown = (event: PointerEvent) => {
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointers.size === 2) lastDistance = pinchDistance();
        };
        const onPointerMove = (event: PointerEvent) => {
            if (!pointers.has(event.pointerId)) return;
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointers.size !== 2) return;
            const distance = pinchDistance();
            track((distance - lastDistance) * PINCH_TO_WHEEL);
            lastDistance = distance;
        };
        const forget = (event: PointerEvent) => {
            pointers.delete(event.pointerId);
            lastDistance = 0;
        };

        el.addEventListener('wheel', onWheel, { passive: true });
        el.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', forget, { passive: true });
        window.addEventListener('pointercancel', forget, { passive: true });
        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', forget);
            window.removeEventListener('pointercancel', forget);
        };
    }, [step, tutorial, hasTarget, targetElRef]);

    return progress;
}

/** Distância de arraste acumulada (px) que completa o medidor de rotação (gesto longo e calmo). */
const ROTATE_TOTAL_PX = 1400;

/**
 * Avanço por rotação: acumula a distância arrastada com o botão esquerdo do
 * mouse (rotate dos OrbitControls) ou com um dedo no touch. Botão direito
 * (pan) e pinça (dois ponteiros) não contam: o gesto ensinado é o de girar.
 */
function useRotateAdvance(
    step: TutorialStep,
    tutorial: RadarTutorialContextValue,
    hasTarget: boolean,
    targetElRef: React.RefObject<HTMLElement | null>,
): number {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (step.advance.kind !== 'scene-rotate') return undefined;
        const el = targetElRef.current;
        if (!el) return undefined;

        let accumulated = 0;
        let raf = 0;
        const flush = () => {
            raf = 0;
            setProgress(Math.min(1, accumulated / ROTATE_TOTAL_PX));
            if (accumulated >= ROTATE_TOTAL_PX) tutorial.advanceFromAction(step.advanceDelayMs ?? 700);
        };
        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(flush);
        };

        const pointers = new Map<number, { x: number; y: number }>();
        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        };
        const onPointerMove = (event: PointerEvent) => {
            const last = pointers.get(event.pointerId);
            if (!last || pointers.size !== 1) return;
            accumulated += Math.hypot(event.clientX - last.x, event.clientY - last.y);
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            schedule();
        };
        const forget = (event: PointerEvent) => pointers.delete(event.pointerId);

        el.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', forget, { passive: true });
        window.addEventListener('pointercancel', forget, { passive: true });
        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', forget);
            window.removeEventListener('pointercancel', forget);
        };
    }, [step, tutorial, hasTarget, targetElRef]);

    return progress;
}
