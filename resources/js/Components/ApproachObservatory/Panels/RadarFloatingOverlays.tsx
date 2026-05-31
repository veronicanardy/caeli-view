import type { RefObject } from 'react';
import type { ClosestNowObject, LunarReference, UnifiedApproach } from '@/types';
import type { SceneMode } from '../Controls/MapManualModal';
import { OrbitWelcomeToast, RadarWelcomeToast } from '../Controls/WelcomeToast';
import type { PlanetId } from '../Scene/planetConfig';
import { BodyInfoCard } from './BodyInfoCard';
import { FocusCard } from './FocusCard';
import { SceneLegend } from './SceneLegend';

type Props = {
    en: boolean;
    locale: 'pt-BR' | 'en';
    visibleFocusedObject: ClosestNowObject | null;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    onCloseFocusedObject: () => void;
    orbitMode: boolean;
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    onShowNavigationPanel: () => void;
    focusCardRef: RefObject<HTMLDivElement | null>;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    onBodyCardOpenChange: (body: 'earth' | 'moon' | 'sun' | PlanetId | null) => void;
    bodyCardRef: RefObject<HTMLDivElement | null>;
    sceneTransitioning: boolean;
    radarLoading: boolean;
    activeMode: SceneMode;
    manualOpen: boolean;
    onManualOpenChange: (open: boolean) => void;
    lunarReference: LunarReference;
};

/**
 * Camada de overlays da experiência 3D.
 *
 * Agrupa cards flutuantes, badge inferior, loading, toasts e legenda para manter o
 * componente principal livre de UI posicionada sobre o canvas.
 */
export function RadarFloatingOverlays({
    en,
    locale,
    visibleFocusedObject,
    onOpenFocus,
    onCloseFocusedObject,
    orbitMode,
    canShowOrbitPosition,
    onShowOrbit,
    onShowCloseUp,
    onShowNavigationPanel,
    focusCardRef,
    bodyCardOpen,
    onBodyCardOpenChange,
    bodyCardRef,
    sceneTransitioning,
    radarLoading,
    activeMode,
    manualOpen,
    onManualOpenChange,
    lunarReference,
}: Props) {
    return (
        <>
            {visibleFocusedObject ? (
                <FocusCard
                    object={visibleFocusedObject}
                    onOpenFocus={onOpenFocus}
                    onClose={onCloseFocusedObject}
                    orbitMode={orbitMode}
                    hasOrbit={Boolean(visibleFocusedObject.trajectory?.orbitalElements)}
                    canShowOrbitPosition={canShowOrbitPosition}
                    onShowOrbit={onShowOrbit}
                    onShowCloseUp={onShowCloseUp}
                    locale={locale}
                    mobileTopAlign={false}
                    onShowPanel={onShowNavigationPanel}
                    panelRef={focusCardRef}
                />
            ) : bodyCardOpen ? (
                <BodyInfoCard
                    body={bodyCardOpen}
                    onClose={() => onBodyCardOpenChange(null)}
                    locale={locale}
                    mobileTopAlign={false}
                    panelRef={bodyCardRef}
                />
            ) : null}

            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                <h2 className="text-[11px] font-medium text-white/40">
                    {en ? 'Orbital radar · 3D' : 'Radar orbital · 3D'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/30 bg-signal-cyan/8 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-signal-cyan/70">
                    {en ? 'Live' : 'Ao vivo'}
                </span>
            </div>

            {(sceneTransitioning || radarLoading) ? (
                <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#03060d]/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-space-950/90 px-4 py-2.5 text-[13px] text-white/70 shadow-glow">
                        <span className="size-2 animate-pulse rounded-full bg-signal-cyan" aria-hidden />
                        {en ? 'Loading…' : 'Carregando…'}
                    </div>
                </div>
            ) : null}

            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                {activeMode === 'radar'
                    ? <RadarWelcomeToast locale={locale} onOpenManual={() => onManualOpenChange(true)} />
                    : <OrbitWelcomeToast locale={locale} onOpenManual={() => onManualOpenChange(true)} />}
            </div>

            <SceneLegend
                lunarReference={lunarReference}
                locale={locale}
                mode={activeMode}
                manualOpen={manualOpen}
                onManualOpenChange={onManualOpenChange}
            />
        </>
    );
}
