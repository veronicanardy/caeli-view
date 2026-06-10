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
    cardOpen = false,
    ephemerisAvailable = true,
}: {
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    mode: SceneMode;
    manualOpen: boolean;
    onManualOpenChange: (open: boolean) => void;
    /** No mobile, esconde a legenda quando o card de detalhe está aberto para não competir com o bottom sheet. */
    cardOpen?: boolean;
    /** Quando false, a efeméride local (Astronomy Engine) não está disponível — Lua e iluminação usam fallback. */
    ephemerisAvailable?: boolean;
}) {
    const en = locale === 'en';
    const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

    return (
        /* No mobile: botão compacto no canto inferior direito, oculto quando card de detalhe está aberto.
           No desktop: card expandido com dados de referência de escala. */
        <div className={`pointer-events-auto absolute bottom-3 right-3 z-10 overflow-hidden rounded-xl border border-white/20 bg-space-950/90 shadow-glow backdrop-blur-xl lg:w-[min(22rem,46%)] ${cardOpen ? 'hidden lg:block' : ''}`}>
            <div className="hidden space-y-2 px-3 pt-3 lg:block">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span
                        className="font-medium text-white/75"
                        title={en ? 'Current Earth-Moon distance — varies from ~356,500 km (perigee) to ~406,700 km (apogee). Used as the scene scale ruler.' : 'Distância Terra-Lua atual — varia de ~356.500 km (perigeu) a ~406.700 km (apogeu). Usada como régua de escala da cena.'}
                    >
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
                <div className="pb-1">
                    {!ephemerisAvailable ? (
                        <p className="text-[11px] leading-4 text-amber-400/50"
                            title={en
                                ? 'Local ephemeris (Astronomy Engine) failed to load. Moon position and phase use a fallback — error may reach several degrees.'
                                : 'Efeméride local (Astronomy Engine) falhou ao carregar. Posição e fase da Lua usam fallback — erro pode chegar a alguns graus.'}>
                            {en ? '⚠ Moon position: fallback (ephemeris unavailable)' : '⚠ Lua: fallback (efeméride indisponível)'}
                        </p>
                    ) : null}
                </div>
            </div>

            <button
                type="button"
                onClick={() => onManualOpenChange(true)}
                aria-label={en ? (mode === 'radar' ? 'Open radar guide' : 'Open orbit guide') : (mode === 'radar' ? 'Abrir guia do radar' : 'Abrir guia da órbita')}
                /* py-2.5 no mobile garante área de toque adequada */
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
