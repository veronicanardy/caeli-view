/**
 * Fronteira entre UI React e Canvas Three.js.
 *
 * Responsabilidade: criar o Canvas, fornecer áreas bloqueadas para labels e
 * traduzir intenções globais da interface em props granulares para `RadarScene`.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { LabelNoGoContext } from '../Overlays/SceneLabels';
import type { NoGoRect } from '../Overlays/SceneLabels';
import { CAMERA_FOV_DEG, CAMERA_NEAR, CAMERA_VIEWS, MAX_CAMERA_DISTANCE } from './cameraConstants';
import { CameraTweenContext } from './CameraTweenContext';
import type { TweenTo } from './CameraTweenContext';
import type { FocusFraming } from './cameraFraming';
import type { PlanetId } from './planetConfig';
import type { CameraIntent } from './cameraIntent';
import { RadarScene } from './RadarScene';
import { preloadRealAsteroidModels } from '../Bodies/Asteroid/asteroidModelRegistry';
import { preloadCometModels } from '../Bodies/Comet/cometModelRegistry';
import { ZoomHintContext, type ZoomHintState } from '../Bodies/Asteroid/ZoomHintContext';
import { ZoomHintOverlay } from '../Bodies/Asteroid/ZoomHintOverlay';
import { PerfProbe, isPerfProbeEnabled } from '../Dev/PerfProbe';

type Props = {
    noGoRects: NoGoRect[];
    panelBiasX: number;
    panelBiasY: number;
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    orbitMode: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    cameraIntent: CameraIntent;
    focusTarget: FocusFraming | null;
    sunFocusTarget: FocusFraming | null;
    /** Enquadramento dos asteroides famosos (voo a um conhecido ou panorama da régua dos planetas). */
    knownFocusTarget: FocusFraming | null;
    planetFocusTargets: Partial<Record<PlanetId, FocusFraming>>;
    ephemeris: SceneEphemeris | null;
    fallbackSunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    showLabels: boolean;
    sceneNavigationEnabled?: boolean;
    /** Mostra os asteroides conhecidos na régua dos planetas (critério "famosos"). */
    showKnownAsteroids: boolean;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    onFocusSun: () => void;
    onFocusPlanet: (id: PlanetId) => void;
    onFocusBody: (body: 'earth' | 'moon') => void;
    onFocusTrajectoryPoint?: (framing: FocusFraming) => void;
};

/**
 * Fronteira entre a interface React e a cena Three.js.
 *
 * Mantém o Canvas, o provider de áreas bloqueadas para labels e a adaptação das
 * intenções globais do radar para as props granulares do RadarScene.
 */
export function RadarSceneCanvas({
    noGoRects,
    panelBiasX,
    panelBiasY,
    closestNowObjects,
    selectedId,
    orbitMode,
    onSelect,
    cameraIntent,
    focusTarget,
    sunFocusTarget,
    knownFocusTarget,
    planetFocusTargets,
    ephemeris,
    fallbackSunDirection,
    locale,
    showLabels,
    sceneNavigationEnabled = true,
    showKnownAsteroids,
    bodyCardOpen,
    onFocusSun,
    onFocusPlanet,
    onFocusBody,
    onFocusTrajectoryPoint,
}: Props) {
    // Prioridade de foco: seleção de objeto > foco no Sol > conhecido (famosos) > foco em planeta.
    // Garante que a câmera siga a seleção do usuário antes de qualquer alvo secundário.
    const activeFocusTarget = focusTarget ?? sunFocusTarget ?? knownFocusTarget ?? Object.values(planetFocusTargets)[0] ?? null;
    const [sceneReady, setSceneReady] = useState(false);
    const tweenToRef = useRef<TweenTo>(() => {});
    const [zoomHintState, setZoomHintState] = useState<ZoomHintState | null>(null);

    return (
        <ZoomHintContext.Provider value={{ state: zoomHintState, setState: setZoomHintState }}>
        <CameraTweenContext.Provider value={tweenToRef}>
        <LabelNoGoContext.Provider value={noGoRects}>
            <Canvas
                camera={{ position: CAMERA_VIEWS.perspective.toArray(), fov: CAMERA_FOV_DEG, near: CAMERA_NEAR, far: MAX_CAMERA_DISTANCE * 3 }}
                dpr={[1, 1.6]}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            >
                {/* Sonda de performance dev-only (?perf na URL). Remoção: apagar a pasta Dev/ e estas linhas. */}
                {isPerfProbeEnabled() ? <PerfProbe /> : null}
                <Suspense fallback={null}>
                    <RadarScene
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        orbitMode={orbitMode}
                        onSelect={onSelect}
                        cameraIntent={cameraIntent}
                        focusTarget={activeFocusTarget}
                        panelBiasX={panelBiasX}
                        panelBiasY={panelBiasY}
                        ephemeris={ephemeris}
                        fallbackSunDirection={fallbackSunDirection}
                        locale={locale}
                        showLabels={showLabels}
                        sceneNavigationEnabled={sceneNavigationEnabled}
                        showKnownAsteroids={showKnownAsteroids}
                        onFirstFrame={() => {
                            setSceneReady(true);
                            // Adia o preload dos modelos reais para depois do primeiro frame:
                            // evita competição com recursos críticos durante o carregamento inicial.
                            setTimeout(preloadRealAsteroidModels, 2000);
                            setTimeout(preloadCometModels, 2000);
                        }}
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
                        onFocusTrajectoryPoint={onFocusTrajectoryPoint}
                    />
                </Suspense>
            </Canvas>
            {/* Overlay de carregamento DEPOIS do Canvas no DOM e com z acima dos labels da cena: o drei
                <Html> monta os rótulos (Terra etc.) num container próprio dentro do pai do canvas, fora
                do contexto de empilhamento deste overlay; se o overlay viesse antes e com z baixo, os
                rótulos furavam o "Carregando…". Posicionado por último e em z-40, ele cobre tudo. */}
            {!sceneReady && (
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#03060d]/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-space-950/90 px-4 py-2.5 text-[13px] text-white/70 shadow-glow">
                        <span className="size-2 animate-pulse rounded-full bg-signal-cyan" aria-hidden />
                        {locale === 'en' ? 'Loading…' : 'Carregando…'}
                    </div>
                </div>
            )}
        </LabelNoGoContext.Provider>
        </CameraTweenContext.Provider>
        <ZoomHintOverlay />
        </ZoomHintContext.Provider>
    );
}
