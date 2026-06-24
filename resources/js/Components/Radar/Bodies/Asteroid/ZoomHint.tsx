/**
 * Responsabilidade: rastrear a posição 3D do asteroide selecionado e publicar
 * coordenadas de tela no ZoomHintContext para que o overlay fora do Canvas
 * renderize o botão sem conflitar com o reconciliador R3F.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_FOV_DEG } from '../../Scene/cameraConstants';
import { framingForTrajectorySegment } from '../../Scene/cameraFraming';
import { useCameraTween } from '../../Scene/CameraTweenContext';
import { useZoomHintSetter } from './ZoomHintContext';

// Só mostra a lupa se a câmera está nessa faixa de distância. SHOW_MIN fica logo abaixo do piso do
// close-up colado (CLOSEUP_MIN=0.08 ≈ ROCK_MIN_DISTANCE) para a lupa aparecer na rocha pequena, presa
// no piso; SHOW_MAX cobre o teto do close-up (CLOSEUP_MAX=0.36, onde Ceres para) mais folga de zoom out
// manual antes de a lupa sumir. A margem de 0.95 sobre o piso absorve o epsilon de ponto flutuante.
const SHOW_MIN = 0.08 * 0.95;
const SHOW_MAX = 0.36 * 2.2;
// Some temporariamente quando a câmera está se movendo.
const MOVE_THRESHOLD_SQ = 0.000009; // ~0.003 de deslocamento por frame

type ZoomHintProps = {
    /** Posição world absoluta do asteroide (earthPos + posição relativa). */
    worldPosition: THREE.Vector3;
    /** Trecho absoluto da trajetória (até −72h) que o zoom out deve enquadrar. */
    zoomFramePoints: THREE.Vector3[];
    panelBiasX: number;
    panelBiasY: number;
};

const _projected = new THREE.Vector3();
const _prevCamPos = new THREE.Vector3();
// Alvo de fallback quando os controls ainda não montaram — evita alocar Vector3 por frame.
const _fallbackTarget = new THREE.Vector3();

export function ZoomHint({ worldPosition, zoomFramePoints, panelBiasX, panelBiasY }: ZoomHintProps) {
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
    const gl = useThree((s) => s.gl);
    const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
    const setState = useZoomHintSetter();
    const tweenTo = useCameraTween();

    const prevInitialised = useRef(false);
    const lastVisible = useRef(false);
    const lastX = useRef(0);
    const lastY = useRef(0);

    const cameraRef = useRef(camera);
    const controlsRef = useRef(controls);
    const tweenToRef = useRef(tweenTo);
    const worldPositionRef = useRef(worldPosition);
    const zoomFramePointsRef = useRef(zoomFramePoints);
    const panelBiasRef = useRef({ x: panelBiasX, y: panelBiasY });
    useEffect(() => { cameraRef.current = camera; }, [camera]);
    useEffect(() => { controlsRef.current = controls; }, [controls]);
    useEffect(() => { tweenToRef.current = tweenTo; }, [tweenTo]);
    useEffect(() => { worldPositionRef.current = worldPosition; }, [worldPosition]);
    useEffect(() => { zoomFramePointsRef.current = zoomFramePoints; }, [zoomFramePoints]);
    useEffect(() => { panelBiasRef.current = { x: panelBiasX, y: panelBiasY }; }, [panelBiasX, panelBiasY]);

    const handleZoomOut = useCallback(() => {
        const cam = cameraRef.current;
        const perspective = cam instanceof THREE.PerspectiveCamera ? cam : null;
        // Enquadra o trecho seta→−72h na área visível (descontando painéis abertos).
        const framing = framingForTrajectorySegment({
            points: zoomFramePointsRef.current,
            rockPosition: worldPositionRef.current,
            currentCameraPosition: cam.position,
            fovDeg: perspective?.fov ?? CAMERA_FOV_DEG,
            aspect: perspective?.aspect ?? 1,
            visibleWidthFraction: 1 - panelBiasRef.current.x,
            visibleHeightFraction: 1 - panelBiasRef.current.y,
        });
        tweenToRef.current(framing.position, framing.target);
    }, []);

    useEffect(() => () => setState(null), [setState]);

    // Cache do retângulo do canvas: getBoundingClientRect() por frame força reflow de layout.
    // O retângulo só muda em resize/scroll, então é medido nesses eventos e lido do ref no loop.
    const canvasRectRef = useRef<{ left: number; top: number } | null>(null);
    useEffect(() => {
        const el = gl.domElement;
        const measure = () => {
            const rect = el.getBoundingClientRect();
            canvasRectRef.current = { left: rect.left, top: rect.top };
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [gl, size]);

    useFrame(() => {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        const target = ctrl?.target ?? _fallbackTarget;

        const moving = prevInitialised.current &&
            cam.position.distanceToSquared(_prevCamPos) > MOVE_THRESHOLD_SQ;
        if (!prevInitialised.current) prevInitialised.current = true;
        _prevCamPos.copy(cam.position);

        const dist = cam.position.distanceTo(target);
        const show = !moving && dist >= SHOW_MIN && dist <= SHOW_MAX;

        if (!show) {
            if (lastVisible.current) {
                lastVisible.current = false;
                setState({ visible: false, x: lastX.current, y: lastY.current, onZoomOut: handleZoomOut });
            }
            return;
        }

        _projected.copy(worldPositionRef.current).project(cam);

        const canvasRect = canvasRectRef.current;
        if (!canvasRect) return;
        const x = canvasRect.left + (_projected.x * 0.5 + 0.5) * size.width;
        const y = canvasRect.top + (-_projected.y * 0.5 + 0.5) * size.height;

        const dx = Math.abs(x - lastX.current);
        const dy = Math.abs(y - lastY.current);
        if (lastVisible.current && dx < 1 && dy < 1) return;

        lastVisible.current = true;
        lastX.current = x;
        lastY.current = y;

        setState({ visible: true, x, y, onZoomOut: handleZoomOut });
    });

    return null;
}
