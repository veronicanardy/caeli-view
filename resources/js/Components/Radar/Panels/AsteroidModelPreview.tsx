/**
 * Preview 3D do asteroide selecionado no card de foco.
 *
 * Responsabilidade: exibir o modelo GLB real (ou genérico) do objeto focado em
 * um Canvas isolado com rotação automática e iluminação própria. Não interfere
 * com a cena principal nem com a seleção global.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, Suspense, useEffect } from 'react';
import type * as THREE from 'three';
import type { ClosestNowObject } from '@/types';
import type { AsteroidModelAsset } from '../Bodies/Asteroid/asteroidModelRegistry';
import RealAsteroidModel from '../Bodies/Asteroid/RealAsteroidModel';
import { asteroidRenderableModelFor } from '../Bodies/Asteroid/asteroidModelRegistry';
import { cometModelForObject, COMET_67P_COLOR_PREVIEW } from '../Bodies/Comet/cometModelRegistry';
import { knownCometById } from '../Bodies/Comet/knownComets';

const REAL_ASSET_DISPLAY_NAMES: Record<string, { pt: string; en: string }> = {
    bennu:   { pt: 'Bennu',   en: 'Bennu' },
    ceres:   { pt: 'Ceres',   en: 'Ceres' },
    eros:    { pt: 'Eros',    en: 'Eros' },
    itokawa: { pt: 'Itokawa', en: 'Itokawa' },
    vesta:   { pt: 'Vesta',   en: 'Vesta' },
};

/**
 * Modelo a exibir no preview: cometa usa seu núcleo real (cometModelForObject); o resto, o modelo de
 * asteroide. Adaptado ao shape de AsteroidModelAsset que o RealAsteroidModel consome.
 */
function previewAsset(object: ClosestNowObject): AsteroidModelAsset {
    const comet = cometModelForObject(object);
    if (comet) {
        return { key: 'generic', url: comet.url, rotation: comet.rotation, aliases: [], numbers: [] };
    }
    return asteroidRenderableModelFor(object).asset;
}

/** Descarta o renderer deste Canvas ao desmontar, evitando Context Lost no Canvas principal. */
function RendererCleanup() {
    const { gl } = useThree();
    useEffect(() => () => { gl.dispose(); }, [gl]);
    return null;
}

function SpinningAsteroid({ object }: { object: ClosestNowObject }) {
    const groupRef = useRef<THREE.Group>(null);
    const asset = previewAsset(object);
    const is67P = cometModelForObject(object)?.key === 'c67p';

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.22;
            groupRef.current.rotation.x += delta * 0.06;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Cometa e asteroide reusam o mesmo GLB genérico texturizado, então a cor bate sem ajuste. O
                67P tem GLB próprio SEM textura (cinza claro embutido), então recebe a cor escura dedicada. */}
            <RealAsteroidModel
                asset={asset}
                opacity={1}
                seed={object.approach.id}
                {...(is67P ? { fallbackColor: COMET_67P_COLOR_PREVIEW } : {})}
            />
        </group>
    );
}

export function AsteroidModelPreview({ object, locale }: { object: ClosestNowObject; locale: 'pt-BR' | 'en' }) {
    const en = locale === 'en';

    const caption = (() => {
        // Cometa: legenda honesta sobre a origem do núcleo. 67P é o shape model real (Rosetta); os demais
        // usam um núcleo genérico (mesmo modelo dos asteroides), então é "ilustrativo".
        if (object.approach.objectType === 'comet') {
            const comet = knownCometById(object.approach.id);
            if (comet?.modelKey === 'c67p') {
                return en ? '3D model of 67P (Rosetta)' : 'Modelo 3D do 67P (Rosetta)';
            }
            return en ? 'Illustrative nucleus' : 'Núcleo ilustrativo';
        }
        const asset = asteroidRenderableModelFor(object).asset;
        const realName = asset.key !== 'generic' ? REAL_ASSET_DISPLAY_NAMES[asset.key] : null;
        return realName
            ? (en ? `3D model of ${realName.en}` : `Modelo 3D de ${realName.pt}`)
            : (en ? 'Illustrative model' : 'Modelo ilustrativo');
    })();

    return (
        <div className="mx-3 mt-1.5 lg:mx-4 lg:mt-2.5">
            {/* Canvas do modelo: borda quase invisível, fundo com gradiente radial escuro para presença.
               Desktop: altura fluida em vh para o card do trilho caber em telas baixas (768p) sem cortar o rodapé. */}
            <div className="relative h-14 overflow-hidden rounded-xl border border-white/6 lg:h-[clamp(3.5rem,9vh,7rem)]"
                style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, rgba(3,6,13,0.95) 70%)' }}>
                <Canvas
                    camera={{ position: [0, 0, 3.2], fov: 32 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <RendererCleanup />
                    {/* Vitrine iluminada (mais que a cena, mas sem lavar): o card mostra o modelo, então
                        corpos escuros precisam aparecer contra o fundo escuro. A direcional é a principal
                        (puxa o relevo); o ambiente fica moderado pra não chapar a textura. Luz global. */}
                    <ambientLight intensity={1.3} />
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
