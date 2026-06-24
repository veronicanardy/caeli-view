/**
 * Hook que anima a porcentagem da barra de carregamento do radar.
 *
 * Responsabilidade: rodar o laço de animação (requestAnimationFrame) que chama a
 * lógica pura de `lib/radar/loadingProgress`, mantendo a porcentagem exibida sempre
 * avançando suave em direção ao teto da etapa atual. Toda a matemática vive na lib
 * pura e testável; aqui ficam só o estado React e o ciclo de quadros.
 *
 * Ao concluir (etapa `done`), a barra completa em 100% e o chamador decide quando
 * desmontar o overlay. Devolve também a etapa atual para o overlay rotular o que está
 * acontecendo (buscar dados, montar a cena).
 */

import { useEffect, useRef, useState } from 'react';
import {
    advanceLoadingProgress,
    resolveLoadingStage,
    type LoadingStage,
} from '@/lib/radar/loadingProgress';

/**
 * @param active     Se o overlay de carregamento está visível. Com `false`, a barra
 *                   é reiniciada para 0 e o laço de animação pausa.
 * @param fetching   Requisição de dados em andamento (`radarLoading`).
 * @param sceneReady Primeiro frame da cena 3D já pintado. Quando o overlay não depende
 *                   da montagem da cena (ex: troca de critério), passe `true`.
 */
export function useLoadingProgress(active: boolean, fetching: boolean, sceneReady: boolean): {
    progress: number;
    stage: LoadingStage;
} {
    const [progress, setProgress] = useState(0);
    const progressRef = useRef(0);
    const lastTickRef = useRef<number | null>(null);

    // Espelha a etapa atual numa ref para o laço de rAF lê-la sem recriar o efeito.
    const stage: LoadingStage = resolveLoadingStage(fetching, sceneReady);
    const stageRef = useRef(stage);
    stageRef.current = stage;

    useEffect(() => {
        if (!active) {
            // Reinicia para a próxima abertura do overlay começar do zero.
            progressRef.current = 0;
            lastTickRef.current = null;
            setProgress(0);
            return;
        }

        let raf = 0;
        const tick = (now: number) => {
            const last = lastTickRef.current ?? now;
            const deltaMs = now - last;
            lastTickRef.current = now;

            const next = advanceLoadingProgress(progressRef.current, stageRef.current, deltaMs);
            if (next !== progressRef.current) {
                progressRef.current = next;
                setProgress(next);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active]);

    return { progress, stage };
}
