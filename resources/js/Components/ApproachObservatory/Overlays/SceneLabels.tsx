import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Pixel thresholds shared by label-layout hooks. Kept here so the label module is self-contained.
 */
const COMPACT_LABEL_THRESHOLD_PX = 92;
const LABEL_HIDE_MIN_RADIUS_PX = 56;
const LABEL_HIDE_BODY_PADDING_PX = 72;

export type LabelOccluder = { center: THREE.Vector3; radius: number } | null;

/**
 * Tells <SceneLabel> / <ScreenLabel> / <FocusProtectedHtml> which 3D body, if any, currently has
 * the camera's full attention. Labels within the occluder's projected silhouette + padding are
 * hidden so the focused body never reads as a cluttered name pile.
 */
export const LabelOccluderContext = createContext<LabelOccluder>(null);

// --------------- Scene label (DOM overlay; always faces the screen) ---------------

/**
 * A 3D-anchored text label rendered as an <Html> overlay. We deliberately avoid drei's <Text>
 * (troika-three-text) because it fetches a default font from a CDN on first paint — the project
 * forbids frontend fetches to third parties. <Html> uses plain DOM/CSS, scales with distance via
 * `distanceFactor`, and always faces the camera for free.
 */
export function SceneLabel({
    position,
    children,
    distanceFactor,
    tier,
    highlighted = false,
    protectFromFocus = true,
    onClick,
    title,
}: {
    position: [number, number, number];
    children: React.ReactNode;
    distanceFactor?: number;
    tier: 'primary' | 'ring';
    highlighted?: boolean;
    protectFromFocus?: boolean;
    onClick?: () => void;
    title?: string;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, protectFromFocus ? focusOccluder : null);
    const cls =
        tier === 'primary'
            ? [
                  'select-none whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold backdrop-blur',
                  highlighted ? 'bg-space-950/90 text-white' : 'bg-space-950/75 text-white/90',
                  onClick ? 'pointer-events-auto cursor-pointer transition hover:bg-space-950 hover:text-white' : 'pointer-events-none',
              ].join(' ')
            : [
                  'select-none whitespace-nowrap rounded-full bg-space-950/60 px-1.5 py-0.5 text-[12px] font-medium text-white/75 backdrop-blur',
                  onClick ? 'pointer-events-auto cursor-pointer transition hover:bg-space-950/85 hover:text-white' : 'pointer-events-none',
              ].join(' ');

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus ? (
                <Html position={[0, 0, 0]} center distanceFactor={distanceFactor} zIndexRange={[7, 0]}>
                    <button
                        type="button"
                        className={cls}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClick?.();
                        }}
                        onPointerEnter={() => { if (onClick) document.body.style.cursor = 'pointer'; }}
                        onPointerLeave={() => { if (onClick) document.body.style.cursor = ''; }}
                        title={title}
                        aria-label={title}
                        disabled={!onClick}
                    >
                        {children}
                    </button>
                </Html>
            ) : null}
        </group>
    );
}

/**
 * A label anchored to a 3D point but with SCREEN-STABLE size — it does NOT shrink when the object
 * is far away (no `distanceFactor`). This is what keeps a distant asteroid's hover/selection label
 * readable: the text stays a fixed CSS size on screen regardless of depth, while still tracking the
 * marker's projected position.
 */
export function ScreenLabel({
    position,
    emphasized = false,
    protectFromFocus = true,
    children,
    onClick,
    title,
}: {
    position: [number, number, number];
    emphasized?: boolean;
    protectFromFocus?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
}) {
    const labelRef = useRef<THREE.Group>(null);
    const focusOccluder = useContext(LabelOccluderContext);
    const hiddenByFocus = useLabelHiddenByFocusRef(labelRef, protectFromFocus ? focusOccluder : null);

    return (
        <group ref={labelRef} position={position}>
            {!hiddenByFocus ? (
                <Html position={[0, 0, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onClick?.();
                        }}
                        onPointerEnter={() => { if (onClick) document.body.style.cursor = 'pointer'; }}
                        onPointerLeave={() => { if (onClick) document.body.style.cursor = ''; }}
                        title={title}
                        aria-label={title}
                        disabled={!onClick}
                        className={[
                            '-translate-y-1/2 whitespace-nowrap rounded-md border bg-space-950/92 px-3 py-2 text-[14px] leading-snug text-white/90 shadow-glow backdrop-blur',
                            emphasized ? 'border-signal-cyan/50' : 'border-white/10',
                            onClick ? 'pointer-events-auto cursor-pointer text-left transition hover:border-signal-cyan/40 hover:bg-space-950' : 'pointer-events-none',
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

    useFrame(() => {
        const d = camera.position.distanceTo(new THREE.Vector3(...anchor));
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
 * Reports true when the projected Moon orbit (1 DL ring) shrinks below COMPACT_LABEL_THRESHOLD_PX
 * on screen — i.e. the user is zoomed out far enough that the long primary labels would crowd the
 * Earth-Moon neighbourhood. Labels switch to their compact form when this returns true.
 */
export function useCompactLabelMode(): boolean {
    const { camera, size } = useThree();
    const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
    const [compact, setCompact] = useState(false);
    const compactRef = useRef(false);

    useFrame(() => {
        const target = controls?.target ?? new THREE.Vector3(0, 0, 0);
        const center = target.clone().project(camera);
        const oneDl = target.clone().add(new THREE.Vector3(1, 0, 0)).project(camera);
        const lunarRadiusPx = Math.hypot(
            (oneDl.x - center.x) * size.width * 0.5,
            (oneDl.y - center.y) * size.height * 0.5,
        );
        const next = lunarRadiusPx < COMPACT_LABEL_THRESHOLD_PX;
        if (next !== compactRef.current) {
            compactRef.current = next;
            setCompact(next);
        }
    });

    return compact;
}

/**
 * Watches the camera each frame and returns true when this label sits inside the projected
 * silhouette of the current LabelOccluderContext body (with padding). Used by SceneLabel/
 * ScreenLabel/FocusProtectedHtml to keep the focused body free of overlapping label clutter.
 */
function useLabelHiddenByFocusRef(
    labelRef: React.RefObject<THREE.Object3D | null>,
    occluder: LabelOccluder,
): boolean {
    const { camera, size } = useThree();
    const [hidden, setHidden] = useState(false);
    const hiddenRef = useRef(false);
    const labelPosition = useRef(new THREE.Vector3());

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
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        const edge = occluder.center.clone().add(cameraRight.multiplyScalar(occluder.radius)).project(camera);

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
