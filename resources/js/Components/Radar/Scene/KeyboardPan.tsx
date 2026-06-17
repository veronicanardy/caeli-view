/**
 * Navegação por teclado na cena radar.
 *
 * Responsabilidade: capturar WASD e setas e converter em pan suave da câmera,
 * sem interferir com intenções explícitas de foco ou tweens do CameraRig.
 *
 * Velocidade de pan é proporcional à distância câmera-alvo para que a navegação
 * seja rápida no overview e precisa no close-up.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_CAMERA_DISTANCE } from '@/Components/Radar/Scene/cameraConstants';

const PAN_SPEED = 0.9;
const KEYS: Record<string, [number, number]> = {
    ArrowLeft:  [-1,  0],
    ArrowRight: [ 1,  0],
    ArrowUp:    [ 0,  1],
    ArrowDown:  [ 0, -1],
    a:          [-1,  0],
    A:          [-1,  0],
    d:          [ 1,  0],
    D:          [ 1,  0],
    w:          [ 0,  1],
    W:          [ 0,  1],
    s:          [ 0, -1],
    S:          [ 0, -1],
};

type Controls = { target: THREE.Vector3; enabled: boolean; update: () => void };

export function KeyboardPan() {
    const { camera } = useThree();
    const controls = useThree((s) => s.controls) as unknown as Controls | null;
    const pressed = useRef<Set<string>>(new Set());
    const right = useRef(new THREE.Vector3());
    const up = useRef(new THREE.Vector3());
    const delta = useRef(new THREE.Vector3());

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            // Ignora se o foco está num input/textarea para não bloquear digitação.
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (KEYS[e.key]) { e.preventDefault(); pressed.current.add(e.key); }
        };
        const onUp = (e: KeyboardEvent) => pressed.current.delete(e.key);
        const onBlur = () => pressed.current.clear();
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);

    useFrame((_, dt) => {
        // Câmera em voo (controls desabilitados): navegação ininterrupta, ignora o teclado.
        if (!controls || !controls.enabled || pressed.current.size === 0) return;

        let dx = 0;
        let dy = 0;
        for (const key of pressed.current) {
            const dir = KEYS[key];
            if (dir) { dx += dir[0]; dy += dir[1]; }
        }
        if (dx === 0 && dy === 0) return;

        // Velocidade proporcional à distância câmera-alvo.
        const distance = camera.position.distanceTo(controls.target);
        const speed = distance * PAN_SPEED * dt;

        // right: eixo horizontal da câmera no plano XZ.
        right.current.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
        // forward: direção que a câmera aponta projetada no plano XZ (sem componente Y).
        up.current.setFromMatrixColumn(camera.matrixWorld, 2).setY(0).normalize().negate();

        delta.current
            .set(0, 0, 0)
            .addScaledVector(right.current, dx * speed)
            .addScaledVector(up.current, dy * speed);

        camera.position.add(delta.current);
        controls.target.add(delta.current);

        // Impede pan infinito: se o target saiu da esfera da cena, recua ambos.
        const excess = controls.target.length() - MAX_CAMERA_DISTANCE;
        if (excess > 0) {
            const correction = controls.target.clone().normalize().multiplyScalar(excess);
            controls.target.sub(correction);
            camera.position.sub(correction);
        }

        controls.update();
    });

    return null;
}
