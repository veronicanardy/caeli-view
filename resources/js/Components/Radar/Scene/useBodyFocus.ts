/**
 * Hook de foco local em Terra e Lua.
 *
 * Responsabilidade: transformar intenções de câmera para corpos em enquadramento
 * local, limpar o foco quando seleção ou preset tomam precedência e expor o foco
 * ativo para o compositor da cena.
 */

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/radar/bodyScale';
import { framingForBody } from './cameraFraming';
import type { FocusFraming } from './cameraFraming';
import type { CameraIntent } from './cameraIntent';
import type { BodyFocus } from './sceneFocus';
import type { SceneVector } from './scenePositions';

type UseBodyFocusArgs = {
    cameraIntent: CameraIntent;
    focusTarget: FocusFraming | null;
    earthPos: SceneVector;
    moonPos: SceneVector;
    /** Vetor Terra→Sol unitário — usado para enquadrar a Terra pelo lado iluminado. */
    sunDir?: [number, number, number];
};

type UseBodyFocusResult = {
    bodyFocus: BodyFocus | null;
    activeFocus: FocusFraming | null;
    focusNonce: number;
};

export function useBodyFocus({
    cameraIntent,
    focusTarget,
    earthPos,
    moonPos,
    sunDir,
}: UseBodyFocusArgs): UseBodyFocusResult {
    const [bodyFocus, setBodyFocus] = useState<BodyFocus | null>(null);

    useEffect(() => {
        if (cameraIntent.kind !== 'body') return;

        const body = cameraIntent.body;
        const center = body === 'earth'
            ? new THREE.Vector3(...earthPos)
            : new THREE.Vector3(...moonPos);
        const radius = body === 'earth' ? EARTH_RADIUS_DL : MOON_RADIUS_DL;

        // Ao focar a Terra, câmera fica do lado iluminado (sunDir = Terra→Sol).
        // Ao focar a Lua, câmera fica do lado voltado para a Terra (moonToEarth).
        // Leve elevação em Y evita enquadramento raso no plano eclíptico.
        let preferredDir: THREE.Vector3 | undefined;
        if (body === 'earth' && sunDir) {
            preferredDir = new THREE.Vector3(...sunDir).add(new THREE.Vector3(0, 0.35, 0)).normalize();
        } else if (body === 'moon') {
            const moonToEarth = new THREE.Vector3(...earthPos).sub(new THREE.Vector3(...moonPos));
            if (moonToEarth.lengthSq() > 0) {
                preferredDir = moonToEarth.normalize().add(new THREE.Vector3(0, 0.25, 0)).normalize();
            }
        }

        setBodyFocus({
            body,
            framing: framingForBody(center, radius, preferredDir),
            nonce: cameraIntent.nonce,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraIntent.kind === 'body' ? cameraIntent.nonce : -1]);

    useEffect(() => {
        if (focusTarget) setBodyFocus(null);
    }, [focusTarget]);

    useEffect(() => {
        if (cameraIntent.kind !== 'preset') return;
        setBodyFocus(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraIntent.kind === 'preset' ? cameraIntent.nonce : -1]);

    return {
        bodyFocus,
        activeFocus: focusTarget ?? bodyFocus?.framing ?? null,
        focusNonce: focusTarget ? cameraIntent.nonce : bodyFocus?.nonce ?? 0,
    };
}
