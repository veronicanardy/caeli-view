/**
 * Primitivas de labels HTML sobre a cena 3D.
 *
 * Responsabilidade: renderizar rótulos posicionados em coordenadas de mundo,
 * aplicar oclusão visual por corpos e respeitar zonas proibidas de UI. Não
 * decide o conteúdo dos labels nem controla câmera ou seleção.
 */

import { Html } from '@react-three/drei';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useRef, useState } from 'react';
import * as THREE from 'three';

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
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, protectFromFocus ? focusOccluder : null);
    const hiddenByNoGo = useLabelInNoGoZone(labelRef);
    const hiddenByObjects = useLabelOverlapsSceneObjects(buttonRef, allowSceneOverlap);
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

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus && !hiddenByNoGo ? (
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
                        style={hiddenByObjects ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
                    >
                        {children}
                    </button>
                </Html>
            ) : null}
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
}: {
    position: [number, number, number];
    emphasized?: boolean;
    protectFromFocus?: boolean;
    allowSceneOverlap?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, protectFromFocus ? focusOccluder : null);
    const hiddenByNoGo = useLabelInNoGoZone(labelRef);
    const hiddenByObjects = useLabelOverlapsSceneObjects(buttonRef, allowSceneOverlap);

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus && !hiddenByNoGo ? (
                <Html position={[0, 0, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
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
                        style={hiddenByObjects ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
                        className={[
                            /* Label do objeto selecionado: próximo ao asteroide, presença clara. */
                            '-translate-y-[55%] whitespace-nowrap rounded-lg border px-2 py-0.5 text-[12px] font-semibold leading-snug backdrop-blur lg:px-3 lg:py-1.5 lg:text-[15px]',
                            emphasized
                                ? 'border-signal-cyan/55 bg-space-950/95 text-white shadow-[0_0_16px_rgba(34,211,238,0.18)]'
                                : 'border-white/10 bg-space-950/85 text-white/80',
                            onClick ? 'pointer-events-auto cursor-pointer text-left transition hover:border-signal-cyan/50 hover:bg-space-950' : 'pointer-events-none',
                        ].join(' ')}
                    >
                        {children}
                    </button>
                </Html>
            ) : null}
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
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, focusOccluder);

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus ? (
                <Html position={[0, 0, 0]} center={center} distanceFactor={distanceFactor} zIndexRange={zIndexRange} style={style}>
                    {children}
                </Html>
            ) : null}
        </group>
    );
}

/**
 * Retorna true quando a órbita projetada da Lua (anel de 1 DL) encolhe abaixo de
 * COMPACT_LABEL_THRESHOLD_PX na tela — ou seja, o usuário afastou o suficiente para que os
 * labels primários longos entulhem a vizinhança Terra-Lua. Os labels mudam para forma compacta.
 */
/**
 * Hook base compartilhado: projeta o raio orbital da Lua (1 DL) em pixels uma única vez por frame.
 * useCompactLabelMode e useHideAsteroidLabelsMode consomem o resultado sem duplicar a projeção.
 */
function useLunarRadiusPx(): number {
    const { camera, size } = useThree();
    const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
    const [radiusPx, setRadiusPx] = useState(0);
    const radiusPxRef = useRef(0);
    const _fallbackTarget = useRef(new THREE.Vector3());
    const _oneDl = useRef(new THREE.Vector3());

    useFrame(() => {
        const target = controls?.target ?? _fallbackTarget.current.set(0, 0, 0);
        const center = target.clone().project(camera);
        _oneDl.current.copy(target).x += 1;
        const oneDl = _oneDl.current.project(camera);
        const next = Math.hypot(
            (oneDl.x - center.x) * size.width * 0.5,
            (oneDl.y - center.y) * size.height * 0.5,
        );
        if (Math.abs(next - radiusPxRef.current) > 0.5) {
            radiusPxRef.current = next;
            setRadiusPx(next);
        }
    });

    return radiusPx;
}

export function useCompactLabelMode(): boolean {
    return useLunarRadiusPx() < COMPACT_LABEL_THRESHOLD_PX;
}

/**
 * Retorna true quando a câmera está longe demais da Terra para exibir labels de asteroides
 * sem amontoamento. Usa a mesma projeção de 1 DL que useCompactLabelMode, mas com um limiar
 * menor — quando a região Terra-Lua encolhe abaixo de HIDE_ASTEROID_LABELS_THRESHOLD_PX, os
 * labels de rochas devem ser ocultados (exceto o objeto selecionado, responsabilidade do chamador).
 */
export function useHideAsteroidLabelsMode(): boolean {
    return useLunarRadiusPx() < HIDE_ASTEROID_LABELS_THRESHOLD_PX;
}

/**
 * Retorna true quando a posição projetada deste label cai dentro de qualquer NoGoRect do contexto.
 * Roda a cada frame mas só dispara re-render quando o estado muda.
 */
function useLabelInNoGoZone(labelRef: React.RefObject<THREE.Object3D | null>): boolean {
    const { camera, size } = useThree();
    const noGoRects = useContext(LabelNoGoContext);
    const [blocked, setBlocked] = useState(false);
    const blockedRef = useRef(false);
    const pos = useRef(new THREE.Vector3());

    useFrame(() => {
        if (!labelRef.current || noGoRects.length === 0) {
            if (blockedRef.current) { blockedRef.current = false; setBlocked(false); }
            return;
        }
        labelRef.current.getWorldPosition(pos.current);
        const projected = pos.current.clone().project(camera);
        if (projected.z > 1) {
            if (blockedRef.current) { blockedRef.current = false; setBlocked(false); }
            return;
        }
        const px = (projected.x * 0.5 + 0.5) * size.width;
        const py = (-projected.y * 0.5 + 0.5) * size.height;
        const next = noGoRects.some((noGo) =>
            px >= noGo.left && px <= noGo.right && py >= noGo.top && py <= noGo.bottom,
        );
        if (next !== blockedRef.current) { blockedRef.current = next; setBlocked(next); }
    });

    return blocked;
}

/**
 * Observa a câmera a cada frame e retorna true quando este label está dentro da silhueta projetada
 * do corpo atual do LabelOccluderContext (com margem). Usado por SceneLabel/ScreenLabel/
 * FocusProtectedHtml para manter o corpo em foco livre de labels sobrepostos.
 */
function useLabelHiddenByFocusRef(
    labelRef: React.RefObject<THREE.Object3D | null>,
    occluder: LabelOccluder,
): boolean {
    const { camera, size } = useThree();
    const [hidden, setHidden] = useState(false);
    const hiddenRef = useRef(false);
    const labelPosition = useRef(new THREE.Vector3());

    const _cameraRight = useRef(new THREE.Vector3());
    const _edge = useRef(new THREE.Vector3());

    useFrame(() => {
        if (!labelRef.current || !occluder) {
            if (hiddenRef.current) {
                hiddenRef.current = false;
                setHidden(false);
            }
            return;
        }

        labelRef.current.getWorldPosition(labelPosition.current);
        const center = occluder.center.clone().project(camera);
        if (center.z < -1 || center.z > 1) {
            if (hiddenRef.current) {
                hiddenRef.current = false;
                setHidden(false);
            }
            return;
        }

        const label = labelPosition.current.clone().project(camera);
        _cameraRight.current.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        const edge = _edge.current.copy(occluder.center).addScaledVector(_cameraRight.current, occluder.radius).project(camera);

        const centerPx = {
            x: (center.x * 0.5 + 0.5) * size.width,
            y: (-center.y * 0.5 + 0.5) * size.height,
        };
        const labelPx = {
            x: (label.x * 0.5 + 0.5) * size.width,
            y: (-label.y * 0.5 + 0.5) * size.height,
        };
        const edgePx = {
            x: (edge.x * 0.5 + 0.5) * size.width,
            y: (-edge.y * 0.5 + 0.5) * size.height,
        };

        const bodyRadiusPx = Math.hypot(edgePx.x - centerPx.x, edgePx.y - centerPx.y);
        const hideRadiusPx = Math.max(LABEL_HIDE_MIN_RADIUS_PX, bodyRadiusPx + LABEL_HIDE_BODY_PADDING_PX);
        const nextHidden = Math.hypot(labelPx.x - centerPx.x, labelPx.y - centerPx.y) < hideRadiusPx;

        if (nextHidden !== hiddenRef.current) {
            hiddenRef.current = nextHidden;
            setHidden(nextHidden);
        }
    });

    return hidden;
}

function useLabelOverlapsSceneObjects(
    labelElementRef: React.RefObject<HTMLElement | null>,
    allowSceneOverlap: boolean,
): boolean {
    const { camera, gl, size } = useThree();
    const occluders = useContext(SceneObjectOccludersContext);
    const [hidden, setHidden] = useState(false);
    const hiddenRef = useRef(false);
    const cameraRight = useRef(new THREE.Vector3());
    const _occluderEdge = useRef(new THREE.Vector3());

    useFrame(() => {
        const element = labelElementRef.current;
        if (allowSceneOverlap || !element || occluders.length === 0) {
            if (hiddenRef.current) {
                hiddenRef.current = false;
                setHidden(false);
            }
            return;
        }

        const canvasRect = gl.domElement.getBoundingClientRect();
        const labelRect = element.getBoundingClientRect();
        if (labelRect.width < 1 || labelRect.height < 1) {
            if (hiddenRef.current) {
                hiddenRef.current = false;
                setHidden(false);
            }
            return;
        }
        cameraRight.current.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        const paddingPx = hiddenRef.current ? LABEL_OBJECT_SHOW_PADDING_PX : LABEL_OBJECT_HIDE_PADDING_PX;

        const nextHidden = occluders.some((occluder) => {
            const center = occluder.center.clone().project(camera);
            if (center.z < -1 || center.z > 1) return false;

            const edge = _occluderEdge.current.copy(occluder.center).addScaledVector(cameraRight.current, occluder.radius).project(camera);
            const centerPx = {
                x: canvasRect.left + (center.x * 0.5 + 0.5) * size.width,
                y: canvasRect.top + (-center.y * 0.5 + 0.5) * size.height,
            };
            const edgePx = {
                x: canvasRect.left + (edge.x * 0.5 + 0.5) * size.width,
                y: canvasRect.top + (-edge.y * 0.5 + 0.5) * size.height,
            };
            const radiusPx = Math.hypot(edgePx.x - centerPx.x, edgePx.y - centerPx.y);
            if (radiusPx < LABEL_OBJECT_MIN_OCCLUDER_RADIUS_PX) return false;
            const nearestX = Math.max(labelRect.left, Math.min(centerPx.x, labelRect.right));
            const nearestY = Math.max(labelRect.top, Math.min(centerPx.y, labelRect.bottom));
            return Math.hypot(centerPx.x - nearestX, centerPx.y - nearestY) < radiusPx + paddingPx;
        });

        if (nextHidden !== hiddenRef.current) {
            hiddenRef.current = nextHidden;
            setHidden(nextHidden);
        }
    });

    return hidden;
}
