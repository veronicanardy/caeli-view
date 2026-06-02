import * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import { mulberry32 } from '@/lib/observatory/moonTextures';

export type GenericAsteroidVariant = 'tiny' | 'small' | 'medium' | 'large' | 'unknown';

type AsteroidCrater = {
    dir: THREE.Vector3;
    radius: number;
    depth: number;
    rim: number;
};

type FracturePlane = {
    normal: THREE.Vector3;
    threshold: number;
    strength: number;
};

type AsteroidProfile = {
    detail: number;
    axes: [number, number, number];
    macroAmplitude: number;
    blockAmplitude: number;
    gritAmplitude: number;
    craterCount: number;
    craterRadius: [number, number];
    craterDepth: [number, number];
    bumpScale: number;
    roughness: number;
    mineralVariation: number;
};

type TextureSample = {
    macro: number;
    medium: number;
    fine: number;
    pores: number;
};

export function sphericalDirection(theta: number, phi: number): THREE.Vector3 {
    return new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
    );
}

export function genericAsteroidVariantFor(object: ClosestNowObject): GenericAsteroidVariant {
    const diameter = asteroidDiameterMeters(object);

    if (diameter === null) return 'unknown';
    if (diameter < 40) return 'tiny';
    if (diameter < 150) return 'small';
    if (diameter < 600) return 'medium';

    return 'large';
}

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
 * Constroi uma malha de asteroide com ruido 3D em camadas.
 *
 * A mudanca estrutural aqui e que a forma nao vem mais de senos alinhados aos
 * eixos. Usamos FBM deterministico, lobos locais, crateras e planos de fratura
 * suaves para criar uma silhueta organica sem voltar para low-poly bruto.
 */
export function buildAsteroidGeometry(
    seed: string,
    variant: GenericAsteroidVariant = 'unknown',
): THREE.IcosahedronGeometry {
    const profile = genericAsteroidProfile(variant);
    const seedHash = hashString(`${seed}:${variant}:shape`);
    const rng = mulberry32(seedHash);
    const geometry = new THREE.IcosahedronGeometry(1, profile.detail);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const axes = buildAxes(profile, rng);
    const lobes = buildLobes(rng, variant === 'large' ? 9 : 7);
    const craters = buildAsteroidCraters(profile, rng);
    const fractures = buildFracturePlanes(rng, variant === 'tiny' ? 3 : 4);
    const vertex = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const displaced = new THREE.Vector3();

    for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i);
        dir.copy(vertex).normalize();

        const macro = fbm3(dir.x * 1.65 + 17.3, dir.y * 1.65 - 4.7, dir.z * 1.65 + 9.1, seedHash, 4);
        const block = ridgedFbm3(dir.x * 3.15 - 2.2, dir.y * 3.15 + 8.4, dir.z * 3.15 - 6.8, seedHash ^ 0x7feb352d, 3);
        const grit = fbm3(dir.x * 8.8 + 1.1, dir.y * 8.8 - 5.3, dir.z * 8.8 + 2.9, seedHash ^ 0x846ca68b, 2);

        let radius =
            1 +
            macro * profile.macroAmplitude +
            block * profile.blockAmplitude +
            grit * profile.gritAmplitude;

        for (const lobe of lobes) {
            const angle = dir.angleTo(lobe.dir);
            if (angle < lobe.radius) {
                const mask = smooth01(1 - angle / lobe.radius);
                radius += lobe.strength * mask;
            }
        }

        for (const crater of craters) {
            radius += sampleCraterOffset(dir, crater);
        }

        for (const fracture of fractures) {
            const cut = (dir.dot(fracture.normal) - fracture.threshold) / 0.16;
            if (cut > 0) {
                radius -= fracture.strength * smooth01(THREE.MathUtils.clamp(cut, 0, 1));
            }
        }

        radius = THREE.MathUtils.clamp(radius, 0.68, 1.34);
        displaced.set(dir.x * axes.x, dir.y * axes.y, dir.z * axes.z).multiplyScalar(radius);
        position.setXYZ(i, displaced.x, displaced.y, displaced.z);
    }

    geometry.computeVertexNormals();
    addAsteroidVertexColors(geometry, seedHash, profile);

    return geometry;
}

export function buildAsteroidSurfaceTextures(
    seed: string,
    variant: GenericAsteroidVariant,
    size: number,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
    const profile = genericAsteroidProfile(variant);
    const seedHash = hashString(`${seed}:${variant}:surface`);
    const rng = mulberry32(seedHash);
    const width = size;
    const height = Math.max(64, Math.floor(size / 2));
    const colorCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');

    colorCanvas.width = bumpCanvas.width = roughCanvas.width = width;
    colorCanvas.height = bumpCanvas.height = roughCanvas.height = height;

    const colorCtx = colorCanvas.getContext('2d');
    const bumpCtx = bumpCanvas.getContext('2d');
    const roughCtx = roughCanvas.getContext('2d');

    if (!colorCtx || !bumpCtx || !roughCtx) {
        throw new Error('Canvas 2D indisponivel para texturas procedurais.');
    }

    const image = colorCtx.createImageData(width, height);
    const bump = bumpCtx.createImageData(width, height);
    const rough = roughCtx.createImageData(width, height);
    const base = new THREE.Color('#3b3d40');
    const graphite = new THREE.Color('#26282c');
    const coolBrown = new THREE.Color('#55483d');
    const mineral = new THREE.Color('#767168');
    const color = new THREE.Color();

    for (let y = 0; y < height; y += 1) {
        const v = y / height;

        for (let x = 0; x < width; x += 1) {
            const u = x / width;
            const idx = (y * width + x) * 4;
            const sample = sampleTexture(u, v, seedHash);
            const mineralSpeck = valueNoise2(u * 95, v * 70, seedHash ^ 0x9e3779b9);
            const poreMask = Math.max(0, sample.pores - 0.58);

            color.copy(base);
            color.lerp(graphite, THREE.MathUtils.clamp(0.24 + sample.medium * 0.18, 0.08, 0.5));
            color.lerp(coolBrown, THREE.MathUtils.clamp(0.1 + sample.macro * 0.14, 0.02, 0.24));
            color.lerp(mineral, THREE.MathUtils.clamp((mineralSpeck - 0.64) * profile.mineralVariation, 0, 0.16));
            color.multiplyScalar(THREE.MathUtils.clamp(0.95 + sample.macro * 0.1 - poreMask * 0.18, 0.78, 1.08));

            image.data[idx] = Math.round(THREE.MathUtils.clamp(color.r, 0, 1) * 255);
            image.data[idx + 1] = Math.round(THREE.MathUtils.clamp(color.g, 0, 1) * 255);
            image.data[idx + 2] = Math.round(THREE.MathUtils.clamp(color.b, 0, 1) * 255);
            image.data[idx + 3] = 255;

            const relief = THREE.MathUtils.clamp(
                126 + sample.macro * 22 + sample.medium * 38 + sample.fine * 28 - poreMask * 72,
                54,
                218,
            );
            bump.data[idx] = bump.data[idx + 1] = bump.data[idx + 2] = Math.round(relief);
            bump.data[idx + 3] = 255;

            const roughValue = THREE.MathUtils.clamp(226 + sample.fine * 18 + poreMask * 38, 188, 255);
            rough.data[idx] = rough.data[idx + 1] = rough.data[idx + 2] = Math.round(roughValue);
            rough.data[idx + 3] = 255;
        }
    }

    colorCtx.putImageData(image, 0, 0);
    bumpCtx.putImageData(bump, 0, 0);
    roughCtx.putImageData(rough, 0, 0);

    paintTextureCraters(colorCtx, bumpCtx, roughCtx, profile, width, height, rng);
    paintTextureCracks(colorCtx, bumpCtx, profile, width, height, rng);

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

export function asteroidMaterialProfile(variant: GenericAsteroidVariant): {
    bumpScale: number;
    roughness: number;
    colorVariation: number;
} {
    const profile = genericAsteroidProfile(variant);

    return {
        bumpScale: profile.bumpScale,
        roughness: profile.roughness,
        colorVariation: profile.mineralVariation,
    };
}

function buildAxes(profile: AsteroidProfile, rng: () => number): THREE.Vector3 {
    return new THREE.Vector3(
        profile.axes[0] * (0.92 + rng() * 0.18),
        profile.axes[1] * (0.9 + rng() * 0.18),
        profile.axes[2] * (0.88 + rng() * 0.18),
    );
}

function buildLobes(rng: () => number, count: number): Array<{ dir: THREE.Vector3; radius: number; strength: number }> {
    return Array.from({ length: count }, () => ({
        dir: randomDirection(rng),
        radius: 0.28 + rng() * 0.52,
        strength: (rng() - 0.42) * 0.16,
    }));
}

function buildFracturePlanes(rng: () => number, count: number): FracturePlane[] {
    return Array.from({ length: count }, () => ({
        normal: randomDirection(rng),
        threshold: 0.62 + rng() * 0.22,
        strength: 0.025 + rng() * 0.04,
    }));
}

function buildAsteroidCraters(profile: AsteroidProfile, rng: () => number): AsteroidCrater[] {
    return Array.from({ length: profile.craterCount + Math.floor(rng() * 3) }, () => ({
        dir: randomDirection(rng),
        radius: THREE.MathUtils.lerp(profile.craterRadius[0], profile.craterRadius[1], rng()),
        depth: THREE.MathUtils.lerp(profile.craterDepth[0], profile.craterDepth[1], rng()),
        rim: 0.08 + rng() * 0.16,
    }));
}

function randomDirection(rng: () => number): THREE.Vector3 {
    return sphericalDirection(Math.acos(1 - 2 * rng()), rng() * Math.PI * 2);
}

function sampleCraterOffset(dir: THREE.Vector3, crater: AsteroidCrater): number {
    const distance = dir.angleTo(crater.dir);
    const outerRadius = crater.radius * (1 + crater.rim);

    if (distance >= outerRadius) return 0;

    const innerMask = smooth01(THREE.MathUtils.clamp(1 - distance / crater.radius, 0, 1));
    const rimMask = smooth01(THREE.MathUtils.clamp(1 - Math.abs(distance - crater.radius) / (crater.radius * crater.rim), 0, 1));

    return -crater.depth * innerMask + crater.depth * 0.28 * rimMask;
}

function addAsteroidVertexColors(
    geometry: THREE.BufferGeometry,
    seedHash: number,
    profile: AsteroidProfile,
): void {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const vertex = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const base = new THREE.Color('#3a3c40');
    const dark = new THREE.Color('#25262a');
    const brown = new THREE.Color('#50463d');
    const mineral = new THREE.Color('#706b63');
    const color = new THREE.Color();

    for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i);
        dir.copy(vertex).normalize();

        const macro = fbm3(dir.x * 1.8, dir.y * 1.8, dir.z * 1.8, seedHash ^ 0x51ed270b, 3);
        const patches = fbm3(dir.x * 5.4 + 2, dir.y * 5.4 - 3, dir.z * 5.4 + 7, seedHash ^ 0x94d049bb, 3);

        color.copy(base);
        color.lerp(dark, THREE.MathUtils.clamp(0.2 + patches * 0.22, 0.06, 0.42));
        color.lerp(brown, THREE.MathUtils.clamp(0.08 + macro * 0.12, 0.02, 0.2));
        color.lerp(mineral, THREE.MathUtils.clamp((patches - 0.25) * profile.mineralVariation, 0.02, 0.14));
        color.multiplyScalar(THREE.MathUtils.clamp(0.92 + vertex.y * 0.055 + macro * 0.045, 0.82, 1.06));

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function sampleTexture(u: number, v: number, seedHash: number): TextureSample {
    const warpX = fbm2(u * 2.4 + 11, v * 2.4 - 7, seedHash ^ 0x632be59b, 3) * 0.08;
    const warpY = fbm2(u * 2.1 - 5, v * 2.1 + 13, seedHash ^ 0x85157af5, 3) * 0.08;
    const x = u + warpX;
    const y = v + warpY;

    return {
        macro: fbm2(x * 3.2, y * 3.2, seedHash, 4),
        medium: ridgedFbm2(x * 9.5, y * 8.0, seedHash ^ 0x243f6a88, 3),
        fine: fbm2(x * 34, y * 28, seedHash ^ 0xb7e15162, 3),
        pores: valueNoise2(x * 68, y * 52, seedHash ^ 0x8aed2a6b),
    };
}

function paintTextureCraters(
    colorCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
    roughCtx: CanvasRenderingContext2D,
    profile: AsteroidProfile,
    width: number,
    height: number,
    rng: () => number,
): void {
    const craterCount = profile.craterCount * 3 + 10;

    for (let i = 0; i < craterCount; i += 1) {
        const x = rng() * width;
        const y = rng() * height;
        const radius = THREE.MathUtils.lerp(5, 24, rng()) * (profile.detail >= 8 ? 1.08 : 0.95);

        const colorGradient = colorCtx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
        colorGradient.addColorStop(0, 'rgba(10, 11, 13, 0.22)');
        colorGradient.addColorStop(0.58, 'rgba(44, 40, 36, 0.10)');
        colorGradient.addColorStop(0.8, 'rgba(135, 127, 115, 0.08)');
        colorGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        colorCtx.fillStyle = colorGradient;
        colorCtx.beginPath();
        colorCtx.arc(x, y, radius, 0, Math.PI * 2);
        colorCtx.fill();

        const bumpGradient = bumpCtx.createRadialGradient(x, y, radius * 0.08, x, y, radius);
        bumpGradient.addColorStop(0, 'rgba(24, 24, 24, 0.55)');
        bumpGradient.addColorStop(0.62, 'rgba(76, 76, 76, 0.22)');
        bumpGradient.addColorStop(0.82, 'rgba(220, 220, 220, 0.18)');
        bumpGradient.addColorStop(1, 'rgba(128, 128, 128, 0)');
        bumpCtx.fillStyle = bumpGradient;
        bumpCtx.beginPath();
        bumpCtx.arc(x, y, radius, 0, Math.PI * 2);
        bumpCtx.fill();

        const roughGradient = roughCtx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
        roughGradient.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
        roughGradient.addColorStop(0.82, 'rgba(230, 230, 230, 0.08)');
        roughGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        roughCtx.fillStyle = roughGradient;
        roughCtx.beginPath();
        roughCtx.arc(x, y, radius, 0, Math.PI * 2);
        roughCtx.fill();
    }
}

function paintTextureCracks(
    colorCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
    profile: AsteroidProfile,
    width: number,
    height: number,
    rng: () => number,
): void {
    const crackCount = Math.max(6, profile.craterCount + 4);

    colorCtx.save();
    bumpCtx.save();
    colorCtx.lineCap = 'round';
    colorCtx.lineJoin = 'round';
    bumpCtx.lineCap = 'round';
    bumpCtx.lineJoin = 'round';

    for (let i = 0; i < crackCount; i += 1) {
        const points = buildCrackPoints(width, height, rng);

        colorCtx.beginPath();
        bumpCtx.beginPath();
        colorCtx.moveTo(points[0].x, points[0].y);
        bumpCtx.moveTo(points[0].x, points[0].y);

        for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
            colorCtx.lineTo(points[pointIndex].x, points[pointIndex].y);
            bumpCtx.lineTo(points[pointIndex].x, points[pointIndex].y);
        }

        colorCtx.strokeStyle = `rgba(14, 15, 17, ${0.07 + rng() * 0.08})`;
        colorCtx.lineWidth = 0.65 + rng() * 1.25;
        colorCtx.stroke();

        bumpCtx.strokeStyle = `rgba(38, 38, 38, ${0.12 + rng() * 0.16})`;
        bumpCtx.lineWidth = 0.8 + rng() * 1.5;
        bumpCtx.stroke();
    }

    colorCtx.restore();
    bumpCtx.restore();
}

function buildCrackPoints(
    width: number,
    height: number,
    rng: () => number,
): Array<{ x: number; y: number }> {
    const pointCount = 3 + Math.floor(rng() * 4);
    const startX = rng() * width;
    const startY = rng() * height;
    const angle = rng() * Math.PI * 2;
    const step = 10 + rng() * 20;
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < pointCount; i += 1) {
        points.push({
            x: THREE.MathUtils.euclideanModulo(startX + Math.cos(angle) * step * i + (rng() - 0.5) * 18, width),
            y: THREE.MathUtils.clamp(startY + Math.sin(angle) * step * i + (rng() - 0.5) * 14, 0, height),
        });
    }

    return points;
}

function genericAsteroidProfile(variant: GenericAsteroidVariant): AsteroidProfile {
    switch (variant) {
        case 'tiny':
            return {
                detail: 7,
                axes: [1.28, 0.86, 0.72],
                macroAmplitude: 0.13,
                blockAmplitude: 0.07,
                gritAmplitude: 0.018,
                craterCount: 5,
                craterRadius: [0.14, 0.28],
                craterDepth: [0.014, 0.038],
                bumpScale: 0.016,
                roughness: 0.965,
                mineralVariation: 0.42,
            };

        case 'small':
            return {
                detail: 7,
                axes: [1.22, 0.88, 0.76],
                macroAmplitude: 0.12,
                blockAmplitude: 0.066,
                gritAmplitude: 0.016,
                craterCount: 6,
                craterRadius: [0.13, 0.28],
                craterDepth: [0.014, 0.036],
                bumpScale: 0.015,
                roughness: 0.96,
                mineralVariation: 0.38,
            };

        case 'medium':
            return {
                detail: 8,
                axes: [1.16, 0.9, 0.78],
                macroAmplitude: 0.108,
                blockAmplitude: 0.058,
                gritAmplitude: 0.014,
                craterCount: 7,
                craterRadius: [0.12, 0.26],
                craterDepth: [0.012, 0.032],
                bumpScale: 0.013,
                roughness: 0.955,
                mineralVariation: 0.34,
            };

        case 'large':
            return {
                detail: 8,
                axes: [1.24, 0.94, 0.82],
                macroAmplitude: 0.112,
                blockAmplitude: 0.056,
                gritAmplitude: 0.014,
                craterCount: 8,
                craterRadius: [0.12, 0.25],
                craterDepth: [0.012, 0.03],
                bumpScale: 0.012,
                roughness: 0.95,
                mineralVariation: 0.3,
            };

        case 'unknown':
        default:
            return {
                detail: 7,
                axes: [1.2, 0.9, 0.78],
                macroAmplitude: 0.114,
                blockAmplitude: 0.06,
                gritAmplitude: 0.015,
                craterCount: 6,
                craterRadius: [0.13, 0.27],
                craterDepth: [0.013, 0.034],
                bumpScale: 0.014,
                roughness: 0.958,
                mineralVariation: 0.36,
            };
    }
}

function fbm3(x: number, y: number, z: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let total = 0;

    for (let i = 0; i < octaves; i += 1) {
        value += valueNoise3(x * frequency, y * frequency, z * frequency, seed + i * 1013) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequency *= 2.03;
    }

    return value / total - 0.5;
}

function ridgedFbm3(x: number, y: number, z: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let total = 0;

    for (let i = 0; i < octaves; i += 1) {
        value += (1 - Math.abs(valueNoise3(x * frequency, y * frequency, z * frequency, seed + i * 1747) * 2 - 1)) * amplitude;
        total += amplitude;
        amplitude *= 0.52;
        frequency *= 2.1;
    }

    return value / total - 0.5;
}

function fbm2(x: number, y: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let total = 0;

    for (let i = 0; i < octaves; i += 1) {
        value += valueNoise2(x * frequency, y * frequency, seed + i * 733) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequency *= 2.03;
    }

    return value / total - 0.5;
}

function ridgedFbm2(x: number, y: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let total = 0;

    for (let i = 0; i < octaves; i += 1) {
        value += (1 - Math.abs(valueNoise2(x * frequency, y * frequency, seed + i * 9151) * 2 - 1)) * amplitude;
        total += amplitude;
        amplitude *= 0.52;
        frequency *= 2.08;
    }

    return value / total - 0.5;
}

function valueNoise3(x: number, y: number, z: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = smooth01(x - xi);
    const yf = smooth01(y - yi);
    const zf = smooth01(z - zi);

    const x00 = lerp(hash3(xi, yi, zi, seed), hash3(xi + 1, yi, zi, seed), xf);
    const x10 = lerp(hash3(xi, yi + 1, zi, seed), hash3(xi + 1, yi + 1, zi, seed), xf);
    const x01 = lerp(hash3(xi, yi, zi + 1, seed), hash3(xi + 1, yi, zi + 1, seed), xf);
    const x11 = lerp(hash3(xi, yi + 1, zi + 1, seed), hash3(xi + 1, yi + 1, zi + 1, seed), xf);

    return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
}

function valueNoise2(x: number, y: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth01(x - xi);
    const yf = smooth01(y - yi);

    return lerp(
        lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), xf),
        lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), xf),
        yf,
    );
}

function smooth01(value: number): number {
    return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function hash2(x: number, y: number, seed: number): number {
    let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function hash3(x: number, y: number, z: number, seed: number): number {
    let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function hashString(value: string): number {
    let hash = 0x811c9dc5;

    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0;
}
