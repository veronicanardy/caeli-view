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
        <div className="mx-3 mt-2.5 lg:mx-4">
            {/* Canvas do modelo: borda quase invisível, fundo com gradiente radial escuro para presença. */}
            <div className="relative h-28 overflow-hidden rounded-xl border border-white/6 lg:h-32"
                style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.04) 0%, rgba(3,6,13,0.95) 70%)' }}>
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
                {/* Caption integrado ao canto inferior do canvas, não flutuando abaixo. */}
                <p className="absolute bottom-1.5 right-2 text-[9px] text-white/25 tracking-wide">{caption}</p>
            </div>
        </div>
    );
}
