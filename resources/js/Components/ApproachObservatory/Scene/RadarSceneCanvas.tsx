/**
 * Fronteira entre UI React e Canvas Three.js.
 *
 * Responsabilidade: criar o Canvas, fornecer áreas bloqueadas para labels e
 * traduzir intenções globais da interface em props granulares para `RadarScene`.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { LabelNoGoContext } from '../Overlays/SceneLabels';
import type { NoGoRect } from '../Overlays/SceneLabels';
import { CAMERA_FOV_DEG, MAX_CAMERA_DISTANCE } from './cameraConstants';
import type { FocusFraming } from './cameraFraming';
import type { PlanetId } from './planetConfig';
import type { CameraIntent } from './cameraIntent';
import { RadarScene } from './RadarScene';

type Props = {
    noGoRects: NoGoRect[];
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    orbitMode: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    cameraIntent: CameraIntent;
    focusTarget: FocusFraming | null;
    sunFocusTarget: FocusFraming | null;
    planetFocusTargets: Partial<Record<PlanetId, FocusFraming>>;
    ephemeris: SceneEphemeris | null;
    fallbackSunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    showLabels: boolean;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    onBodyCardOpenChange: (body: 'earth' | 'moon' | 'sun' | PlanetId | null) => void;
    onClearPlanetTargets: () => void;
    onFocusSun: () => void;
    onFocusPlanet: (id: PlanetId) => void;
    onFocusBody: (body: 'earth' | 'moon') => void;
};

/**
 * Fronteira entre a interface React e a cena Three.js.
 *
 * Mantém o Canvas, o provider de áreas bloqueadas para labels e a adaptação das
 * intenções globais do radar para as props granulares do RadarScene.
 */
export function RadarSceneCanvas({
    noGoRects,
    closestNowObjects,
    selectedId,
    orbitMode,
    onSelect,
    cameraIntent,
    focusTarget,
    sunFocusTarget,
    planetFocusTargets,
    ephemeris,
    fallbackSunDirection,
    locale,
    showLabels,
    bodyCardOpen,
    onBodyCardOpenChange,
    onClearPlanetTargets,
    onFocusSun,
    onFocusPlanet,
    onFocusBody,
}: Props) {
    const activeFocusTarget = focusTarget ?? sunFocusTarget ?? Object.values(planetFocusTargets)[0] ?? null;
    const [sceneReady, setSceneReady] = useState(false);

    return (
        <LabelNoGoContext.Provider value={noGoRects}>
            {!sceneReady && (
                <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#03060d]/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-space-950/90 px-4 py-2.5 text-[13px] text-white/70 shadow-glow">
                        <span className="size-2 animate-pulse rounded-full bg-signal-cyan" aria-hidden />
                        {locale === 'en' ? 'Loading…' : 'Carregando…'}
                    </div>
                </div>
            )}
            <Canvas
                camera={{ position: [0, 4.5, 9], fov: CAMERA_FOV_DEG, near: 0.01, far: MAX_CAMERA_DISTANCE * 3 }}
                dpr={[1, 1.6]}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            >
                <Suspense fallback={null}>
                    <RadarScene
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        orbitMode={orbitMode}
                        onSelect={(approach) => {
                            onBodyCardOpenChange(null);
                            onClearPlanetTargets();
                            onSelect(approach);
                        }}
                        cameraIntent={cameraIntent}
                        focusTarget={activeFocusTarget}
                        ephemeris={ephemeris}
                        fallbackSunDirection={fallbackSunDirection}
                        locale={locale}
                        showLabels={showLabels}
                        onFirstFrame={() => setSceneReady(true)}
                        onFocusSun={onFocusSun}
                        isSunFocused={bodyCardOpen === 'sun'}
                        onFocusMercury={() => onFocusPlanet('mercury')}
                        isMercuryFocused={bodyCardOpen === 'mercury'}
                        onFocusVenus={() => onFocusPlanet('venus')}
                        isVenusFocused={bodyCardOpen === 'venus'}
                        onFocusMars={() => onFocusPlanet('mars')}
                        isMarsFocused={bodyCardOpen === 'mars'}
                        onFocusJupiter={() => onFocusPlanet('jupiter')}
                        isJupiterFocused={bodyCardOpen === 'jupiter'}
                        onFocusSaturn={() => onFocusPlanet('saturn')}
                        isSaturnFocused={bodyCardOpen === 'saturn'}
                        onFocusUranus={() => onFocusPlanet('uranus')}
                        isUranusFocused={bodyCardOpen === 'uranus'}
                        onFocusNeptune={() => onFocusPlanet('neptune')}
                        isNeptuneFocused={bodyCardOpen === 'neptune'}
                        onFocusBody={onFocusBody}
                    />
                </Suspense>
            </Canvas>
        </LabelNoGoContext.Provider>
    );
}
