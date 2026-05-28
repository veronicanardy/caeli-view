import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';
import { mulberry32 } from '@/lib/observatory/moonTextures';
import type { Palette } from '@/lib/observatory/palette';
import {
    closestApproachNearPosition,
    currentPositionInScene,
} from '@/lib/observatory/trajectorySampling';
import { ScreenLabel } from '../Overlays/SceneLabels';

type AsteroidModelAsset = {
    key: 'bennu' | 'ceres' | 'eros' | 'itokawa' | 'vesta';
    url: string;
    rotation: [number, number, number];
    aliases: string[];
    numbers: string[];
};

type GenericAsteroidVariant = 'tiny' | 'small' | 'medium' | 'large' | 'unknown';

type AsteroidRenderableModel =
    | { kind: 'real'; asset: AsteroidModelAsset }
    | { kind: 'generic'; variant: GenericAsteroidVariant };

const REAL_ASTEROID_MODELS: AsteroidModelAsset[] = [
    { key: 'bennu', url: '/models/asteroids/bennu.glb', rotation: [-0.12, 0.38, 0.04], aliases: ['bennu', 'rq36'], numbers: ['101955'] },
    { key: 'ceres', url: '/models/asteroids/ceres.glb', rotation: [0.08, -0.28, 0.02], aliases: ['ceres'], numbers: ['1'] },
    { key: 'itokawa', url: '/models/asteroids/itokawa.glb', rotation: [-0.2, 0.45, 0.08], aliases: ['itokawa'], numbers: ['25143'] },
    { key: 'eros', url: '/models/asteroids/eros.glb', rotation: [0.15, -0.32, -0.1], aliases: ['eros'], numbers: ['433'] },
    { key: 'vesta', url: '/models/asteroids/vesta.glb', rotation: [-0.06, 0.3, -0.04], aliases: ['vesta'], numbers: ['4'] },
];

type AsteroidMarkerProps = {
    object: ClosestNowObject;
    palette: Palette;
    isSelected: boolean;
    dimmed: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    locale: 'pt-BR' | 'en';
};

export function AsteroidMarker({ object, isSelected, dimmed, onSelect, compactLabel, showLabel, protectLabelFromFocus, locale }: AsteroidMarkerProps) {
    const position = currentPositionInScene(object);
    const [hovered, setHovered] = useState(false);
    const rockRef = useRef<THREE.Group>(null);

    // Famous real-shape assets only when identity matches. Everything else gets a generic rock
    // variant chosen from its estimated physical size.
    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    // Slow tumble so the body reads as 3D without looking restless.
    useFrame((_, delta) => {
        if (rockRef.current) {
            rockRef.current.rotation.y += delta * 0.045;
            rockRef.current.rotation.x += delta * 0.018;
        }
    });

    if (!position) return null;

    const rockScale = 0.045;
    const opacity = dimmed ? 0.4 : 1;
    const nearbyClosestApproach = closestApproachNearPosition(object.trajectory, new THREE.Vector3(...position));
    const en = locale === 'en';

    return (
        <group position={position}>
            {/* Real GLB for known bodies; generic size-class rocks for everything else. */}
            <group ref={rockRef} scale={rockScale}>
                <pointLight position={[1.5, 1.2, 1.8]} intensity={0.18} distance={2.4} color="#f2f7ff" />
                {renderModel.kind === 'real' ? (
                    <RealAsteroidModel asset={renderModel.asset} opacity={opacity} />
                ) : (
                    <ProceduralAsteroidRock seed={object.approach.id} variant={renderModel.variant} opacity={opacity} />
                )}
            </group>

            {/* Invisible hitbox — large, easy click/hover target. */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
                onClick={(e) => { e.stopPropagation(); onSelect(object.approach); }}
            >
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {showLabel ? (
                <ScreenLabel
                    position={[0, 0.16, 0]}
                    emphasized={isSelected || hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={() => onSelect(object.approach)}
                    title={`Focar ${object.approach.displayName ?? object.approach.name}`}
                >
                <div className="font-semibold">{object.approach.displayName ?? object.approach.name}</div>
                {!compactLabel ? (
                    <div className="text-white/65">
                        {compactKm(object.currentDistanceKm)} ·{' '}
                        {object.currentDistanceLD !== null ? `${object.currentDistanceLD.toFixed(2)} DL` : '—'}
                    </div>
                ) : null}
                {nearbyClosestApproach ? (
                    <div className="mt-1 rounded border border-signal-cyan/35 bg-signal-cyan/10 px-2 py-1 text-[12px] font-semibold text-signal-cyan">
                        {en ? 'Closest approach now' : 'Máxima aproximação hoje'}
                    </div>
                ) : null}
                </ScreenLabel>
            ) : null}
        </group>
    );
}

function RealAsteroidModel({ asset, opacity }: { asset: AsteroidModelAsset; opacity: number }) {
    const gltf = useGLTF(asset.url) as { scene: THREE.Group };
    const { model, scale } = useMemo(() => {
        const clone = gltf.scene.clone(true);
        const box = new THREE.Box3().setFromObject(clone);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        clone.position.copy(center).multiplyScalar(-1);
        clone.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const styledMaterials = sourceMaterials.map((material) => {
                const styled = material.clone();
                styled.transparent = opacity < 1;
                styled.opacity = opacity;
                styled.depthWrite = opacity >= 0.75;
                if ('roughness' in styled) {
                    (styled as THREE.MeshStandardMaterial).roughness = Math.max((styled as THREE.MeshStandardMaterial).roughness ?? 0, 0.92);
                }
                if ('metalness' in styled) {
                    (styled as THREE.MeshStandardMaterial).metalness = Math.min((styled as THREE.MeshStandardMaterial).metalness ?? 0, 0.03);
                }
                return styled;
            });
            mesh.material = Array.isArray(mesh.material) ? styledMaterials : styledMaterials[0];
        });

        return { model: clone, scale: 2 / maxAxis };
    }, [gltf.scene, opacity]);

    return (
        <group rotation={asset.rotation} scale={scale}>
            <primitive object={model} />
        </group>
    );
}

function ProceduralAsteroidRock({ seed, variant, opacity }: { seed: string; variant: GenericAsteroidVariant; opacity: number }) {
    const rockGeometry = useMemo(() => buildAsteroidGeometry(seed, variant), [seed, variant]);
    useEffect(() => () => rockGeometry.dispose(), [rockGeometry]);
    const surface = useMemo(() => { try { return buildAsteroidSurfaceTextures(seed, variant, 512); } catch { return null; } }, [seed, variant]);
    useEffect(() => () => {
        surface?.map.dispose();
        surface?.bump.dispose();
        surface?.roughness.dispose();
    }, [surface]);

    return (
        <mesh geometry={rockGeometry}>
            <meshStandardMaterial
                color="#f2f0e7"
                vertexColors
                map={surface?.map ?? undefined}
                bumpMap={surface?.bump ?? undefined}
                bumpScale={0.032}
                roughnessMap={surface?.roughness ?? undefined}
                emissive="#38342c"
                emissiveIntensity={0.28}
                roughness={0.82}
                metalness={0.0}
                flatShading={false}
                transparent
                opacity={opacity}
            />
        </mesh>
    );
}

function asteroidRenderableModelFor(object: ClosestNowObject): AsteroidRenderableModel {
    const realAsset = realAsteroidModelFor(object);
    if (realAsset) return { kind: 'real', asset: realAsset };

    return { kind: 'generic', variant: genericAsteroidVariantFor(object) };
}

/**
 * Resolves a real shape-model GLB (Bennu, Ceres, Eros, Itokawa, Vesta) for an asteroid ONLY when
 * the object is unambiguously that body. Two independent matchers:
 *
 *   - Alias matcher: the asset's alias (e.g. "ceres", "bennu") must appear as a whole word in one
 *     of the text fields. Substring matching was wrong — "2026 KD1" contains "1" but is not Ceres,
 *     and "Ceres-1A" should not silently become Ceres. Word boundaries (\b) handle hyphens, spaces
 *     and parentheses correctly: "(1) Ceres" matches, "AstroCeres" does not.
 *
 *   - Number matcher: the asset's IAU permanent number must be EQUAL to a canonical numeric field
 *     (permanentNumber or spkId), optionally surrounded by parentheses. Critically, we do NOT scan
 *     `name`/`designation`/`detailIdentifier` for digits — provisional designations such as
 *     "2026 KD1" end in "1" and were being mis-matched to Ceres (whose IAU number is 1). Catalog
 *     numbers are atomic identifiers, not arbitrary digit hits.
 *
 * If neither matcher fires, the asteroid falls through to the generic procedural variant. We never
 * default to "Ceres because the diameter is large" — the real GLBs belong only to the real bodies.
 */
function realAsteroidModelFor(object: ClosestNowObject): AsteroidModelAsset | null {
    const textFields = [
        object.approach.name,
        object.approach.displayName,
        object.approach.rawName,
        object.approach.properName,
        object.approach.designation,
        object.approach.provisionalDesignation,
        object.approach.detailIdentifier,
        ...(object.approach.aliases ?? []),
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    // Only canonical catalog-number fields are eligible for numeric matching.
    const catalogNumberFields = [
        object.approach.permanentNumber,
        object.approach.spkId,
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    for (const asset of REAL_ASTEROID_MODELS) {
        if (asset.aliases.some((alias) => textFields.some((field) => fieldContainsWord(field, alias)))) {
            return asset;
        }

        if (asset.numbers.some((number) => catalogNumberFields.some((field) => fieldEqualsCatalogNumber(field, number)))) {
            return asset;
        }
    }

    return null;
}

/** True when `needle` appears as a whole word in `field` — bounded by start/end or a non-alphanumeric. */
function fieldContainsWord(field: string, needle: string): boolean {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(field);
}

/**
 * True when the canonical numeric field IS exactly the catalog number, allowing optional
 * surrounding parentheses (e.g. "(1)" or "1" both match number "1", but "2026 kd1" does NOT —
 * that string contains other digits, so the catalog number is not the field's entire identity).
 */
function fieldEqualsCatalogNumber(field: string, number: string): boolean {
    const trimmed = field.trim().replace(/^\((\d+)\)$/, '$1');
    return trimmed === number;
}

function genericAsteroidVariantFor(object: ClosestNowObject): GenericAsteroidVariant {
    const diameter = asteroidDiameterMeters(object);
    if (diameter === null) return 'unknown';
    if (diameter < 40) return 'tiny';
    if (diameter < 150) return 'small';
    if (diameter < 600) return 'medium';
    return 'large';
}

function asteroidDiameterMeters(object: ClosestNowObject): number | null {
    const direct = object.approach.diameterMeters;
    if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) return direct;

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
 * Builds a noise-deformed icosahedron that reads as an irregular rock. Seeded by the object id so
 * the shape is stable across renders and distinct per asteroid.
 */
function buildAsteroidGeometry(seed: string, variant: GenericAsteroidVariant = 'unknown'): THREE.IcosahedronGeometry {
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
        const u = rng(); const w = rng();
        const theta = Math.acos(2 * u - 1); const phi = 2 * Math.PI * w;
        return {
            dir: new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)),
            radius: profile.craterRadius[0] + rng() * (profile.craterRadius[1] - profile.craterRadius[0]),
            depth: profile.craterDepth[0] + rng() * (profile.craterDepth[1] - profile.craterDepth[0]),
        };
    });

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i);
        const dir = v.clone().normalize();

        // Layered lumpiness: broad lobes, medium bumps, fine grain.
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
        let r = 1 + broad + medium + fine;

        // Carve craters: a smooth depression where the vertex direction is close to a crater center.
        for (const c of craters) {
            const d = dir.angleTo(c.dir);
            if (d < c.radius) {
                const t = 1 - d / c.radius;          // 1 at center → 0 at rim
                r -= c.depth * t * t * (3 - 2 * t);  // smoothstep falloff
            }
        }

        v.copy(dir).multiplyScalar(Math.max(0.55, r)).multiply(axes);
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    addAsteroidVertexColors(geo, seed, variant);
    return geo;
}

function addAsteroidVertexColors(geo: THREE.BufferGeometry, seed: string, variant: GenericAsteroidVariant): void {
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
        c.setHSL(baseHue + grain * 0.035, sat, THREE.MathUtils.clamp(baseLight + grain * 0.55 + latitudeShade, 0.34, 0.68));
        colors.push(c.r, c.g, c.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function buildAsteroidSurfaceTextures(
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
        const r = (6 + rng() * 28) * (variant === 'tiny' ? 0.65 : variant === 'large' ? 1.25 : 1);
        const colorGrad = colorCtx.createRadialGradient(x, y, r * 0.08, x, y, r);
        colorGrad.addColorStop(0, 'rgba(58, 56, 52, 0.18)');
        colorGrad.addColorStop(0.58, 'rgba(112, 108, 99, 0.08)');
        colorGrad.addColorStop(0.78, 'rgba(232, 224, 204, 0.14)');
        colorGrad.addColorStop(1, 'rgba(128,128,128,0)');
        colorCtx.fillStyle = colorGrad;
        colorCtx.beginPath();
        colorCtx.arc(x, y, r, 0, Math.PI * 2);
        colorCtx.fill();

        const bumpGrad = bumpCtx.createRadialGradient(x, y, r * 0.04, x, y, r);
        bumpGrad.addColorStop(0, 'rgba(24,24,24,0.55)');
        bumpGrad.addColorStop(0.66, 'rgba(70,70,70,0.26)');
        bumpGrad.addColorStop(0.82, 'rgba(235,235,235,0.24)');
        bumpGrad.addColorStop(1, 'rgba(128,128,128,0)');
        bumpCtx.fillStyle = bumpGrad;
        bumpCtx.beginPath();
        bumpCtx.arc(x, y, r, 0, Math.PI * 2);
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
            return { detail: 5, axes: [1.55, 0.62, 0.72], roughness: 0.18, craterCount: 2, craterRadius: [0.18, 0.34], craterDepth: [0.03, 0.075] };
        case 'small':
            return { detail: 5, axes: [1.28, 0.78, 0.92], roughness: 0.16, craterCount: 4, craterRadius: [0.2, 0.42], craterDepth: [0.04, 0.095] };
        case 'medium':
            return { detail: 6, axes: [1.08, 0.95, 0.88], roughness: 0.13, craterCount: 5, craterRadius: [0.22, 0.48], craterDepth: [0.045, 0.11] };
        case 'large':
            return { detail: 6, axes: [1.42, 0.86, 0.96], roughness: 0.11, craterCount: 7, craterRadius: [0.24, 0.56], craterDepth: [0.04, 0.1] };
        case 'unknown':
        default:
            return { detail: 5, axes: [1.14, 0.88, 0.94], roughness: 0.145, craterCount: 4, craterRadius: [0.2, 0.44], craterDepth: [0.04, 0.095] };
    }
}

function hashString(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
