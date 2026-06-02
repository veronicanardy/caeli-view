/**
 * Legenda e acesso ao manual da cena.
 *
 * Responsabilidade: exibir referências de escala e abrir o manual contextual do
 * modo atual, sem controlar câmera, seleção ou dados orbitais.
 */

import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { LunarReference } from '@/types';
import { KM_PER_AU } from '@/lib/sceneEphemeris';
import { MapManualModal } from '../Controls/MapManualModal';
import type { SceneMode } from '../Controls/Manual/manualTypes';

export function SceneLegend({
    lunarReference,
    locale,
    mode,
    manualOpen,
    onManualOpenChange,
}: {
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    mode: SceneMode;
    manualOpen: boolean;
    onManualOpenChange: (open: boolean) => void;
}) {
    const en = locale === 'en';
    const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

    return (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-10 w-auto lg:w-[min(22rem,46%)] overflow-hidden rounded-xl border border-white/20 bg-space-950/90 shadow-glow backdrop-blur-xl">
            <div className="hidden space-y-2 px-3 pt-3 lg:block">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-white/75">
                        {en ? '🌙 1 LD · Earth-Moon distance' : '🌙 1 DL · distância Terra-Lua'}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{nf.format(lunarReference.distanceKm)} km</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-white/75">
                        {en ? '☀️ 1 AU · Earth-Sun distance' : '☀️ 1 UA · distância Terra-Sol'}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{nf.format(Math.round(KM_PER_AU))} km</span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => onManualOpenChange(true)}
                className="flex w-full items-center justify-between gap-2 border-white/10 px-3 py-2.5 text-left text-[13px] font-semibold text-signal-cyan transition outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-signal-cyan lg:mt-2 lg:border-t"
            >
                <span className="inline-flex items-center gap-2">
                    <BookOpen className="size-4" aria-hidden />
                    <span className="hidden lg:inline">{en ? (mode === 'radar' ? 'Radar guide' : 'Orbit guide') : (mode === 'radar' ? 'Guia do radar' : 'Guia da órbita')}</span>
                </span>
                <ChevronDown className="-rotate-90 hidden size-4 lg:block" aria-hidden />
            </button>

            {manualOpen ? (
                createPortal(
                    <MapManualModal
                        mode={mode}
                        locale={locale}
                        lunarDistanceKm={lunarReference.distanceKm}
                        onClose={() => onManualOpenChange(false)}
                    />,
                    document.body,
                )
            ) : null}
        </div>
    );
}
