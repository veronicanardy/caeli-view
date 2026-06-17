/**
 * Primitivas de labels HTML sobre a cena 3D.
 *
 * Responsabilidade: renderizar rótulos posicionados em coordenadas de mundo,
 * aplicar oclusão visual por corpos e respeitar zonas proibidas de UI. Não
 * decide o conteúdo dos labels nem controla câmera ou seleção.
 */

import { Html } from '@react-three/drei';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/radar/cursor';
import { Tooltip } from '../Controls/Tooltip';
import { useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { circleOverlapsRect, labelHiddenByFocusCircle } from '../Scene/sceneOcclusion';

/**
 * Primitivas de labels HTML sobre a cena 3D.
 *
 * Este modulo cuida de apresentacao, oclusao visual e protecao de espaco em
 * tela para labels ja posicionados por outros componentes. Ele nao deve virar
 * camada de calculo orbital, selecao global ou fetch de dados.
 */

/**
 * Zonas proibidas para labels — retângulos em pixels (coordenadas do canvas) que os labels
 * devem evitar. Usado para impedir que labels apareçam sobre qualquer card flutuante.
 */
export type NoGoRect = { left: number; top: number; right: number; bottom: number };
export const LabelNoGoContext = createContext<NoGoRect[]>([]);
export type SceneObjectOccluder = { center: THREE.Vector3; radius: number };
export const SceneObjectOccludersContext = createContext<SceneObjectOccluder[]>([]);

/**
 * Limiares de pixel compartilhados pelos hooks de layout de rótulo. Mantidos aqui para que o
 * módulo de labels seja autossuficiente.
 */
const COMPACT_LABEL_THRESHOLD_PX = 92;
// Abaixo deste limiar a região Terra-Lua é pequena demais para exibir labels de asteroides
// sem amontoamento — esconde todos (exceto o selecionado, tratado pelo chamador).
const HIDE_ASTEROID_LABELS_THRESHOLD_PX = 10;
const LABEL_HIDE_MIN_RADIUS_PX = 72;
const LABEL_HIDE_BODY_PADDING_PX = 72;
const LABEL_OBJECT_HIDE_PADDING_PX = 8;
const LABEL_OBJECT_SHOW_PADDING_PX = 18;
const LABEL_OBJECT_MIN_OCCLUDER_RADIUS_PX = 18;

export type LabelOccluder = { center: THREE.Vector3; radius: number } | null;

/**
 * Localiza em runtime o elemento onde o drei <Html> portala os labels da cena.
 *
 * A estrutura de wrappers do R3F varia entre versões, então o host é descoberto
 * subindo a partir do canvas até encontrar filhos div com position:absolute
 * inline (assinatura dos portais do drei). Usado pelo LabelBackdropGate para
 * alternar classes de estilo sobre todos os labels sem passar pelo React.
 */
export function findLabelPortalHost(canvas: HTMLCanvasElement): HTMLElement | null {
    let node: HTMLElement | null = canvas.parentElement;
    while (node && node !== document.body) {
        const hasPortal = Array.from(node.children).some(
            (el) => el instanceof HTMLDivElement && el.style.position === 'absolute',
        );
        if (hasPortal) return node;
        node = node.parentElement;
    }
    return null;
}

/**
 * Informa a <SceneLabel> / <ScreenLabel> / <FocusProtectedHtml> qual corpo 3D, se algum, está
 * com a atenção total da câmera. Labels dentro da silhueta projetada do oclusor + margem são
 * ocultados para que o corpo em foco nunca apareça como uma pilha confusa de nomes.
 */
export const LabelOccluderContext = createContext<LabelOccluder>(null);

// --------------- Scene label (DOM overlay; always faces the screen) ---------------

/**
 * Label de texto ancorado em 3D, renderizado como overlay <Html>. Deliberadamente evitamos o
 * <Text> do drei (troika-three-text) porque ele busca uma fonte padrão de CDN na primeira
 * renderização — o projeto proíbe fetches de frontend para terceiros. <Html> usa DOM/CSS puro,
 * escala com a distância via `distanceFactor` e sempre fica voltado para a câmera gratuitamente.
 */
export function SceneLabel({
    position,
    children,
    distanceFactor,
    tier,
    highlighted = false,
    protectFromFocus = true,
    allowSceneOverlap = false,
    onClick,
    title,
}: {
    position: [number, number, number];
    children: React.ReactNode;
    distanceFactor?: number;
    tier: 'primary' | 'ring';
    highlighted?: boolean;
    protectFromFocus?: boolean;
    allowSceneOverlap?: boolean;
    onClick?: () => void;
    title?: string;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const { hiddenByFocus, hiddenByNoGo, hiddenByObjects } = useLabelFrameState(
        labelRef, buttonRef, protectFromFocus ? focusOccluder : null, allowSceneOverlap,
    );
    const cls =
        tier === 'primary'
            ? [
                  'select-none whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur',
                  highlighted ? 'bg-space-950/85 text-white/95' : 'bg-space-950/65 text-white/70',
                  onClick ? 'pointer-events-auto cursor-pointer transition hover:bg-space-950 hover:text-white' : 'pointer-events-none',
              ].join(' ')
            : [
                  'select-none whitespace-nowrap rounded-full bg-space-950/50 px-1.5 py-0.5 text-[11px] font-medium text-white/55 backdrop-blur',
                  onClick ? 'pointer-events-auto cursor-pointer transition hover:bg-space-950/80 hover:text-white' : 'pointer-events-none',
              ].join(' ');

    // Oculta via CSS em vez de desmontar o <Html>: montar/desmontar o portal DOM a cada
    // cruzamento de zona proibida ou silhueta de foco força layout e GC durante o movimento
    // de câmera — exatamente o gatilho das micro-travadas. visibility é só uma troca de estilo.
    const hidden = hiddenByFocus || hiddenByNoGo || hiddenByObjects;

    return (
        <group ref={labelRef} position={position}>
            <Html position={[0, 0, 0]} center distanceFactor={distanceFactor} zIndexRange={[7, 0]}>
                <button
                    type="button"
                    className={cls}
                    onClick={(event) => {
                        event.stopPropagation();
                        onClick?.();
                    }}
                    onPointerEnter={() => { if (onClick) cursorPointerEnter(); }}
                    onPointerLeave={() => { if (onClick) cursorPointerLeave(); }}
                    title={title}
                    aria-label={title}
                    disabled={!onClick}
                    ref={buttonRef}
                    style={hidden ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
                >
                    {children}
                </button>
            </Html>
        </group>
    );
}

/**
 * Label ancorado a um ponto 3D mas com tamanho ESTÁVEL NA TELA — não encolhe quando o objeto fica
 * longe (sem `distanceFactor`). É isso que mantém o label de hover/seleção de um asteroide
 * distante legível: o texto fica em tamanho CSS fixo na tela independente da profundidade, mas
 * ainda acompanha a posição projetada do marcador.
 */
export function ScreenLabel({
    position,
    emphasized = false,
    protectFromFocus = true,
    allowSceneOverlap = false,
    children,
    onClick,
    title,
    tooltip,
}: {
    position: [number, number, number];
    emphasized?: boolean;
    protectFromFocus?: boolean;
    allowSceneOverlap?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
    tooltip?: React.ReactNode;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const { hiddenByFocus, hiddenByNoGo, hiddenByObjects } = useLabelFrameState(
        labelRef, buttonRef, protectFromFocus ? focusOccluder : null, allowSceneOverlap,
    );
    // Mesma razão do SceneLabel: ocultar via CSS evita montar/desmontar o portal DOM
    // durante o movimento de câmera.
    const hidden = hiddenByFocus || hiddenByNoGo || hiddenByObjects;

    return (
        <group ref={labelRef} position={position}>
            <Html position={[0, 0, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: onClick || tooltip ? 'auto' : 'none' }}>
                {(() => {
                    const btn = (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onClick?.();
                            }}
                            onPointerEnter={() => { if (onClick) cursorPointerEnter(); }}
                            onPointerLeave={() => { if (onClick) cursorPointerLeave(); }}
                            title={title}
                            aria-label={title}
                            disabled={!onClick}
                            ref={buttonRef}
                            style={hidden ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
                            className={[
                                '-translate-y-[55%] max-w-[18ch] truncate rounded-lg border px-2 py-0.5 text-[12px] font-semibold leading-snug backdrop-blur',
                                emphasized
                                    ? 'border-signal-cyan/55 bg-space-950/95 text-white shadow-[0_0_16px_rgba(34,211,238,0.18)]'
                                    : 'border-white/10 bg-space-950/85 text-white/80',
                                onClick ? 'pointer-events-auto cursor-pointer text-left transition hover:border-signal-cyan/50 hover:bg-space-950' : 'pointer-events-none',
                            ].join(' ')}
                        >
                            {children}
                        </button>
                    );
                    return tooltip ? <Tooltip content={tooltip} side="top" hideDelay={200} offset={28}>{btn}</Tooltip> : btn;
                })()}
            </Html>
        </group>
    );
}

export function DistanceCulledScreenLabel({
    anchor,
    maxCameraDistance,
    ...props
}: Parameters<typeof ScreenLabel>[0] & {
    anchor: [number, number, number];
    maxCameraDistance: number;
}) {
    const camera = useThree((state) => state.camera);
    const [visible, setVisible] = useState(true);
    const _anchor = useRef(new THREE.Vector3());

    useFrame(() => {
        _anchor.current.set(...anchor);
        const d = camera.position.distanceTo(_anchor.current);
        const nextVisible = d <= maxCameraDistance;
        setVisible((current) => (current === nextVisible ? current : nextVisible));
    });

    return visible ? <ScreenLabel {...props} /> : null;
}

export function FocusProtectedHtml({
    position,
    center = true,
    distanceFactor,
    zIndexRange,
    style,
    children,
}: {
    position: [number, number, number];
    center?: boolean;
    distanceFactor?: number;
    zIndexRange?: [number, number];
    style?: React.CSSProperties;
    children: React.ReactNode;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    // Sem elemento DOM: este wrapper só respeita oclusão de foco, não a oclusão por corpos.
    const { hiddenByFocus } = useLabelFrameState(labelRef, null, focusOccluder, true);

    return (
        <group ref={labelRef} position={position}>
            <Html
                position={[0, 0, 0]}
                center={center}
                distanceFactor={distanceFactor}
                zIndexRange={zIndexRange}
                style={hiddenByFocus ? { ...style, visibility: 'hidden', pointerEvents: 'none' } : style}
            >
                {children}
            </Html>
        </group>
    );
}

// Recalcula o raio lunar projetado a cada N frames em vez de todo frame. O valor só alimenta
// limiares de modo de label (compacto / esconder), que toleram um atraso de poucos frames; isso
// corta 3/4 do custo desta projeção sem efeito visível.
const LUNAR_RADIUS_FRAME_INTERVAL = 4;

// Histerese em pixels em torno do limiar: evita que o boolean oscile (e re-renderize todos os
// labels consumidores) quando o raio projetado fica parado exatamente na fronteira.
const LUNAR_THRESHOLD_HYSTERESIS_PX = 2;

/**
 * Hook base compartilhado: projeta o raio orbital da Lua (1 DL) em pixels e devolve apenas o
 * boolean "está abaixo do limiar?", com histerese.
 *
 * O estado é booleano de propósito: a versão anterior publicava o raio numérico via setState,
 * o que re-renderizava todos os consumidores a cada ~4 frames durante qualquer zoom contínuo.
 * Como os consumidores só comparam contra um limiar, o componente agora só re-renderiza nos
 * cruzamentos de fronteira (2 vezes por gesto de zoom, em vez de dezenas).
 */
function useLunarRadiusBelow(thresholdPx: number): boolean {
    const { camera, size } = useThree();
    const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
    const [below, setBelow] = useState(false);
    const belowRef = useRef(false);
    const frameCount = useRef(0);
    const _target = useRef(new THREE.Vector3());
    const _center = useRef(new THREE.Vector3());
    const _oneDl = useRef(new THREE.Vector3());

    useFrame(() => {
        if (frameCount.current++ % LUNAR_RADIUS_FRAME_INTERVAL !== 0) return;
        const target = controls?.target ?? _target.current.set(0, 0, 0);
        _center.current.copy(target).project(camera);
        _oneDl.current.copy(target);
        _oneDl.current.x += 1;
        _oneDl.current.project(camera);
        const radiusPx = Math.hypot(
            (_oneDl.current.x - _center.current.x) * size.width * 0.5,
            (_oneDl.current.y - _center.current.y) * size.height * 0.5,
        );
        // Histerese: para sair do estado atual é preciso cruzar o limiar com folga.
        const next = belowRef.current
            ? radiusPx < thresholdPx + LUNAR_THRESHOLD_HYSTERESIS_PX
            : radiusPx < thresholdPx - LUNAR_THRESHOLD_HYSTERESIS_PX;
        if (next !== belowRef.current) {
            belowRef.current = next;
            setBelow(next);
        }
    });

    return below;
}

/**
 * Retorna true quando a órbita projetada da Lua (anel de 1 DL) encolhe abaixo de
 * COMPACT_LABEL_THRESHOLD_PX na tela — ou seja, o usuário afastou o suficiente para que os
 * labels primários longos entulhem a vizinhança Terra-Lua. Os labels mudam para forma compacta.
 */
export function useCompactLabelMode(): boolean {
    return useLunarRadiusBelow(COMPACT_LABEL_THRESHOLD_PX);
}

/**
 * Retorna true quando a câmera está longe demais da Terra para exibir labels de asteroides
 * sem amontoamento. Usa a mesma projeção de 1 DL que useCompactLabelMode, mas com um limiar
 * menor — quando a região Terra-Lua encolhe abaixo de HIDE_ASTEROID_LABELS_THRESHOLD_PX, os
 * labels de rochas devem ser ocultados (exceto o objeto selecionado, responsabilidade do chamador).
 */
export function useHideAsteroidLabelsMode(): boolean {
    return useLunarRadiusBelow(HIDE_ASTEROID_LABELS_THRESHOLD_PX);
}

/**
 * Estados de visibilidade de um label, derivados da câmera a cada frame.
 *
 * - hiddenByFocus: dentro da silhueta projetada do corpo em foco (LabelOccluderContext);
 * - hiddenByNoGo: sobre uma zona proibida de UI (LabelNoGoContext);
 * - hiddenByObjects: sobrepondo um corpo de cena (SceneObjectOccludersContext).
 */
type LabelFrameState = { hiddenByFocus: boolean; hiddenByNoGo: boolean; hiddenByObjects: boolean };

/**
 * Mede o tamanho em pixels de um elemento de label e atualiza quando ele muda.
 *
 * Substitui o `getBoundingClientRect()` por frame: o retângulo de um label só muda quando
 * o conteúdo/CSS muda, não a cada frame. Um ResizeObserver captura essas mudanças raras e
 * mantém um ref com largura/altura estáveis que o loop de oclusão consome sem tocar o DOM.
 */
function useLabelSizePx(elementRef: React.RefObject<HTMLElement | null>): React.RefObject<{ w: number; h: number }> {
    const sizeRef = useRef({ w: 0, h: 0 });
    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;
        const measure = () => {
            const rect = element.getBoundingClientRect();
            sizeRef.current.w = rect.width;
            sizeRef.current.h = rect.height;
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [elementRef]);
    return sizeRef;
}

/**
 * Hook único de visibilidade de label: um `useFrame` por label em vez de três.
 *
 * Projeta a posição de mundo do label uma única vez por frame e reaproveita esse pixel
 * para os três testes (foco, zona proibida, oclusão por corpos). Antes cada teste tinha seu
 * próprio `useFrame`, sua própria projeção e, no caso da oclusão, dois `getBoundingClientRect()`
 * por frame, o que força reflow de layout. Com dezenas de labels visíveis isso dominava o custo
 * por frame e causava os travamentos. Todos os Vector3 são refs reutilizáveis (sem `.clone()`,
 * sem lixo de GC no loop).
 */
function useLabelFrameState(
    labelRef: React.RefObject<THREE.Object3D | null>,
    elementRef: React.RefObject<HTMLElement | null> | null,
    focusOccluder: LabelOccluder,
    allowSceneOverlap: boolean,
): LabelFrameState {
    const { camera, gl, size } = useThree();
    const noGoRects = useContext(LabelNoGoContext);
    const sceneOccluders = useContext(SceneObjectOccludersContext);
    const labelSize = useLabelSizePx(elementRef ?? { current: null });

    const [state, setState] = useState<LabelFrameState>({ hiddenByFocus: false, hiddenByNoGo: false, hiddenByObjects: false });
    const stateRef = useRef(state);

    // Buffers reutilizáveis — alocados uma vez, nunca dentro do loop.
    const _labelWorld = useRef(new THREE.Vector3());
    const _labelProj = useRef(new THREE.Vector3());
    const _cameraRight = useRef(new THREE.Vector3());
    const _center = useRef(new THREE.Vector3());
    const _edge = useRef(new THREE.Vector3());

    useFrame(() => {
        const obj = labelRef.current;
        if (!obj) return;

        // Projeção única da posição do label, em pixels do canvas.
        obj.getWorldPosition(_labelWorld.current);
        _labelProj.current.copy(_labelWorld.current).project(camera);
        const labelBehind = _labelProj.current.z > 1;
        const labelPxX = (_labelProj.current.x * 0.5 + 0.5) * size.width;
        const labelPxY = (-_labelProj.current.y * 0.5 + 0.5) * size.height;

        _cameraRight.current.setFromMatrixColumn(camera.matrixWorld, 0).normalize();

        // --- Foco: dentro da silhueta projetada do corpo em foco? ---
        let hiddenByFocus = false;
        if (focusOccluder && !labelBehind) {
            _center.current.copy(focusOccluder.center).project(camera);
            if (_center.current.z >= -1 && _center.current.z <= 1) {
                _edge.current.copy(focusOccluder.center).addScaledVector(_cameraRight.current, focusOccluder.radius).project(camera);
                const centerPxX = (_center.current.x * 0.5 + 0.5) * size.width;
                const centerPxY = (-_center.current.y * 0.5 + 0.5) * size.height;
                const edgePxX = (_edge.current.x * 0.5 + 0.5) * size.width;
                const edgePxY = (-_edge.current.y * 0.5 + 0.5) * size.height;
                const bodyRadiusPx = Math.hypot(edgePxX - centerPxX, edgePxY - centerPxY);
                hiddenByFocus = labelHiddenByFocusCircle(
                    labelPxX, labelPxY, centerPxX, centerPxY,
                    bodyRadiusPx, LABEL_HIDE_MIN_RADIUS_PX, LABEL_HIDE_BODY_PADDING_PX,
                );
            }
        }

        // --- Zona proibida de UI ---
        let hiddenByNoGo = false;
        if (noGoRects.length > 0 && !labelBehind) {
            hiddenByNoGo = noGoRects.some((noGo) =>
                labelPxX >= noGo.left && labelPxX <= noGo.right && labelPxY >= noGo.top && labelPxY <= noGo.bottom,
            );
        }

        // --- Oclusão por corpos de cena ---
        // Usa o centro projetado do label + tamanho medido (cacheado), em coordenadas de página
        // para casar com a origem dos oclusores de cena (que o código original lia do canvasRect).
        let hiddenByObjects = false;
        if (!allowSceneOverlap && sceneOccluders.length > 0 && !labelBehind && labelSize.current.w >= 1) {
            const canvasLeft = gl.domElement.offsetLeft;
            const canvasTop = gl.domElement.offsetTop;
            // O label é renderizado centralizado na sua âncora (Html center); o retângulo é
            // centrado no pixel projetado.
            const rect = {
                left: canvasLeft + labelPxX - labelSize.current.w * 0.5,
                right: canvasLeft + labelPxX + labelSize.current.w * 0.5,
                top: canvasTop + labelPxY - labelSize.current.h * 0.5,
                bottom: canvasTop + labelPxY + labelSize.current.h * 0.5,
            };
            const paddingPx = stateRef.current.hiddenByObjects ? LABEL_OBJECT_SHOW_PADDING_PX : LABEL_OBJECT_HIDE_PADDING_PX;

            hiddenByObjects = sceneOccluders.some((occluder) => {
                _center.current.copy(occluder.center).project(camera);
                if (_center.current.z < -1 || _center.current.z > 1) return false;
                _edge.current.copy(occluder.center).addScaledVector(_cameraRight.current, occluder.radius).project(camera);
                const centerPxX = canvasLeft + (_center.current.x * 0.5 + 0.5) * size.width;
                const centerPxY = canvasTop + (-_center.current.y * 0.5 + 0.5) * size.height;
                const edgePxX = canvasLeft + (_edge.current.x * 0.5 + 0.5) * size.width;
                const edgePxY = canvasTop + (-_edge.current.y * 0.5 + 0.5) * size.height;
                const radiusPx = Math.hypot(edgePxX - centerPxX, edgePxY - centerPxY);
                return circleOverlapsRect(centerPxX, centerPxY, radiusPx, rect, paddingPx, LABEL_OBJECT_MIN_OCCLUDER_RADIUS_PX);
            });
        }

        const prev = stateRef.current;
        if (prev.hiddenByFocus !== hiddenByFocus || prev.hiddenByNoGo !== hiddenByNoGo || prev.hiddenByObjects !== hiddenByObjects) {
            const next = { hiddenByFocus, hiddenByNoGo, hiddenByObjects };
            stateRef.current = next;
            setState(next);
        }
    });

    return state;
}
