/**
 * Overlay de carregamento do radar com barra de progresso animada.
 *
 * Responsabilidade: escurecer a cena enquanto o radar carrega e mostrar uma barra
 * que avança de 0 a 100% de forma suave, ancorada nas etapas reais do carregamento
 * (ver `useLoadingProgress` e `lib/radar/loadingProgress`). Centraliza o visual antes
 * duplicado entre `RadarSceneCanvas` (primeiro frame da cena) e `RadarFloatingOverlays`
 * (troca de critério / refresh).
 *
 * O z-index precisa superar o maior valor que um rótulo da cena pode receber via
 * `zIndexRange` do drei <Html> — hoje 48 (label selecionado/hover). Os rótulos (Terra
 * etc.) são portados para o mesmo pai `relative` deste overlay, então a comparação de z
 * é direta entre irmãos: com z baixo o "Terra" furava o "Carregando…". z-[60] cobre
 * qualquer rótulo durante a carga, ficando abaixo do tutorial (z-[120]) e dos modais.
 */

import { useEffect, useRef, useState } from 'react';
import { loadingStageLabel } from '@/lib/radar/loadingProgress';
import { useLoadingProgress } from './useLoadingProgress';

/** Quanto tempo (ms) o overlay segura os 100% pintados antes de sumir com fade. */
const HOLD_AT_FULL_MS = 360;

type Props = {
    /** Se o overlay deve aparecer. Quando `false`, o overlay ainda completa 100% e some com fade. */
    active: boolean;
    locale: 'pt-BR' | 'en';
    /** Requisição de dados em andamento (`radarLoading`). */
    fetching: boolean;
    /**
     * Primeiro frame da cena 3D já pintado. Para overlays que não dependem da montagem
     * da cena (troca de critério com a cena já viva), passe `true` para que a barra
     * conclua assim que os dados chegam.
     */
    sceneReady?: boolean;
};

export function RadarLoadingOverlay({ active, locale, fetching, sceneReady = true }: Props) {
    const { progress, stage } = useLoadingProgress(active, fetching, sceneReady);

    // O chamador zera `active` no MESMO render em que a cena fica pronta. Se desmontássemos
    // ali, a barra nunca pintaria os 100% (ela some no meio). Em vez disso seguramos o overlay
    // montado, deixamos a barra completar, mantemos os 100% por um instante e só então
    // disparamos o fade de saída. `mounted` controla a presença no DOM; `leaving` o fade.
    const [mounted, setMounted] = useState(active);
    const [leaving, setLeaving] = useState(false);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (active) {
            // Reabriu: cancela qualquer saída em curso e volta a mostrar do começo.
            if (holdTimer.current) clearTimeout(holdTimer.current);
            holdTimer.current = null;
            setLeaving(false);
            setMounted(true);
        } else if (mounted) {
            // Pediram para fechar: segura os 100% por um instante, depois faz o fade.
            setLeaving(true);
            holdTimer.current = setTimeout(() => setMounted(false), HOLD_AT_FULL_MS);
        }
        return () => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
        };
    }, [active, mounted]);

    if (!mounted) return null;

    const en = locale === 'en';
    // Enquanto sai, mostramos o marco real "pronto" (100%); enquanto carrega, a barra suave.
    const shown = leaving ? 100 : progress;
    const rounded = Math.round(shown);
    const label = leaving ? loadingStageLabel('done', en) : loadingStageLabel(stage, en);

    return (
        <div
            className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-[#03060d]/80 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: leaving ? 0 : 1 }}
        >
            <div className="flex w-[min(20rem,72%)] flex-col gap-3 rounded-xl border border-white/10 bg-space-950/90 px-5 py-4 shadow-glow">
                <div className="flex items-center justify-between text-[13px] text-white/70">
                    <span className="flex items-center gap-2.5">
                        <span className="size-2 animate-pulse rounded-full bg-signal-cyan" aria-hidden />
                        {label}
                    </span>
                    <span className="tabular-nums font-medium text-signal-cyan/80">{rounded}%</span>
                </div>
                <div
                    className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={rounded}
                    aria-label={en ? 'Loading progress' : 'Progresso do carregamento'}
                >
                    {/* Sem transição CSS de largura: o número (Math.round(shown)) atualiza por frame,
                        e uma transição na barra a faria perseguir o valor com atraso, descolando a
                        ponta da barra do número. `shown` já vem suavizado frame a frame pelo
                        requestAnimationFrame de useLoadingProgress, então barra e número leem o mesmo
                        valor no mesmo frame e ficam sempre casados. */}
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-signal-cyan/70 to-signal-cyan shadow-[0_0_12px_rgba(84,214,214,0.5)]"
                        style={{ width: `${shown}%` }}
                    >
                        {/* Brilho sutil percorrendo a barra preenchida, só enquanto carrega. */}
                        {!leaving ? (
                            <span className="absolute inset-0 animate-loading-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
