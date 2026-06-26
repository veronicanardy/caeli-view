/**
 * Modelo GLB real de uma nave (Voyager, Juno, Pioneer 10, New Horizons).
 *
 * Responsabilidade: carregar o GLB oficial da NASA, centralizá-lo e normalizá-lo (maior eixo = 2),
 * preservando os materiais originais da NASA (a nave já vem texturizada/colorida, ao contrário dos
 * shape models "pelados" de asteroide). Aplica opacidade (esmaecimento) e um contorno de seleção.
 * Não decide qual modelo usar nem posição: isso é do spacecraftModelRegistry e da camada de cena.
 *
 * Diferente de RealAsteroidModel: NÃO recolore nem força flatShading. Naves têm material próprio e
 * legível; só ajustamos opacidade e contorno. Por isso é um componente separado, não um parâmetro.
 */

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { SpacecraftModelAsset } from './spacecraftModelRegistry';

/* Contorno por expansão de normal na back-face, igual ao dos asteroides: segue a silhueta real. */
const OUTLINE_VERTEX = `
    void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec4 pos = modelViewMatrix * vec4(position, 1.0);
        pos.xyz += n * 0.0008;
        gl_Position = projectionMatrix * pos;
    }
`;
const OUTLINE_FRAGMENT = `
    uniform vec3 uColor;
    void main() {
        gl_FragColor = vec4(uColor, 0.55);
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

type SpacecraftModelProps = {
    asset: SpacecraftModelAsset;
    /** Opacidade do conjunto (esmaecimento quando há outra seleção). */
    opacity: number;
    /** Quando selecionada/hover, desenha o contorno ciano. */
    selected?: boolean;
    showOutline?: boolean;
    outlineColor?: string;
};

/**
 * Renderiza o GLB da nave centralizado e normalizado (maior eixo = 2), preservando os materiais da
 * NASA. A escala final na cena é aplicada por um <group scale> externo (camada de cena), igual aos
 * outros corpos.
 */
export function SpacecraftModel({ asset, opacity, selected = false, showOutline = true, outlineColor = '#7ee8fa' }: SpacecraftModelProps) {
    const gltf = useGLTF(asset.url) as { scene: THREE.Group };

    // Clona a cena, centraliza na origem e calcula a escala de normalização (maior eixo = 2).
    const { model, scale } = useMemo(() => {
        const clone = gltf.scene.clone(true);
        clone.updateWorldMatrix(true, true);

        const box = new THREE.Box3().setFromObject(clone);
        if (box.isEmpty()) return { model: clone, scale: 1 };

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        // Centraliza movendo a geometria de cada mesh (não o transform), para o pivô ficar no centro.
        clone.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.geometry) return;
            const localCenter = mesh.worldToLocal(center.clone());
            mesh.geometry = mesh.geometry.clone();
            mesh.geometry.translate(-localCenter.x, -localCenter.y, -localCenter.z);
            mesh.frustumCulled = false;
            mesh.renderOrder = 1;
        });

        return { model: clone, scale: 2 / maxAxis };
    }, [gltf.scene, asset.url]);

    // Clona os materiais uma vez (para mexer em opacidade sem afetar o cache do GLB) e preserva o resto.
    useEffect(() => {
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mesh.material = mats.map((m) => (m as THREE.Material).clone());
        });
    }, [model]);

    // Opacidade in-place: a nave esmaece quando outra está selecionada.
    useEffect(() => {
        model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const raw of mats) {
                const mat = raw as THREE.Material;
                if (!mat?.isMaterial) continue;
                mat.transparent = opacity < 1;
                mat.opacity = opacity;
                mat.depthWrite = opacity >= 1;
            }
        });
    }, [model, opacity]);

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
    }, [model, selected, showOutline, outlineColor]);

    useEffect(() => {
        return () => {
            model.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                mesh.geometry?.dispose();
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => (m as THREE.Material)?.dispose());
            });
        };
    }, [model]);

    useEffect(() => {
        if (!outlineModel) return;
        return () => {
            outlineModel.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => (m as THREE.Material)?.dispose());
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
