import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import type * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import RealAsteroidModel from '../Bodies/Asteroid/RealAsteroidModel';
import { asteroidRenderableModelFor } from '../Bodies/Asteroid/asteroidModelRegistry';

const REAL_ASSET_DISPLAY_NAMES: Record<string, { pt: string; en: string }> = {
    bennu:   { pt: 'Bennu',   en: 'Bennu' },
    ceres:   { pt: 'Ceres',   en: 'Ceres' },
    eros:    { pt: 'Eros',    en: 'Eros' },
    itokawa: { pt: 'Itokawa', en: 'Itokawa' },
    vesta:   { pt: 'Vesta',   en: 'Vesta' },
};

function SpinningAsteroid({ object }: { object: ClosestNowObject }) {
    const groupRef = useRef<THREE.Group>(null);
    const renderModel = asteroidRenderableModelFor(object);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.22;
            groupRef.current.rotation.x += delta * 0.06;
        }
    });

    return (
        <group ref={groupRef}>
            <RealAsteroidModel
                asset={renderModel.asset}
                opacity={1}
                seed={object.approach.id}
            />
        </group>
    );
}

export function AsteroidModelPreview({ object, locale }: { object: ClosestNowObject; locale: 'pt-BR' | 'en' }) {
    const en = locale === 'en';
    const renderModel = asteroidRenderableModelFor(object);
    const isReal = renderModel.asset.key !== 'generic';
    const realName = isReal ? REAL_ASSET_DISPLAY_NAMES[renderModel.asset.key] : null;

    const caption = isReal && realName
        ? (en ? `3D model of ${realName.en}` : `Modelo 3D de ${realName.pt}`)
        : (en ? 'Illustrative model' : 'Modelo ilustrativo');

    return (
        <div className="mx-2.5 mt-2 lg:mx-3">
            <div className="h-24 overflow-hidden rounded-lg border border-white/8 bg-black/30 lg:h-28">
                <Canvas
                    camera={{ position: [0, 0, 3.2], fov: 32 }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <ambientLight intensity={1.6} />
                    <directionalLight position={[3, 4, 3]} intensity={3.2} />
                    <directionalLight position={[-2, -1, -2]} intensity={1.4} color="#c8eeff" />
                    <directionalLight position={[0, -3, 2]} intensity={1.0} />
                    <Suspense fallback={null}>
                        <SpinningAsteroid object={object} />
                    </Suspense>
                </Canvas>
            </div>
            <p className="mt-1 text-center text-[10px] text-white/35">{caption}</p>
        </div>
    );
}
