import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { mulberry32 } from '@/lib/observatory/moonTextures';

/**
 * Categorias visuais usadas pela geração procedural de asteroides.
 */
export type GenericAsteroidVariant = 'tiny' | 'small' | 'medium' | 'large' | 'unknown';

/**
 * Escolhe uma variante procedural com base no tamanho estimado do asteroide.
 */
export function genericAsteroidVariantFor(object: ClosestNowObject): GenericAsteroidVariant {
    const diameter = asteroidDiameterMeters(object);

    if (diameter === null) return 'unknown';
    if (diameter < 40) return 'tiny';
    if (diameter < 150) return 'small';
    if (diameter < 600) return 'medium';

    return 'large';
}

/**
 * Retorna a melhor estimativa de diâmetro disponível em metros.
 */
function asteroidDiameterMeters(object: ClosestNowObject): number | null {
    const direct = object.approach.diameterMeters;

    if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
        return direct;
    }

    const min = object.approach.estimatedDiameterMinMeters;
    const max = object.approach.estimatedDiameterMaxMeters;

    if (
        typeof min === 'number' &&
        typeof max === 'number' &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min > 0 &&
        max > 0
    ) {
        return (min + max) / 2;
    }

    return null;
}

/**
 * Constrói uma geometria procedural de asteroide a partir de uma semente.
 *
 * A forma é estável para a mesma seed e varia entre as variantes visuais.
 */
export function buildAsteroidGeometry(
    seed: string,
    variant: GenericAsteroidVariant = 'unknown',
): THREE.IcosahedronGeometry {
    const profile = genericAsteroidProfile(variant);
    const geo = new THREE.IcosahedronGeometry(1, profile.detail);
    const rng = mulberry32(hashString(seed));

    const axes = new THREE.Vector3(
        profile.axes[0] * (0.92 + rng() * 0.16),
        profile.axes[1] * (0.92 + rng() * 0.16),
        profile.axes[2] * (0.92 + rng() * 0.16),
    );

    const ph = Array.from({ length: 9 }, () => rng() * 6.28);

    const craters = Array.from({ length: profile.craterCount + Math.floor(rng() * 3) }, () => {
        const u = rng();
        const w = rng();
        const theta = Math.acos(2 * u - 1);
        const phi = 2 * Math.PI * w;

        return {
            dir: new THREE.Vector3(
                Math.sin(theta) * Math.cos(phi),
                Math.sin(theta) * Math.sin(phi),
                Math.cos(phi),
            ),
            radius: profile.craterRadius[0] + rng() * (profile.craterRadius[1] - profile.craterRadius[0]),
            depth: profile.craterDepth[0] + rng() * (profile.craterDepth[1] - profile.craterDepth[0]),
        };
    });

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i);
        const dir = v.clone().normalize();

        const broad =
            profile.roughness * Math.sin(dir.x * 1.7 + ph[0]) +
            profile.roughness * 0.9 * Math.sin(dir.y * 2.1 + ph[1]) +
            profile.roughness * 0.8 * Math.sin(dir.z * 1.9 + ph[2]);

        const medium =
            profile.roughness * 0.45 * Math.sin(dir.x * 4.3 + ph[3]) +
            profile.roughness * 0.4 * Math.sin(dir.y * 5.1 + ph[4]) +
            profile.roughness * 0.35 * Math.sin(dir.z * 4.7 + ph[5]);

        const fine =
            profile.roughness * 0.18 * Math.sin(dir.x * 9.7 + ph[6]) +
            profile.roughness * 0.15 * Math.sin(dir.y * 11.3 + ph[7]) +
            profile.roughness * 0.14 * Math.sin(dir.z * 10.1 + ph[8]);

        let radius = 1 + broad + medium + fine;

        for (const crater of craters) {
            const distance = dir.angleTo(crater.dir);

            if (distance < crater.radius) {
                const t = 1 - distance / crater.radius;
                radius -= crater.depth * t * t * (3 - 2 * t);
            }
        }

        v.copy(dir).multiplyScalar(Math.max(0.55, radius)).multiply(axes);
        pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    addAsteroidVertexColors(geo, seed, variant);

    return geo;
}

/**
 * Adiciona cores por vértice para dar à rocha um aspecto mineral/rochoso.
 */
function addAsteroidVertexColors(
    geo: THREE.BufferGeometry,
    seed: string,
    variant: GenericAsteroidVariant,
): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const rng = mulberry32(hashString(`${seed}:${variant}:color`));
    const baseHue = 0.095 + rng() * 0.02;
    const sat = 0.02 + rng() * 0.035;
    const baseLight = variant === 'tiny' ? 0.55 : variant === 'large' ? 0.46 : 0.51;
    const v = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i).normalize();

        const grain =
            Math.sin(v.x * 8.7 + rng() * 6.28) * 0.025 +
            Math.cos(v.y * 10.3 + rng() * 6.28) * 0.018 +
            Math.sin(v.z * 13.1 + rng() * 6.28) * 0.014;

        const latitudeShade = v.y * 0.018;

        c.setHSL(
            baseHue + grain * 0.035,
            sat,
            THREE.MathUtils.clamp(baseLight + grain * 0.55 + latitudeShade, 0.34, 0.68),
        );

        colors.push(c.r, c.g, c.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

/**
 * Gera texturas procedurais de mapa, bump e roughness para a superfície.
 */
export function buildAsteroidSurfaceTextures(
    seed: string,
    variant: GenericAsteroidVariant,
    size: number,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
    const width = size;
    const height = size / 2;

    const colorCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');

    colorCanvas.width = bumpCanvas.width = roughCanvas.width = width;
    colorCanvas.height = bumpCanvas.height = roughCanvas.height = height;

    const colorCtx = colorCanvas.getContext('2d')!;
    const bumpCtx = bumpCanvas.getContext('2d')!;
    const roughCtx = roughCanvas.getContext('2d')!;

    const rng = mulberry32(hashString(`${seed}:${variant}:surface`));
    const baseHue = 38 + rng() * 8;
    const baseSat = 3 + rng() * 5;
    const baseLight = variant === 'tiny' ? 58 : variant === 'large' ? 50 : 55;

    const image = colorCtx.createImageData(width, height);
    const bump = bumpCtx.createImageData(width, height);
    const rough = roughCtx.createImageData(width, height);
    const phase = Array.from({ length: 8 }, () => rng() * Math.PI * 2);

    for (let y = 0; y < height; y += 1) {
        const v = y / height;

        for (let x = 0; x < width; x += 1) {
            const u = x / width;
            const idx = (y * width + x) * 4;

            const large =
                Math.sin(u * Math.PI * 5.0 + phase[0]) * 0.5 +
                Math.cos(v * Math.PI * 7.0 + phase[1]) * 0.35 +
                Math.sin((u + v) * Math.PI * 9.0 + phase[2]) * 0.25;

            const fine =
                Math.sin(u * Math.PI * 47.0 + phase[3]) * 0.12 +
                Math.cos(v * Math.PI * 53.0 + phase[4]) * 0.1 +
                Math.sin((u - v) * Math.PI * 71.0 + phase[5]) * 0.08;

            const grain = large + fine + (rng() - 0.5) * 0.22;
            const light = THREE.MathUtils.clamp(baseLight + grain * 7, 40, 74);
            const sat = THREE.MathUtils.clamp(baseSat + fine * 6, 1, 10);
            const color = new THREE.Color(`hsl(${baseHue + grain * 3}, ${sat}%, ${light}%)`);

            image.data[idx] = Math.round(color.r * 255);
            image.data[idx + 1] = Math.round(color.g * 255);
            image.data[idx + 2] = Math.round(color.b * 255);
            image.data[idx + 3] = 255;

            const bumpValue = THREE.MathUtils.clamp(132 + grain * 42 + fine * 70, 42, 220);
            bump.data[idx] = bump.data[idx + 1] = bump.data[idx + 2] = bumpValue;
            bump.data[idx + 3] = 255;

            const roughValue = THREE.MathUtils.clamp(218 + Math.abs(fine) * 80 - large * 10, 170, 255);
            rough.data[idx] = rough.data[idx + 1] = rough.data[idx + 2] = roughValue;
            rough.data[idx + 3] = 255;
        }
    }

    colorCtx.putImageData(image, 0, 0);
    bumpCtx.putImageData(bump, 0, 0);
    roughCtx.putImageData(rough, 0, 0);

    const craterCount = genericAsteroidProfile(variant).craterCount + 8;

    for (let i = 0; i < craterCount; i += 1) {
        const x = rng() * width;
        const y = rng() * height;
        const radius = (6 + rng() * 28) * (variant === 'tiny' ? 0.65 : variant === 'large' ? 1.25 : 1);

        const colorGrad = colorCtx.createRadialGradient(x, y, radius * 0.08, x, y, radius);
        colorGrad.addColorStop(0, 'rgba(58, 56, 52, 0.18)');
        colorGrad.addColorStop(0.58, 'rgba(112, 108, 99, 0.08)');
        colorGrad.addColorStop(0.78, 'rgba(232, 224, 204, 0.14)');
        colorGrad.addColorStop(1, 'rgba(128,128,128,0)');

        colorCtx.fillStyle = colorGrad;
        colorCtx.beginPath();
        colorCtx.arc(x, y, radius, 0, Math.PI * 2);
        colorCtx.fill();

        const bumpGrad = bumpCtx.createRadialGradient(x, y, radius * 0.04, x, y, radius);
        bumpGrad.addColorStop(0, 'rgba(24,24,24,0.55)');
        bumpGrad.addColorStop(0.66, 'rgba(70,70,70,0.26)');
        bumpGrad.addColorStop(0.82, 'rgba(235,235,235,0.24)');
        bumpGrad.addColorStop(1, 'rgba(128,128,128,0)');

        bumpCtx.fillStyle = bumpGrad;
        bumpCtx.beginPath();
        bumpCtx.arc(x, y, radius, 0, Math.PI * 2);
        bumpCtx.fill();
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    const roughness = new THREE.CanvasTexture(roughCanvas);

    map.colorSpace = THREE.SRGBColorSpace;

    for (const texture of [map, bumpMap, roughness]) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
    }

    return { map, bump: bumpMap, roughness };
}

/**
 * Retorna parâmetros de geração procedural para cada categoria de asteroide.
 */
function genericAsteroidProfile(variant: GenericAsteroidVariant): {
    detail: number;
    axes: [number, number, number];
    roughness: number;
    craterCount: number;
    craterRadius: [number, number];
    craterDepth: [number, number];
} {
    switch (variant) {
        case 'tiny':
            return {
                detail: 5,
                axes: [1.55, 0.62, 0.72],
                roughness: 0.18,
                craterCount: 2,
                craterRadius: [0.18, 0.34],
                craterDepth: [0.03, 0.075],
            };

        case 'small':
            return {
                detail: 5,
                axes: [1.28, 0.78, 0.92],
                roughness: 0.16,
                craterCount: 4,
                craterRadius: [0.2, 0.42],
                craterDepth: [0.04, 0.095],
            };

        case 'medium':
            return {
                detail: 6,
                axes: [1.08, 0.95, 0.88],
                roughness: 0.13,
                craterCount: 5,
                craterRadius: [0.22, 0.48],
                craterDepth: [0.045, 0.11],
            };

        case 'large':
            return {
                detail: 6,
                axes: [1.42, 0.86, 0.96],
                roughness: 0.11,
                craterCount: 7,
                craterRadius: [0.24, 0.56],
                craterDepth: [0.04, 0.1],
            };

        case 'unknown':
        default:
            return {
                detail: 5,
                axes: [1.14, 0.88, 0.94],
                roughness: 0.145,
                craterCount: 4,
                craterRadius: [0.2, 0.44],
                craterDepth: [0.04, 0.095],
            };
    }
}

/**
 * Gera um hash inteiro de 32 bits a partir de uma string.
 */
function hashString(s: string): number {
    let h = 0x811c9dc5;

    for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }

    return h >>> 0;
}
