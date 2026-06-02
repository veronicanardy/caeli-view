import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { GenericAsteroidVariant } from './asteroidProcedural';
import {
    asteroidMaterialProfile,
    buildAsteroidGeometry,
    buildAsteroidSurfaceTextures,
} from './asteroidProcedural';

/**
 * Props do componente de rocha procedural que renderiza asteroides genéricos.
 */
interface ProceduralAsteroidRockProps {
    seed: string;
    variant: GenericAsteroidVariant;
    opacity: number;
}

/**
 * Renderiza uma rocha procedural determinística para asteroides sem modelo real.
 *
 * A geometria, as texturas e o material são memoizados por seed/variante para
 * evitar recriação a cada render e manter custo previsível no navegador.
 */
export default function ProceduralAsteroidRock({
    seed,
    variant,
    opacity,
}: ProceduralAsteroidRockProps) {
    const rockGeometry = useMemo(() => buildAsteroidGeometry(seed, variant), [seed, variant]);
    const surfaceProfile = useMemo(() => asteroidMaterialProfile(variant), [variant]);

    useEffect(() => {
        return () => {
            rockGeometry.dispose();
        };
    }, [rockGeometry]);

    const surface = useMemo(() => {
        try {
            return buildAsteroidSurfaceTextures(seed, variant, 768);
        } catch {
            return null;
        }
    }, [seed, variant]);

    useEffect(() => {
        return () => {
            surface?.map.dispose();
            surface?.bump.dispose();
            surface?.roughness.dispose();
        };
    }, [surface]);

    const material = useMemo(() => {
        const nextMaterial = new THREE.MeshStandardMaterial({
            color: '#2f3136',
            vertexColors: true,
            map: surface?.map,
            bumpMap: surface?.bump,
            bumpScale: surfaceProfile.bumpScale,
            roughnessMap: surface?.roughness,
            emissive: '#17191d',
            emissiveIntensity: 0.028,
            roughness: surfaceProfile.roughness,
            metalness: 0,
            flatShading: false,
            dithering: true,
            transparent: true,
            opacity: 1,
        });

        nextMaterial.toneMapped = true;
        nextMaterial.normalScale.set(0.82, 0.82);

        return nextMaterial;
    }, [surface, surfaceProfile.bumpScale, surfaceProfile.roughness]);

    useEffect(() => {
        material.opacity = opacity;
        material.needsUpdate = true;
    }, [material, opacity]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    return (
        <mesh geometry={rockGeometry} material={material} />
    );
}
