/**
 * Modelo GLB real de asteroide com identidade conhecida.
 *
 * Responsabilidade: carregar e exibir o modelo 3D do asset recebido, aplicando
 * opacidade, outline de seleção e variação procedural de seed para evitar que
 * asteroides distintos pareçam idênticos. Não decide qual modelo usar — isso
 * é responsabilidade de `asteroidModelRegistry`.
 */

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AsteroidModelAsset } from './asteroidModelRegistry';

interface RealAsteroidModelProps {
    asset: AsteroidModelAsset;
    opacity: number;
    seed?: string | number;
    selected?: boolean;
    outlineColor?: string;
    showOutline?: boolean;
    /**
     * Tint da superfície quando o GLB tem textura (mistura, não substitui). Default = grafite-frio de
     * rocha. Cometas passam um tom gelado para distinguir do genérico de asteroide enquanto não há
     * GLB exclusivo de cometa.
     */
    tint?: string;
    /** Cor de fallback quando o GLB não tem textura alguma. Default = grafite de rocha. */
    fallbackColor?: string;
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

/* Outline back-face via normal expansion — segue a silhueta real do mesh sem post-processing. */
const OUTLINE_VERTEX = `
    void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec4 pos = modelViewMatrix * vec4(position, 1.0);
        pos.xyz += n * 0.0002;
        gl_Position = projectionMatrix * pos;
    }
`;
const OUTLINE_FRAGMENT = `
    uniform vec3 uColor;
    void main() {
        gl_FragColor = vec4(uColor, 0.58);
        #include <colorspace_fragment>
    }
`;

function createOutlineMaterial(color: string) {
    return new THREE.ShaderMaterial({
        vertexShader: OUTLINE_VERTEX,
        fragmentShader: OUTLINE_FRAGMENT,
        uniforms: { uColor: { value: new THREE.Color(color) } },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
    });
}

// Tint sutil grafite-frio — mistura com a textura original sem substituí-la
const ROCK_TINT = '#4e5258';
// Fallback quando o GLB não tem textura alguma
const ROCK_FALLBACK_COLOR = '#34383e';

/**
 * Clona os materiais do GLB uma única vez e aplica os ajustes estáticos de superfície.
 * Roda apenas quando o modelo muda — nunca em resposta a dimming/hover.
 */
function prepareMaterials(obj: THREE.Object3D, fallbackColor: string): void {
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
                : new THREE.MeshStandardMaterial({ color: new THREE.Color(fallbackColor) });

            if (!existing) src?.dispose?.();

            mat.roughness = 0.94;
            mat.metalness = 0.0;
            mat.envMapIntensity = 1;
            /* Emissive mais baixo = sombras mais profundas = mais contraste percebido. */
            mat.emissive.set(0.06, 0.05, 0.04);
            mat.emissiveIntensity = 0.08;

            /* Normal scale maior = ranhuras e volumes mais definidos. */
            if (mat.normalMap) {
                mat.normalScale.set(0.75, 0.75);
            }

            mat.transparent = false;
            mat.depthWrite = true;

            return mat;
        });

        mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
}

/**
 * Aplica o dimming atualizando a cor in-place, sem clonar materiais.
 *
 * A versão anterior re-clonava todos os materiais do GLB a cada mudança de opacity
 * (hover/seleção dim de vizinhos) e marcava needsUpdate, vazando os clones antigos e
 * forçando o renderer a reprocessar o material. Cor base é determinística (tint quando
 * há textura, fallback quando não), então pode ser recomputada do zero a cada chamada.
 */
function applyDimming(obj: THREE.Object3D, opacity: number, tint: string, fallbackColor: string): void {
    const tintColor = new THREE.Color(tint);
    const fallback = new THREE.Color(fallbackColor);
    obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const raw of materials) {
            const mat = raw as THREE.MeshStandardMaterial;
            if (!mat?.isMaterial) continue;

            mat.color.copy(mat.map ? tintColor : fallback);
            mat.opacity = opacity;
            // Usa cor escurecida pra simular dimming sem virar transparente,
            // o que quebraria a ordem de depth com as linhas de trajetória
            if (opacity < 1) {
                mat.color.multiplyScalar(opacity);
            }
        }
    });
}


/**
 * Renderiza um asteroide GLB selecionando uma variante pelo seed.
 *
 * Suporta packs de múltiplos asteroides no mesmo arquivo: coleta todos os
 * grupos-raiz com mesh, seleciona um pelo hash do seed, centraliza e normaliza.
 */
export default function RealAsteroidModel({ asset, opacity, seed, selected = false, outlineColor = '#7ee8fa', showOutline = true, tint = ROCK_TINT, fallbackColor = ROCK_FALLBACK_COLOR }: RealAsteroidModelProps) {
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

    /* Clone do model já selecionado com material de outline — mesma variante, mesma geometria. */
    const outlineModel = useMemo(() => {
        if (!selected || !showOutline) return null;
        const mat = createOutlineMaterial(outlineColor);
        const clone = model.clone(true);
        clone.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.material = mat;
            mesh.frustumCulled = false;
            mesh.renderOrder = 0;
        });
        return clone;
    }, [model, selected, outlineColor, showOutline]);

    // Clone e ajustes estáticos uma vez por modelo; dimming separado, in-place, sem novos clones.
    useEffect(() => {
        prepareMaterials(model, fallbackColor);
    }, [model, fallbackColor]);

    useEffect(() => {
        applyDimming(model, opacity, tint, fallbackColor);
    }, [model, opacity, tint, fallbackColor]);

    useEffect(() => {
        return () => {
            // Limpa geometrias e materiais criados localmente (clones do useMemo).
            // NÃO chama geometry.dispose() em geometrias que possam vir direto do
            // cache do useGLTF — apenas nas que foram explicitamente clonadas aqui.
            model.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                // Geometria foi clonada no useMemo (mesh.geometry.clone()) — é local.
                mesh.geometry?.dispose();
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                // Materiais foram clonados em applyMaterialDefaults (existing.clone()) — são locais.
                // Texturas dentro do material NÃO são descartadas: material.dispose() do Three.js
                // não descarta texturas por padrão, então isso já é seguro.
                materials.forEach((m) => m?.dispose());
            });
        };
    }, [model]);

    useEffect(() => {
        if (!outlineModel) return;
        return () => {
            // ShaderMaterial do outline é criado localmente em createOutlineMaterial — descarta ao sair.
            outlineModel.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => m?.dispose());
            });
        };
    }, [outlineModel]);

    return (
        <group rotation={asset.rotation} scale={scale}>
            {outlineModel ? <primitive object={outlineModel} /> : null}
            <primitive object={model} />
        </group>
    );
}
