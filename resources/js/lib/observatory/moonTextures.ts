/**
 * Procedural Moon bump map. Touches the DOM (offscreen canvas) so it cannot be unit-tested without
 * a JSDOM environment — kept here so the rest of the observatory pure helpers stay node-runnable.
 */

import * as THREE from 'three';

/** Deterministic PRNG (mulberry32). Seeded so the crater field is stable across reloads. */
export function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t = (t + 0x6d2b79f5) >>> 0;
        let r = t;
        r = Math.imul(r ^ (r >>> 15), r | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Builds a greyscale bump texture (equirectangular ratio) with a sparse cloud of soft circular
 * lows simulating crater relief. The base grey + radial gradients give an even mean luminance so
 * the bump material doesn't bias the surface darker overall.
 */
export function buildMoonBump(size: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rng = mulberry32(0xd4e5f6);
    for (let i = 0; i < 320; i += 1) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const r = 3 + rng() * 18;
        const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(40,40,40,0.6)');
        grad.addColorStop(0.7, 'rgba(180,180,180,0.4)');
        grad.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}
