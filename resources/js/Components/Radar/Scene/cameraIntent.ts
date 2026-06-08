/**
 * Contrato de intenção de câmera.
 *
 * Responsabilidade: representar pedidos de preset, objeto e corpo com nonce para
 * permitir refocar o mesmo alvo sem depender de mudanças de identidade.
 */

import type { CameraViewKey } from './cameraConstants';

/**
 * Representa a intenção corrente da câmera e permite refocar o mesmo alvo por nonce.
 */
export type CameraIntent =
    | { kind: 'preset'; view: CameraViewKey; nonce: number }
    | { kind: 'object'; view: CameraViewKey; nonce: number }
    | { kind: 'body'; view: CameraViewKey; body: 'earth' | 'moon'; nonce: number };

export function nextCameraNonce(intent: CameraIntent): number {
    return intent.nonce + 1;
}
