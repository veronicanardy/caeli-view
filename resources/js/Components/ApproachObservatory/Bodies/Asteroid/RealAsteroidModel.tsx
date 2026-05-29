import { useGLTF } from '@react-three/drei';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { AsteroidModelAsset } from './asteroidModelRegistry';

/**
 * Props do componente que renderiza um modelo GLB real de asteroide.
 */
interface RealAsteroidModelProps {
    asset: AsteroidModelAsset;
    opacity: number;
}

/**
 * Renderiza um modelo GLB real de asteroide e normaliza sua escala na cena.
 *
 * O objeto do GLTF é clonado antes de qualquer alteração para evitar mutar a
 * cena/material original retornada pelo cache do `useGLTF`.
 */
export default function RealAsteroidModel({ asset, opacity }: RealAsteroidModelProps) {
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
                    (styled as THREE.MeshStandardMaterial).roughness = Math.max(
                        (styled as THREE.MeshStandardMaterial).roughness ?? 0,
                        0.92,
                    );
                }

                if ('metalness' in styled) {
                    (styled as THREE.MeshStandardMaterial).metalness = Math.min(
                        (styled as THREE.MeshStandardMaterial).metalness ?? 0,
                        0.03,
                    );
                }

                return styled;
            });

            mesh.material = Array.isArray(mesh.material) ? styledMaterials : styledMaterials[0];
        });

        return { model: clone, scale: 2 / maxAxis };
    }, [gltf.scene, opacity]);

    useEffect(() => {
        return () => {
            model.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;

                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                materials.forEach((material) => {
                    material.dispose();
                });
            });
        };
    }, [model]);

    return (
        <group rotation={asset.rotation} scale={scale}>
            <primitive object={model} />
        </group>
    );
}
