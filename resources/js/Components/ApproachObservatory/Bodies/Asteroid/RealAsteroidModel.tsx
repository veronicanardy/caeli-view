import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AsteroidModelAsset } from './asteroidModelRegistry';

interface RealAsteroidModelProps {
    asset: AsteroidModelAsset;
    opacity: number;
    seed?: string | number;
    selected?: boolean;
}

function hashSeed(seed: string | number): number {
    const s = String(seed);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

const IGNORED_NAMES = new Set(['light_rig', 'lights', 'camera_rig', 'camera']);
const IGNORED_TYPES = new Set(['AmbientLight', 'DirectionalLight', 'PointLight', 'SpotLight', 'HemisphereLight', 'Camera', 'PerspectiveCamera']);

function hasMesh(obj: THREE.Object3D): boolean {
    let found = false;
    obj.traverse((child) => { if ((child as THREE.Mesh).isMesh) found = true; });
    return found;
}

/**
 * Retorna cada asteroide do pack como um Object3D independente, já resetado
 * para a origem (posição e rotação zeradas), pronto para centralização.
 *
 * Suporta dois layouts de exportação do Blender:
 * - Meshes filhos diretos da Scene (layout flat)
 * - Meshes dentro de Groups filhos da Scene (layout hierárquico)
 */
// Agrupa meshes soltos pelo prefixo "Asteroid_no_N" (ex: "Asteroid_no_4_Material #3_0")
function groupByAsteroidPrefix(candidates: THREE.Object3D[]): THREE.Object3D[] | null {
    const PREFIX_RE = /^(asteroid_no_\d+)/i;
    const groups = new Map<string, THREE.Object3D[]>();

    for (const c of candidates) {
        const match = c.name.match(PREFIX_RE);
        if (!match) return null;
        const key = match[1].toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
    }

    if (groups.size < 2) return null;

    return Array.from(groups.entries()).map(([key, meshes]) => {
        const wrapper = new THREE.Group();
        wrapper.name = key;
        for (const mesh of meshes) {
            const clone = mesh.clone(true);
            clone.position.copy((mesh as THREE.Mesh).position);
            wrapper.add(clone);
        }
        return wrapper;
    });
}

function collectVariantRoots(scene: THREE.Group): THREE.Object3D[] {
    const candidates = scene.children.filter((c) => {
        if (IGNORED_TYPES.has(c.type)) return false;
        if (IGNORED_NAMES.has(c.name.toLowerCase())) return false;
        return hasMesh(c);
    });

    if (candidates.some((c) => (c as THREE.Mesh).isMesh)) {
        const grouped = groupByAsteroidPrefix(candidates);
        if (grouped) return grouped;

        return candidates.map((mesh) => {
            const wrapper = new THREE.Group();
            wrapper.name = mesh.name;
            const clone = mesh.clone(true);
            clone.position.set(0, 0, 0);
            clone.rotation.set(0, 0, 0);
            clone.scale.set(mesh.scale.x, mesh.scale.y, mesh.scale.z);
            wrapper.add(clone);
            return wrapper;
        });
    }

    // Layout hierárquico: filhos são Groups que contêm os meshes
    if (candidates.length > 1) return candidates;

    // Fallback: um único container — desce um nível
    if (candidates.length === 1) {
        const sub = candidates[0].children.filter((c) => !IGNORED_TYPES.has(c.type) && hasMesh(c));
        if (sub.length > 1) return sub;
    }

    return candidates.length > 0 ? candidates : [scene];
}

// Tint sutil grafite-frio — mistura com a textura original sem substituí-la
const ROCK_TINT = new THREE.Color('#4e5258');
// Fallback quando o GLB não tem textura alguma
const ROCK_FALLBACK_COLOR = new THREE.Color('#34383e');

/* Emissive base — sombras profundas com mínimo de auto-iluminação. */
const EMISSIVE_BASE = new THREE.Color(0.06, 0.05, 0.04);
const EMISSIVE_BASE_INTENSITY = 0.08;
/* Emissive selecionado — brilho interno ciano-frio que separa o asteroide do fundo. */
const EMISSIVE_SELECTED = new THREE.Color(0.10, 0.22, 0.28);
const EMISSIVE_SELECTED_INTENSITY = 0.55;

function applyMaterialDefaults(obj: THREE.Object3D, opacity: number, selected: boolean): void {
    obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;

        mesh.visible = true;
        mesh.frustumCulled = false;
        mesh.renderOrder = 1;

        const rawMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        const materials = rawMaterials.map((src) => {
            const existing = src instanceof THREE.MeshStandardMaterial ? src : null;
            const mat = existing
                ? existing.clone()
                : new THREE.MeshStandardMaterial({ color: ROCK_FALLBACK_COLOR });

            if (!existing) src?.dispose?.();

            mat.roughness = 0.94;
            mat.metalness = 0.0;
            mat.envMapIntensity = 1;

            if (selected) {
                /* Asteroide selecionado: emissive ciano-frio sutil ilumina as bordas
                   e ranhuras do modelo real, sem depender da esfera de halo. */
                mat.emissive.copy(EMISSIVE_SELECTED);
                mat.emissiveIntensity = EMISSIVE_SELECTED_INTENSITY;
            } else {
                mat.emissive.copy(EMISSIVE_BASE);
                mat.emissiveIntensity = EMISSIVE_BASE_INTENSITY;
            }

            if (mat.map) {
                mat.color.copy(ROCK_TINT);
            } else {
                mat.color.copy(ROCK_FALLBACK_COLOR);
            }

            if (mat.normalMap) {
                mat.normalScale.set(0.75, 0.75);
            }

            mat.transparent = false;
            mat.opacity = opacity;
            mat.depthWrite = true;
            if (opacity < 1) {
                mat.color.multiplyScalar(opacity);
            }
            mat.needsUpdate = true;

            return mat;
        });

        mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
}


/**
 * Renderiza um asteroide GLB selecionando uma variante pelo seed.
 *
 * Suporta packs de múltiplos asteroides no mesmo arquivo: coleta todos os
 * grupos-raiz com mesh, seleciona um pelo hash do seed, centraliza e normaliza.
 */
export default function RealAsteroidModel({ asset, opacity, seed, selected = false }: RealAsteroidModelProps) {
    const gltf = useGLTF(asset.url) as { scene: THREE.Group };

    const { model, scale } = useMemo(() => {
        const sceneClone = gltf.scene.clone(true);
        const allVariants = collectVariantRoots(sceneClone);

        const excluded = new Set((asset.excludedVariants ?? []).map((n) => n.toLowerCase()));
        const variants = allVariants.filter((v) => !excluded.has(v.name.toLowerCase()));
        const pool = variants.length > 0 ? variants : allVariants;

        // Seleciona variante pelo seed (estável por objeto), ou a primeira se sem seed
        const idx = seed != null ? hashSeed(seed) % pool.length : 0;
        const chosen = pool[idx].clone(true);

        const box = new THREE.Box3().setFromObject(chosen);
        const center = box.getCenter(new THREE.Vector3());

        if (box.isEmpty()) {
            return { model: chosen, scale: 1 };
        }

        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        // Atualiza as matrizes do mundo para que worldToLocal funcione corretamente
        // mesmo com o objeto fora da cena.
        chosen.updateWorldMatrix(true, true);

        chosen.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.geometry) return;
            const localCenter = mesh.worldToLocal(center.clone());
            mesh.geometry = mesh.geometry.clone();
            mesh.geometry.translate(-localCenter.x, -localCenter.y, -localCenter.z);
        });

        return {
            model: chosen,
            scale: 2 / maxAxis,
        };
    }, [gltf.scene, asset.url, seed]);

    useEffect(() => {
        applyMaterialDefaults(model, opacity, selected);
    }, [model, opacity, selected]);

    useEffect(() => {
        return () => {
            model.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((m) => m?.dispose());
            });
        };
    }, [model]);

    return (
        <group rotation={asset.rotation} scale={scale}>
            <primitive object={model} />
        </group>
    );
}
