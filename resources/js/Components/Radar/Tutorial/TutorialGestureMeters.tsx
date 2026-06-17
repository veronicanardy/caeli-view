/**
 * Medidores visuais de gesto do tutorial.
 *
 * Responsabilidade: dar feedback de progresso nos passos de zoom e rotação,
 * para o usuário sentir o quanto falta antes de o tutorial avançar. São
 * componentes burros: recebem progresso 0..1 já calculado pelo overlay e só
 * desenham. Nada aqui escuta eventos nem toca a cena.
 */

import { Check, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Medidor do passo de zoom: duas fases sequenciais, aproximar e afastar.
 * Cada fase é uma barrinha vertical que enche de baixo para cima; a fase de
 * afastar só "liga" depois que a de aproximar completa.
 */
export function TutorialZoomMeter({ zoomIn, zoomOut, en }: { zoomIn: number; zoomOut: number; en: boolean }) {
    return (
        <div className="flex items-end justify-center gap-8 py-1.5" aria-hidden>
            <ZoomPhase
                label={en ? 'Zoom in' : 'Aproximar'}
                icon={<ZoomIn className="size-3.5" />}
                progress={zoomIn}
                enabled
            />
            <ZoomPhase
                label={en ? 'Zoom out' : 'Afastar'}
                icon={<ZoomOut className="size-3.5" />}
                progress={zoomOut}
                enabled={zoomIn >= 1}
            />
        </div>
    );
}

function ZoomPhase({ label, icon, progress, enabled }: {
    label: string;
    icon: React.ReactNode;
    progress: number;
    enabled: boolean;
}) {
    const done = progress >= 1;
    return (
        <div className={`flex flex-col items-center gap-1.5 transition-opacity duration-200 ${enabled ? '' : 'opacity-40'}`}>
            <div className="relative h-14 w-2.5 overflow-hidden rounded-full border border-white/20 bg-white/[0.05]">
                <div
                    className={[
                        'absolute bottom-0 left-0 right-0 rounded-full transition-[height] duration-150 ease-out motion-reduce:transition-none',
                        done ? 'bg-signal-cyan shadow-[0_0_10px_rgba(34,211,238,0.6)]' : 'bg-signal-cyan/70',
                    ].join(' ')}
                    style={{ height: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                />
            </div>
            <span className={`flex items-center gap-1 text-[11px] font-medium ${done ? 'text-signal-cyan' : 'text-white/55'}`}>
                {done ? <Check className="size-3.5" /> : icon}
                {label}
            </span>
        </div>
    );
}

/**
 * Medidor do passo de rotação: arco horizontal levemente curvado que se
 * preenche conforme o usuário arrasta para girar a cena.
 */
export function TutorialRotateMeter({ progress, en }: { progress: number; en: boolean }) {
    const clamped = Math.min(1, Math.max(0, progress));
    const done = clamped >= 1;
    return (
        <div className="flex flex-col items-center gap-1 py-1.5" aria-hidden>
            <svg viewBox="0 0 120 26" className="h-7 w-32">
                {/* Trilho do arco */}
                <path
                    d="M 6 22 Q 60 2 114 22"
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                {/* Preenchimento: pathLength normaliza o comprimento para 100 */}
                <path
                    d="M 6 22 Q 60 2 114 22"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="4"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={100 - clamped * 100}
                    className="transition-[stroke-dashoffset] duration-150 ease-out motion-reduce:transition-none"
                    style={done ? { filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.7))' } : undefined}
                />
            </svg>
            <span className={`flex items-center gap-1 text-[11px] font-medium ${done ? 'text-signal-cyan' : 'text-white/55'}`}>
                {done ? <Check className="size-3.5" /> : null}
                {done ? (en ? 'Nice spin!' : 'Belo giro!') : (en ? 'Spin the scene' : 'Gire a cena')}
            </span>
        </div>
    );
}
