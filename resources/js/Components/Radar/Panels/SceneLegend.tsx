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
import { Tooltip } from '../Controls/Tooltip';

export function SceneLegend({
    lunarReference,
    locale,
    mode,
    manualOpen,
    onManualOpenChange,
    ephemerisAvailable = true,
}: {
    lunarReference: LunarReference;
    locale: 'pt-BR' | 'en';
    mode: SceneMode;
    manualOpen: boolean;
    onManualOpenChange: (open: boolean) => void;
    /** Quando false, a efeméride local (Astronomy Engine) não está disponível — Lua e iluminação usam fallback. */
    ephemerisAvailable?: boolean;
}) {
    const en = locale === 'en';
    const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

    return (
        /* Legenda visível apenas no desktop: no mobile o guia abre pela action bar
           inferior e o modal abaixo continua montado via portal. */
        <div className="cursor-auto pointer-events-auto absolute bottom-3 right-3 z-10 hidden overflow-hidden rounded-xl border border-white/20 bg-space-950/90 backdrop-blur-xl lg:block lg:w-[min(22rem,46%)]">
            <div className="hidden space-y-2 px-3 pt-3 lg:block">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-medium text-white/75">
                            <span style={{ fontFamily: 'serif' }}>☽</span>{en ? ' 1 LD · Earth-Moon distance' : ' 1 DL · distância Terra-Lua'}
                        </span>
                    <span className="font-semibold tabular-nums text-white">{nf.format(lunarReference.distanceKm)} km</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-white/75">
                        <span style={{ fontFamily: 'serif' }}>☉</span>{en ? ' 1 AU · Earth-Sun distance' : ' 1 UA · distância Terra-Sol'}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{nf.format(Math.round(KM_PER_AU))} km</span>
                </div>
                <div className="pb-1">
                    {!ephemerisAvailable ? (
                        <Tooltip
                            wrap
                            hideDelay={150}
                            content={en
                                ? 'Local ephemeris (Astronomy Engine) failed to load. Moon position and phase use a fallback. Error may reach several degrees.'
                                : 'Efeméride local (Astronomy Engine) falhou ao carregar. Posição e fase da Lua usam fallback. Erro pode chegar a alguns graus.'}
                        >
                            <p className="cursor-help text-[11px] leading-4 text-amber-400/50">
                                {en ? '⚠ Moon position: fallback (ephemeris unavailable)' : '⚠ Lua: fallback (efeméride indisponível)'}
                            </p>
                        </Tooltip>
                    ) : null}
                </div>
            </div>

            <button
                type="button"
                onClick={() => onManualOpenChange(true)}
                data-tutorial="radar-guide"
                aria-label={en ? (mode === 'radar' ? 'Open radar guide' : 'Open orbit guide') : (mode === 'radar' ? 'Abrir guia do radar' : 'Abrir guia da órbita')}
                className="mt-2 flex w-full items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-left text-[13px] font-semibold text-signal-cyan transition outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-signal-cyan"
            >
                <span className="inline-flex items-center gap-2">
                    <BookOpen className="size-4" aria-hidden />
                    <span>{en ? (mode === 'radar' ? 'Radar guide' : 'Orbit guide') : (mode === 'radar' ? 'Guia do radar' : 'Guia da órbita')}</span>
                </span>
                <ChevronDown className="-rotate-90 size-4" aria-hidden />
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
