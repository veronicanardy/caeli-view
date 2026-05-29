import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { buildHeliocentricOrbit, helioAUToSunCenteredScene, ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { currentPositionInScene } from '@/lib/observatory/trajectorySampling';

export const CAMERA_FOV_DEG = 42;
export const MAX_CAMERA_DISTANCE = ORBIT_AU_SCALE * 12;

export const CAMERA_VIEWS = {
    perspective: new THREE.Vector3(0, 4.5, 9),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;
export type CameraViewKey = keyof typeof CAMERA_VIEWS;
/**
 * Builds a camera framing centered on a single body (Earth or Moon) at scene position `center`
 * with visual radius `radius`. Used for the "click Earth/Moon" view shortcut. Backs off along a
 * gentle 3/4 angle far enough to see the body comfortably without clipping it.
 */
export function framingForBody(center: THREE.Vector3, radius: number): FocusFraming {
    const dir = new THREE.Vector3(0.4, 0.45, 0.8).normalize();
    const distance = Math.max(radius * 20, 0.2);
    return { target: center.clone(), position: center.clone().add(dir.multiplyScalar(distance)) };
}

export function framingForOverview(): FocusFraming {
    return { target: new THREE.Vector3(0, 0, 0), position: CAMERA_VIEWS.perspective.clone() };
}

// --------------- Camera ---------------

export type FocusFraming = {
    /** Where the camera should look. */
    target: THREE.Vector3;
    /** Where the camera should sit. */
    position: THREE.Vector3;
};

/**
 * Inertial zoom toward the current focus. Replaces OrbitControls' built-in wheel zoom (disabled
 * above) so the dolly has momentum: each wheel notch adds to a velocity that decays exponentially,
 * so the camera keeps gliding a moment after you stop scrolling, and easing back out gives a
 * little push too. In a big 3D volume that coasting makes traversal feel less twitchy.
 *
 * Direction: the dolly always moves along the camera → OrbitControls-target ray. By default that
 * target is Earth (the scene origin), so zoom heads toward Earth. When the user selects the Moon
 * or an asteroid, CameraRig moves the target onto that body, so the zoom then heads toward it —
 * exactly the requested behavior, with no cursor aiming. Distance is clamped to [min, max].
 */
export function InertialZoom({ minDistance, maxDistance }: { minDistance: number; maxDistance: number }) {
    const { camera } = useThree();
    const gl = useThree((s) => s.gl);
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; dispatchEvent?: (e: { type: string }) => void }
        | null;

    // Accumulated zoom velocity in "log-distance" units (negative = zooming in).
    const velocity = useRef(0);

    useEffect(() => {
        const el = gl.domElement;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault(); // don't scroll the page while zooming the scene

            // Treat a scroll as user interaction so CameraRig (which listens for 'start') hands
            // control back mid-transition instead of fighting the dolly.
            controls?.dispatchEvent?.({ type: 'start' });

            // deltaY is ~±100 per notch; scale into a gentle per-notch velocity bump. Normalizing
            // by line/page delta modes keeps trackpads and mice comparable.
            const rect = el.getBoundingClientRect();
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
            velocity.current += (event.deltaY * unit) * 0.00018;
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [gl, controls]);

    useFrame(() => {
        if (Math.abs(velocity.current) < 1e-4) {
            velocity.current = 0;
            return;
        }

        const target = controls?.target ?? new THREE.Vector3();

        // Dolly straight along the camera → target ray. Exponential step so the feel is uniform at
        // any scale (a notch zooms by the same %, whether you're close or far).
        const toTarget = camera.position.clone().sub(target);
        const dist = toTarget.length();
        const newDist = THREE.MathUtils.clamp(dist * Math.exp(velocity.current), minDistance, maxDistance);
        if (dist > 1e-6) {
            camera.position.copy(target).add(toTarget.multiplyScalar(newDist / dist));
        }
        controls?.update();

        // Exponential decay → the "coast". Lower = glides longer.
        velocity.current *= 0.82;
    });

    return null;
}

/**
 * Drives the camera ONLY during an explicit transition (a view-shortcut click or an object/body
 * focus). Outside a transition it does nothing, so OrbitControls owns the camera completely and
 * there's zero fighting on small drags.
 *
 * A transition starts when `viewNonce`/`focusNonce`/`focusTarget` change. It ends when either the
 * camera arrives near the goal OR the user grabs the controls (the OrbitControls 'start' event).
 * That's what fixes the "it snaps back when I nudge it" feeling.
 */
export function CameraRig({
    view,
    viewNonce,
    focusTarget,
    focusNonce,
}: {
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    focusNonce: number;
}) {
    // OrbitControls registers itself here via `makeDefault`. Typed loosely because R3F's default
    // `controls` slot is intentionally untyped (it can host any controls implementation).
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; addEventListener: (t: string, fn: () => void) => void; removeEventListener: (t: string, fn: () => void) => void }
        | null;

    // Desired camera position + look target for the current transition.
    const desired = useMemo(() => {
        if (focusTarget) return { position: focusTarget.position.clone(), target: focusTarget.target.clone() };
        return { position: CAMERA_VIEWS[view].clone(), target: new THREE.Vector3(0, 0, 0) };
        // nonces participate so re-issuing the same intent restarts the tween.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, focusTarget, focusNonce]);

    const tweening = useRef(false);
    useEffect(() => {
        tweening.current = true; // a new intent → start steering
    }, [desired]);

    // Any user interaction immediately cancels the tween and hands control back.
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

        // Arrived close enough → stop steering and release the camera to the user.
        const posClose = camera.position.distanceToSquared(desired.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(desired.target) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}

/**
 * Camera framing for a selected asteroid.
 *   - orbitMode = false: a CLOSE-UP on the geocentric rock — the radar (log) scene is in play.
 *   - orbitMode = true: frame the object's full Kepler orbit around the Sun in the HELIOCENTRIC
 *     scene (Sun at origin, linear AU). The bounding sphere covers the orbit ellipse, the Sun,
 *     Earth's heliocentric position (if known), and the asteroid's propagated position.
 */
export function computeFocusFraming(
    object: ClosestNowObject,
    orbitMode = false,
    earthHelioPositionAU: { x: number; y: number; z: number } | null = null,
): FocusFraming | null {
    if (orbitMode && object.trajectory?.orbitalElements) {
        const elements = object.trajectory.orbitalElements;
        const orbitPoints = buildHeliocentricOrbit(elements, 256);
        if (orbitPoints) {
            const box = new THREE.Box3();
            for (let i = 0; i < orbitPoints.length; i += 3) {
                box.expandByPoint(new THREE.Vector3(orbitPoints[i], orbitPoints[i + 1], orbitPoints[i + 2]));
            }

            // Sun (origin) and Earth (~1 AU on its orbit) are scene anchors in the heliocentric layer.
            box.expandByPoint(new THREE.Vector3(0, 0, 0));
            if (earthHelioPositionAU) {
                const earth = helioAUToSunCenteredScene(earthHelioPositionAU);
                box.expandByPoint(new THREE.Vector3(earth[0], earth[1], earth[2]));
            }
            // Asteroid current position — by construction it sits on the ellipse, but include it
            // explicitly so the framing never misses it under degenerate elements.
            const asteroidHelio = heliocentricPositionAU(elements, new Date());
            if (asteroidHelio) {
                const a = helioAUToSunCenteredScene(asteroidHelio);
                box.expandByPoint(new THREE.Vector3(a[0], a[1], a[2]));
            }

            const sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV_DEG);
            const distance = THREE.MathUtils.clamp(
                (sphere.radius / Math.sin(fovRad * 0.5)) * 1.12,
                ORBIT_AU_SCALE * 1.2,
                MAX_CAMERA_DISTANCE,
            );
            const dir = new THREE.Vector3(0.32, 0.72, 0.62).normalize();
            return { target: sphere.center, position: sphere.center.clone().add(dir.multiplyScalar(distance)) };
        }

        // Elements rejected the orbit builder. Fall through to the close-up so something is shown.
    }

    // Geocentric close-up on the rock. The radar (log) scene is in play, so we use the same
    // log-compressed position the marker uses.
    const current = currentPositionInScene(object);
    if (!current) return null;
    const target = new THREE.Vector3(...current);
    const distance = 2.1;
    const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
    const position = target.clone().add(dir.multiplyScalar(distance));
    return { target, position };
}
