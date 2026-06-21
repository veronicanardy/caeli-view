/**
 * Overlays flutuantes da experiência 3D.
 *
 * Responsabilidade: agrupar cards, loading, toasts e legenda posicionados sobre
 * o canvas, mantendo o componente principal livre de UI sobreposta.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ClosestNowObject, LunarReference, UnifiedApproach } from '@/types';
import type { SceneMode } from '../Controls/Manual/manualTypes';
import { OrbitWelcomeToast, RadarWelcomeToast } from '../Controls/WelcomeToast';
import type { PlanetId } from '../Scene/planetConfig';
import { UnifiedFocusCard } from './UnifiedFocusCard';
import { SceneLegend } from './SceneLegend';
import { knownCometById } from '../Bodies/Comet/knownComets';

type Props = {
    en: boolean;
    locale: 'pt-BR' | 'en';
    /** Desktop: painel de navegação recolhido — os cards do trilho sobem junto. */
    desktopPanelCollapsed: boolean;
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
    ephemerisAvailable: boolean;
};

/** Formata o tempo decorrido desde `since` em texto curto (ex: "há 2 min", "just now"). */
function useElapsedLabel(since: Date | null, en: boolean): string {
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!since) { setLabel(''); return; }

        const update = () => {
            const sec = Math.floor((Date.now() - since.getTime()) / 1000);
            if (sec < 15) {
                setLabel(en ? 'just now' : 'agora mesmo');
            } else if (sec < 60) {
                setLabel(en ? `${sec}s ago` : `${sec}s atrás`);
            } else {
                const min = Math.floor(sec / 60);
                setLabel(en ? `${min} min ago` : `há ${min} min`);
            }
        };

        update();
        const id = setInterval(update, 15_000);
        return () => clearInterval(id);
    }, [since, en]);

    return label;
}

export function RadarFloatingOverlays({
    en,
    locale,
    desktopPanelCollapsed,
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
    ephemerisAvailable,
}: Props) {
    // Registra quando o radar terminou de carregar pela última vez.
    // O estado inicial é sempre null: o timestamp só é confiável após observar
    // a transição real loading true→false, nunca no momento do mount.
    const prevLoading = useRef(radarLoading);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    useEffect(() => {
        if (prevLoading.current && !radarLoading) setLastUpdated(new Date());
        prevLoading.current = radarLoading;
    }, [radarLoading]);

    const elapsedLabel = useElapsedLabel(lastUpdated, en);

    return (
        <>
            {visibleFocusedObject ? (
                <UnifiedFocusCard
                    kind="asteroid"
                    object={visibleFocusedObject}
                    onOpenFocus={onOpenFocus}
                    onClose={onCloseFocusedObject}
                    orbitMode={orbitMode}
                    hasOrbit={Boolean(visibleFocusedObject.trajectory?.orbitalElements ?? knownCometById(visibleFocusedObject.approach.id)?.elements)}
                    canShowOrbitPosition={canShowOrbitPosition}
                    onShowOrbit={onShowOrbit}
                    onShowCloseUp={onShowCloseUp}
                    locale={locale}
                    onShowPanel={onShowNavigationPanel}
                    panelRef={focusCardRef}
                    desktopPanelCollapsed={desktopPanelCollapsed}
                />
            ) : bodyCardOpen ? (
                <UnifiedFocusCard
                    kind="body"
                    body={bodyCardOpen}
                    onClose={() => onBodyCardOpenChange(null)}
                    locale={locale}
                    panelRef={bodyCardRef}
                    desktopPanelCollapsed={desktopPanelCollapsed}
                />
            ) : null}

            {/* Mobile: pills no canto superior esquerdo (rodapé pertence à action bar e
                o topo direito à toolbar). Desktop: permanecem na base da cena. */}
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5 lg:left-1/2 lg:top-auto lg:bottom-3 lg:-translate-x-1/2 lg:items-center">
                <div className="flex items-center gap-2">
                    <h2 className="hidden text-[11px] font-medium text-white/40 lg:block">
                        {en ? 'Orbital radar · 3D' : 'Radar orbital · 3D'}
                    </h2>
                    {/* Pill dinâmico: pulsa enquanto carrega, mostra tempo decorrido quando estável. */}
                    {radarLoading ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/30 bg-signal-cyan/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-signal-cyan/70">
                        <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan/70" aria-hidden />
                        {en ? 'Updating…' : 'Atualizando…'}
                    </span>
                ) : elapsedLabel ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-signal-cyan/25 bg-signal-cyan/8 px-1.5 py-0.5 text-[9px] font-medium text-signal-cyan/60">
                        <span className="size-1.5 rounded-full bg-signal-cyan/50" aria-hidden />
                        {elapsedLabel}
                    </span>
                ) : null}
                </div>
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
                ephemerisAvailable={ephemerisAvailable}
            />
        </>
    );
}
