/**
 * Modelo GLB real de uma nave (Voyager, Juno, Pioneer 10, New Horizons).
 *
 * Responsabilidade: carregar o GLB oficial da NASA e exibi-lo centralizado e normalizado, com a cor real
 * da NASA visível. Não decide qual modelo usar nem a posição (isso é do spacecraftModelRegistry e da
 * camada de cena).
 *
 * Iluminação: as naves ficam a dezenas de MILHARES de unidades da origem, longe das luzes da cena, e o
 * GLB é quase todo metálico. Material metálico sem environment map + sem luz fica preto/invisível. Para a
 * nave aparecer com a cor real, mexemos no material ORIGINAL (MeshStandard) in-place, com cuidado: baixamos
 * o metalness (metal puro = preto) e damos um emissivo leve com a própria cor/textura da NASA (a cor real
 * "acende" sozinha, sem inventar cor e sem depender das luzes distantes). Sem trocar o tipo de material
 * (trocar por MeshBasic quebrava o pipeline) e sem contorno de seleção (dava aspecto de "raio-X").
 */

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SpacecraftModelAsset } from './spacecraftModelRegistry';

/**
 * Brilho próprio (emissivo) do corpo da nave: a textura/cor real da NASA "acende" o bastante para a nave
 * ser visível tão longe das luzes da cena, sem chapar. Calibrável vendo na tela: mais alto = mais aceso
 * (chapa); mais baixo = mais escuro/com volume das luzes, mas pode escurecer demais. ~0,45 é o meio-termo.
 */
const SPACECRAFT_EMISSIVE = 0.45;

type SpacecraftModelProps = {
    asset: SpacecraftModelAsset;
    /** Opacidade do conjunto (esmaecimento quando há outra nave focada). */
    opacity: number;
};

/**
 * Renderiza o GLB da nave centralizado (via offset de grupo) e normalizado (maior eixo = 2), iluminando
 * o material da NASA por emissivo para ele aparecer longe das luzes da cena.
 */
export function SpacecraftModel({ asset, opacity }: SpacecraftModelProps) {
    const gltf = useGLTF(asset.url) as { scene: THREE.Group };

    // Clona a cena uma vez (para não mexer no cache do useGLTF) e calcula offset de centralização + escala.
    const { scene, offset, scale } = useMemo(() => {
        const clone = gltf.scene.clone(true);
        const box = new THREE.Box3().setFromObject(clone);
        if (box.isEmpty()) return { scene: clone, offset: new THREE.Vector3(), scale: 1 };
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;
        // Centraliza pelo TRANSFORM do grupo (offset = -center), sem cirurgia de geometria (mais seguro).
        return { scene: clone, offset: center.clone().multiplyScalar(-1), scale: 2 / maxAxis };
    }, [gltf.scene, asset.url]);

    // Guarda o estado original de cada material (opacidade) para o esmaecimento restaurar fielmente.
    const originals = useRef(new WeakMap<THREE.Material, { opacity: number; transparent: boolean }>());

    // Ilumina o material da NASA (emissivo com a própria cor/textura) e doma o metalness — in-place, no
    // material original MeshStandard (não troca o tipo). Roda uma vez por modelo.
    useEffect(() => {
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.material) return;
            mesh.frustumCulled = false;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const raw of mats) {
                const mat = raw as THREE.MeshStandardMaterial;
                if (!mat || !mat.isMaterial) continue;
                if (!originals.current.has(mat)) {
                    originals.current.set(mat, { opacity: mat.opacity, transparent: mat.transparent });
                }
                if (mat.isMeshStandardMaterial) {
                    mat.metalness = Math.min(mat.metalness, 0.25);
                    mat.roughness = Math.max(mat.roughness, 0.5);
                    mat.envMapIntensity = 0.4;
                    // Emissivo carrega a cor real: a textura quando há, senão a cor base do material.
                    if (mat.map) {
                        mat.emissiveMap = mat.map;
                        mat.emissive = new THREE.Color(0xffffff);
                    } else {
                        mat.emissive = (mat.color ?? new THREE.Color(0x888888)).clone();
                    }
                    mat.emissiveIntensity = SPACECRAFT_EMISSIVE;
                    mat.needsUpdate = true;
                }
            }
        });
    }, [scene]);

    // Esmaecimento quando OUTRA nave está focada. Restaura a opacidade original quando opacity >= 1.
    useEffect(() => {
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.material) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const raw of mats) {
                const mat = raw as THREE.Material;
                if (!mat?.isMaterial) continue;
                const orig = originals.current.get(mat) ?? { opacity: mat.opacity, transparent: mat.transparent };
                if (opacity >= 1) {
                    mat.transparent = orig.transparent;
                    mat.opacity = orig.opacity;
                } else {
                    mat.transparent = true;
                    mat.opacity = orig.opacity * opacity;
                }
            }
        });
    }, [scene, opacity]);

    return (
        <group scale={scale}>
            <group position={offset}>
                <group rotation={asset.rotation}>
                    <primitive object={scene} />
                </group>
            </group>
        </group>
    );
}
