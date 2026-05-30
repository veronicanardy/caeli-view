import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { buildHeliocentricOrbit, helioAUToSunCenteredScene, ORBIT_AU_SCALE, SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { heliocentricPositionAU } from '@/lib/keplerOrbit';
import { currentPositionInScene } from '@/lib/observatory/trajectorySampling';

export const CAMERA_FOV_DEG = 42;
export const MAX_CAMERA_DISTANCE = ORBIT_AU_SCALE * 40;

export const CAMERA_VIEWS = {
    perspective: new THREE.Vector3(0, 4.5, 9),
    top: new THREE.Vector3(0, 16, 0.001),
    side: new THREE.Vector3(16, 0.6, 0.001),
} as const;
export type CameraViewKey = keyof typeof CAMERA_VIEWS;
/**
 * Monta um enquadramento de câmera centrado em um corpo celeste (Terra ou Lua) na posição de
 * cena `center` com raio visual `radius`. Usado pelo atalho de clique na Terra/Lua. Recua ao
 * longo de um ângulo 3/4 suave longe o suficiente para ver o corpo confortavelmente sem cortá-lo.
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
 * Zoom inercial em direção ao foco atual. Substitui o zoom de roda do OrbitControls (desabilitado)
 * para que o dolly tenha momentum: cada clique da roda adiciona a uma velocidade que decai
 * exponencialmente — a câmera continua deslizando um momento após parar de rolar.
 *
 * Direção: o dolly sempre se move ao longo do raio câmera → alvo do OrbitControls. Por padrão
 * esse alvo é a Terra (origem da cena), então o zoom vai em direção à Terra. Quando o usuário
 * seleciona a Lua ou um asteroide, o CameraRig move o alvo para aquele corpo — o zoom passa
 * a apontar para ele automaticamente, sem precisar mirar o cursor. Distância limitada a [min, max].
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

        const target = controls?.target ?? new THREE.Vector3();

        // Dolly ao longo do raio câmera → alvo. Passo exponencial para sensação uniforme em
        // qualquer escala (um clique amplia a mesma % independente de estar perto ou longe).
        const toTarget = camera.position.clone().sub(target);
        const dist = toTarget.length();
        const newDist = THREE.MathUtils.clamp(dist * Math.exp(velocity.current), minDistance, maxDistance);
        if (dist > 1e-6) {
            camera.position.copy(target).add(toTarget.multiplyScalar(newDist / dist));
        }
        controls?.update();

        // Decaimento exponencial → o "deslize". Menor = desliza mais tempo.
        velocity.current *= 0.82;
    });

    return null;
}

/**
 * Desloca suavemente o target do OrbitControls da Terra (origem) para o Sol conforme o usuário
 * faz zoom out. Resolve o problema de rotação excêntrica ao visualizar planetas externos: em zoom
 * próximo a câmera orbita a Terra naturalmente; em zoom distante, passa a orbitar o Sol.
 *
 * Limites:
 * - Abaixo de NEAR_THRESHOLD: target fixo na Terra (0,0,0) — comportamento atual intacto.
 * - Acima de FAR_THRESHOLD: target no Sol (sunScenePosition) — rotação centrada no sistema solar.
 * - Entre os dois: interpolação suave pelo t = smoothstep(dist, near, far).
 *
 * Não interfere com tweens do CameraRig nem com o zoom do InertialZoom: só lê a distância
 * câmera→target e move o target — nunca a posição da câmera.
 *
 * sunScenePosition deve ser a posição atual do Sol na cena (atualizada pela efeméride).
 * Quando null (efeméride ainda resolvendo), o drift não age e o target permanece na Terra.
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

        if (t <= 0) return; // dentro do limiar próximo — não toca no target

        const desired = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(...earthPos),
            sunPos.current,
            t,
        );

        // Lerp suave para não saltar se sunPos acabou de atualizar
        controls.target.lerp(desired, 0.04);
        controls.update();
    });

    return null;
}

/**
 * Controla a câmera APENAS durante uma transição explícita (clique em atalho de visão ou foco
 * em objeto/corpo). Fora de uma transição não faz nada, então o OrbitControls é o dono completo
 * da câmera — sem conflito em pequenos arrastos.
 *
 * Uma transição começa quando `viewNonce`/`focusNonce`/`focusTarget` mudam. Termina quando a
 * câmera chega perto do destino OU o usuário toca os controles (evento 'start' do OrbitControls).
 * Isso corrige o efeito de "volta ao lugar quando empurro um pouco".
 */
export function CameraRig({
    view,
    viewNonce,
    focusTarget,
    focusNonce,
    earthPos,
}: {
    view: CameraViewKey;
    viewNonce: number;
    focusTarget: FocusFraming | null;
    focusNonce: number;
    earthPos: [number, number, number];
}) {
    const controls = useThree((s) => s.controls) as unknown as
        | { target: THREE.Vector3; update: () => void; addEventListener: (t: string, fn: () => void) => void; removeEventListener: (t: string, fn: () => void) => void }
        | null;

    // earthPos é lido via ref para não disparar tween a cada atualização de efeméride (10s).
    const earthPosRef = useRef(earthPos);
    useEffect(() => { earthPosRef.current = earthPos; }, [earthPos]);

    // Posição e alvo desejados da câmera para a transição atual.
    // Views predefinidas são offsets relativos à Terra — somamos earthPos para que Reset/Superior/Lateral
    // continuem centrados na Terra independente de onde ela esteja na órbita heliocêntrica.
    const desired = useMemo(() => {
        if (focusTarget) return { position: focusTarget.position.clone(), target: focusTarget.target.clone() };
        const earth = new THREE.Vector3(...earthPosRef.current);
        return { position: earth.clone().add(CAMERA_VIEWS[view]), target: earth };
        // earthPos é lido via ref — intencionalmente fora das dependências para não reiniciar tweens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, focusTarget, focusNonce]);

    const tweening = useRef(false);
    useEffect(() => {
        tweening.current = true; // a new intent → start steering
    }, [desired]);

    // Qualquer interação do usuário cancela o tween imediatamente e devolve o controle.
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

        // Chegou perto o suficiente → para de conduzir e libera a câmera para o usuário.
        const posClose = camera.position.distanceToSquared(desired.position) < 1e-4;
        const tgtClose = !controls?.target || controls.target.distanceToSquared(desired.target) < 1e-4;
        if (posClose && tgtClose) tweening.current = false;
    });

    return null;
}

/**
 * Enquadramento de câmera para um asteroide selecionado.
 *   - orbitMode = false: close-up geocêntrico na rocha — cena de radar (escala logarítmica) ativa.
 *   - orbitMode = true: enquadra a órbita Kepleriana completa ao redor do Sol na cena HELIOCÊNTRICA
 *     (Sol na origem, escala linear em UA). A esfera limitante cobre a elipse orbital, o Sol,
 *     a posição heliocêntrica da Terra (se conhecida) e a posição propagada do asteroide.
 */
export function computeFocusFraming(
    object: ClosestNowObject,
    orbitMode = false,
    earthHelioPositionAU: { x: number; y: number; z: number } | null = null,
    earthScenePosition: [number, number, number] = [0, 0, 0],
): FocusFraming | null {
    if (orbitMode && object.trajectory?.orbitalElements) {
        const elements = object.trajectory.orbitalElements;
        const orbitPoints = buildHeliocentricOrbit(elements, 256);
        if (orbitPoints) {
            const box = new THREE.Box3();
            for (let i = 0; i < orbitPoints.length; i += 3) {
                box.expandByPoint(new THREE.Vector3(orbitPoints[i], orbitPoints[i + 1], orbitPoints[i + 2]));
            }

            // Sol (origem) e Terra (~1 UA) são âncoras de cena na camada heliocêntrica.
            box.expandByPoint(new THREE.Vector3(0, 0, 0));
            if (earthHelioPositionAU) {
                const earth = helioAUToSunCenteredScene(earthHelioPositionAU);
                box.expandByPoint(new THREE.Vector3(earth[0], earth[1], earth[2]));
            }
            // Posição atual do asteroide — por construção está sobre a elipse, mas inclui
            // explicitamente para que o enquadramento nunca o perca sob elementos degenerados.
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

        // Elementos rejeitados pelo construtor de órbita. Cai para o close-up para mostrar algo.
    }

    // Close-up geocêntrico na rocha. Posição geocêntrica log-comprimida + offset da Terra.
    const current = currentPositionInScene(object);
    if (!current) return null;
    const earth = new THREE.Vector3(...earthScenePosition);
    const target = earth.clone().add(new THREE.Vector3(...current));
    const distance = 2.1;
    const dir = new THREE.Vector3(0.5, 0.45, 0.74).normalize();
    const position = target.clone().add(dir.multiplyScalar(distance));
    return { target, position };
}
