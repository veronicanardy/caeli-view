/**
 * Extras visuais do tooltip por tipo de passo.
 *
 * Responsabilidade: decidir qual apoio visual acompanha o passo atual (mini
 * teclado, medidor de zoom em duas fases ou arco de rotação) a partir do
 * progresso já calculado pelo overlay. Mantém o TutorialTooltip burro, sem
 * conhecimento de gestos.
 */

import { Check } from 'lucide-react';
import type { TutorialStep } from './radarTutorialSteps';
import type { ZoomProgress } from './RadarTutorialOverlay';
import { TutorialKeyboardHint } from './TutorialKeyboardHint';
import { TutorialRotateMeter, TutorialZoomMeter } from './TutorialGestureMeters';

export function TutorialGestureExtras({ step, en, keyboardDone, zoomProgress, rotateProgress }: {
    step: TutorialStep;
    en: boolean;
    keyboardDone: boolean;
    zoomProgress: ZoomProgress;
    rotateProgress: number;
}) {
    if (step.showKeyboardHint) {
        return (
            <div>
                <TutorialKeyboardHint />
                {keyboardDone ? (
                    <p className="flex items-center justify-center gap-1 pb-0.5 text-[11px] font-medium text-signal-cyan" aria-hidden>
                        <Check className="size-3.5" />
                        {en ? 'All keys down, well done!' : 'Todas as teclas, mandou bem!'}
                    </p>
                ) : null}
            </div>
        );
    }
    if (step.advance.kind === 'scene-zoom') {
        const zoomDone = zoomProgress.zoomIn >= 1 && zoomProgress.zoomOut >= 1;
        return (
            <div>
                <TutorialZoomMeter zoomIn={zoomProgress.zoomIn} zoomOut={zoomProgress.zoomOut} en={en} />
                {zoomDone ? (
                    <p className="flex items-center justify-center gap-1 pb-0.5 text-[11px] font-medium text-signal-cyan" aria-hidden>
                        <Check className="size-3.5" />
                        {en ? 'Perfect zoom, well done!' : 'Zoom perfeito, mandou bem!'}
                    </p>
                ) : null}
            </div>
        );
    }
    if (step.advance.kind === 'scene-rotate') {
        return <TutorialRotateMeter progress={rotateProgress} en={en} />;
    }
    return null;
}
