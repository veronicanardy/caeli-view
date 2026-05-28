import type { CameraViewKey } from './CameraRig';

export type CameraIntent =
    | { kind: 'preset'; view: CameraViewKey; nonce: number }
    | { kind: 'object'; view: CameraViewKey; nonce: number }
    | { kind: 'body'; view: CameraViewKey; body: 'earth' | 'moon'; nonce: number };

export function nextCameraNonce(intent: CameraIntent): number {
    return intent.nonce + 1;
}
