/**
 * Zoom inercial da cena 3D.
 *
 * Responsabilidade: substituir o zoom nativo do OrbitControls por um dolly suave,
 * preservando limites de distância e avisando o rig quando o usuário retomou o
 * controle. Não altera seleção nem enquadramento global.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';

// Buffers reutilizáveis do loop de zoom — alocar Vector3 por frame gera pressão de GC.
const _zoomFallbackTarget = new THREE.Vector3();
const _zoomToTarget = new THREE.Vector3();

/**
 * Zoom inercial e ajustes opcionais do alvo orbital dos controles da cena.
 */
export function InertialZoom({ minDistance, maxDistance }: { minDistance: number; maxDistance: number }) {
    const { camera } = useThree();
    const gl = useThree((s) => s.gl);
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; dispatchEvent?: (e: { type: string }) => void }
        | null;

    // Velocidade de zoom acumulada em unidades de log-distância (negativo = aproximando).
    const velocity = useRef(0);

    useEffect(() => {
        const el = gl.domElement;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault(); // impede scroll da página durante zoom na cena

            // Tratar scroll como interação do usuário para que o CameraRig (que escuta 'start')
            // devolva o controle durante uma transição em andamento, evitando conflito com o dolly.
            controls?.dispatchEvent?.({ type: 'start' });

            // deltaY é ~±100 por clique; escala para um incremento suave de velocidade por clique.
            // Normalizar pelo modo de delta (linha/página) mantém trackpads e mouses comparáveis.
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

        const target = controls?.target ?? _zoomFallbackTarget;

        // Dolly ao longo do raio câmera → alvo. Passo exponencial para sensação uniforme em
        // qualquer escala (um clique amplia a mesma % independente de estar perto ou longe).
        const toTarget = _zoomToTarget.copy(camera.position).sub(target);
        const dist = toTarget.length();
        const newDist = THREE.MathUtils.clamp(dist * Math.exp(velocity.current), minDistance, maxDistance);
        if (dist > 1e-6) {
            camera.position.copy(target).add(toTarget.multiplyScalar(newDist / dist));
        }
        controls?.update();

        // Decaimento exponencial: menor = desliza mais tempo.
        velocity.current *= 0.82;
    });

    return null;
}

/**
 * Ponto de extensão para deslocar suavemente o target do OrbitControls da Terra para o Sol
 * conforme o usuário faz zoom out. Não está conectado hoje, mas fica preservado para reativação
 * futura sem misturar essa responsabilidade ao CameraRig.
 */
const DRIFT_NEAR_THRESHOLD = SUN_DISPLAY_DL * 1.5;   // ~50 units: começa o drift
const DRIFT_FAR_THRESHOLD  = SUN_DISPLAY_DL * 5.0;   // ~165 units: drift completo

export function OrbitTargetDrift({ sunScenePosition, earthPos, locked }: { sunScenePosition: [number, number, number] | null; earthPos: [number, number, number]; locked: boolean }) {
    const { camera } = useThree();
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void }
        | null;

    const sunPos = useRef(new THREE.Vector3());
    useEffect(() => {
        if (sunScenePosition) sunPos.current.set(...sunScenePosition);
    }, [sunScenePosition]);

    useFrame(() => {
        if (!controls || !sunScenePosition || locked) return;

        const dist = camera.position.distanceTo(controls.target);
        const t = THREE.MathUtils.smoothstep(dist, DRIFT_NEAR_THRESHOLD, DRIFT_FAR_THRESHOLD);

        if (t <= 0) return; // dentro do limiar próximo, não toca no target

        const desired = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(...earthPos),
            sunPos.current,
            t,
        );

        // Lerp suave para não saltar se sunPos acabou de atualizar.
        controls.target.lerp(desired, 0.04);
        controls.update();
    });

    return null;
}
