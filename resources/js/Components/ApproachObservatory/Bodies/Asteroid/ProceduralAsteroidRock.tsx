import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { GenericAsteroidVariant } from './asteroidProcedural';
import { buildAsteroidGeometry, buildAsteroidSurfaceTextures } from './asteroidProcedural';

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
 * A geometria e as texturas são geradas a partir de uma semente estável, então
 * o mesmo objeto tende a manter a mesma aparência entre renderizações.
 */
export default function ProceduralAsteroidRock({
    seed,
    variant,
    opacity,
}: ProceduralAsteroidRockProps) {
    const rockGeometry = useMemo(() => buildAsteroidGeometry(seed, variant), [seed, variant]);

    useEffect(() => {
        return () => {
            rockGeometry.dispose();
        };
    }, [rockGeometry]);

    const surface = useMemo(() => {
        try {
            return buildAsteroidSurfaceTextures(seed, variant, 512);
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
