/**
 * Spotlight do tutorial: moldura iluminada sobre o elemento destacado.
 *
 * Responsabilidade: desenhar o destaque visual do alvo. O escurecimento do
 * resto da tela vem do box-shadow gigante do próprio elemento (um único nó,
 * sem quatro retângulos sincronizados). Todo o bloco é pointer-events-none:
 * o tutorial nunca bloqueia cliques na interface real.
 */

import type { TutorialRect } from './radarTutorialGeometry';

export function TutorialSpotlight({ rect, dim = true }: { rect: TutorialRect; dim?: boolean }) {
    return (
        <div
            aria-hidden
            className={`absolute rounded-xl border border-signal-cyan/60
                       ${dim ? 'shadow-[0_0_0_9999px_rgba(2,4,10,0.82),0_0_24px_rgba(34,211,238,0.28)]' : 'shadow-[0_0_24px_rgba(34,211,238,0.28)]'}
                       transition-all duration-300 ease-out motion-reduce:transition-none`}
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
    );
}

/** Escurecimento uniforme para passos sem alvo (boas-vindas e final). */
export function TutorialBackdrop() {
    return <div aria-hidden className="absolute inset-0 bg-[#020409]/80" />;
}
