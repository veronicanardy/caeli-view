/**
 * Tooltip do tutorial: o card de cada passo.
 *
 * Responsabilidade: renderizar título, texto curto, progresso e ações do passo
 * perto do elemento destacado. Trechos [[entre colchetes]] do corpo viram
 * chips visuais que imitam o botão real que o usuário precisa achar. Mede a si
 * mesmo e delega o posicionamento à geometria pura (placeTooltip). É o único
 * trecho do overlay com pointer-events ativo.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { placeTooltip, type TooltipPlacement, type TutorialRect } from './radarTutorialGeometry';
import { splitBodyChips, stepCopy, stepSide, tutorialChapterLabel, type TutorialLiveFacts, type TutorialStep } from './radarTutorialSteps';

type Props = {
    step: TutorialStep;
    stepNumber: number;
    stepCount: number;
    en: boolean;
    isMobile: boolean;
    targetRect: TutorialRect | null;
    /** Fatos reais do céu de agora, para preencher placeholders do passo. */
    liveFacts: TutorialLiveFacts | null;
    /** Apoio visual do passo (mini teclado, medidores de gesto). */
    extras?: ReactNode;
    onNext: () => void;
    onSkipStep: () => void;
    onSkipTutorial: () => void;
};

/** Renderiza o corpo trocando os trechos [[marcados]] por chips no estilo dos botões reais. */
function BodyWithChips({ body }: { body: string }) {
    const parts = splitBodyChips(body);
    return (
        <>
            {parts.map((part, index) => (
                index % 2 === 1 ? (
                    <span
                        key={index}
                        className="mx-0.5 inline-flex translate-y-[-1px] items-center whitespace-nowrap rounded-lg
                                   border border-signal-cyan/40 bg-signal-cyan/15 px-1.5 py-px text-[12px]
                                   font-medium leading-snug text-signal-cyan"
                    >
                        {part}
                    </span>
                ) : (
                    <span key={index}>{part}</span>
                )
            ))}
        </>
    );
}

export function TutorialTooltip({
    step,
    stepNumber,
    stepCount,
    en,
    isMobile,
    targetRect,
    liveFacts,
    extras,
    onNext,
    onSkipStep,
    onSkipTutorial,
}: Props) {
    const copy = stepCopy(step, en, isMobile, liveFacts);
    const cardRef = useRef<HTMLDivElement>(null);
    const primaryRef = useRef<HTMLButtonElement>(null);
    const [placement, setPlacement] = useState<TooltipPlacement | null>(null);

    // Mede o card real e posiciona via geometria pura. Reposiciona quando o
    // retângulo do alvo muda (resize, scroll, colapso de painel).
    useLayoutEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        setPlacement(placeTooltip(
            targetRect,
            el.offsetWidth,
            el.offsetHeight,
            window.innerWidth,
            window.innerHeight,
            stepSide(step, isMobile),
        ));
    }, [targetRect, step, isMobile]);

    // Passos com botão primário recebem foco para fluxo de teclado natural.
    // Passos de ação não roubam foco (o usuário vai interagir com a cena).
    useLayoutEffect(() => {
        if (step.advance.kind === 'manual') primaryRef.current?.focus();
    }, [step]);

    const isWelcome = step.id === 'welcome';

    return (
        <div
            ref={cardRef}
            role="dialog"
            aria-label={copy.title}
            className="pointer-events-auto absolute flex w-[min(23rem,calc(100vw-1.5rem))] flex-col gap-2.5
                       rounded-2xl border border-signal-cyan/30 bg-space-950/95 px-4 py-4 backdrop-blur-xl
                       shadow-[0_0_32px_rgba(34,211,238,0.12),0_16px_48px_rgba(0,0,0,0.7)] ring-1 ring-signal-cyan/10
                       transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
            style={placement
                ? { left: placement.left, top: placement.top }
                : { left: 0, top: 0, visibility: 'hidden' }}
        >
            <div className="flex items-start justify-between gap-3">
                <span className="text-[10.5px] font-medium uppercase tracking-widest text-signal-cyan/60">
                    {tutorialChapterLabel(step.id, en)}
                </span>
                <button
                    type="button"
                    onClick={onSkipTutorial}
                    aria-label={en ? 'Close tutorial' : 'Fechar tutorial'}
                    className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-white/40 transition outline-none
                               hover:bg-white/8 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            </div>

            {/* Trilha de progresso discreta: avança a cada passo, marcando a jornada
                sem o "N/M" seco. A largura é a proporção de passos concluídos. */}
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/8" aria-hidden>
                <div
                    className="h-full rounded-full bg-signal-cyan/55 transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{ width: `${Math.round((stepNumber / Math.max(stepCount, 1)) * 100)}%` }}
                />
            </div>

            <div aria-live="polite">
                <h3 className="text-[15.5px] font-semibold leading-snug text-white">{copy.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">
                    <BodyWithChips body={copy.body} />
                </p>
            </div>

            {extras}

            <div className="mt-0.5 flex items-center justify-between gap-3">
                {isWelcome ? (
                    <button
                        type="button"
                        onClick={onSkipTutorial}
                        className="rounded-full px-2 py-1 text-[12.5px] text-white/45 transition outline-none
                                   hover:text-white/75 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    >
                        {copy.secondaryLabel}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onSkipTutorial}
                        className="rounded-full px-2 py-1 text-[11.5px] text-white/35 transition outline-none
                                   hover:text-white/65 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    >
                        {en ? 'Skip tutorial' : 'Pular tutorial'}
                    </button>
                )}

                {copy.primaryLabel ? (
                    <button
                        ref={primaryRef}
                        type="button"
                        onClick={onNext}
                        className="inline-flex items-center gap-1.5 rounded-full border border-signal-cyan/45 bg-signal-cyan/15
                                   px-4 py-1.5 text-[13px] font-semibold text-signal-cyan transition outline-none
                                   hover:bg-signal-cyan/25 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    >
                        {copy.primaryLabel}
                    </button>
                ) : (
                    /* Passo de ação: saída discreta para nunca travar o usuário */
                    <button
                        type="button"
                        onClick={onSkipStep}
                        className="rounded-full px-2 py-1 text-[11.5px] text-white/35 transition outline-none
                                   hover:text-white/65 focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    >
                        {en ? 'Skip step' : 'Pular passo'}
                    </button>
                )}
            </div>
        </div>
    );
}
