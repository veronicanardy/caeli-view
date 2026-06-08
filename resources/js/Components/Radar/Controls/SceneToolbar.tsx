/**
 * Barra de ferramentas da cena 3D do radar.
 *
 * Responsabilidade: expor controles de labels, fullscreen e reset de câmera
 * posicionados sobre o canvas. Não acessa estado da cena diretamente — apenas
 * repassa intenções para o componente orquestrador via callbacks.
 */

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { SceneMode } from './Manual/manualTypes';
import { Tooltip } from './Tooltip';

type Props = {
    en: boolean;
    activeMode: SceneMode;
    showLabels: boolean;
    onShowLabelsChange: Dispatch<SetStateAction<boolean>>;
    fullscreen: boolean;
    onFullscreenChange: Dispatch<SetStateAction<boolean>>;
    onResetView: () => void;
};

/**
 * Controles sempre visíveis da cena — Reset, Labels, Fullscreen.
 * Todos usam Tooltip customizado com delay de saída de 2s.
 */
export function SceneToolbar({
    en,
    activeMode,
    showLabels,
    onShowLabelsChange,
    fullscreen,
    onFullscreenChange,
    onResetView,
}: Props) {
    return (
        <div className="pointer-events-none absolute right-3 top-3 z-20">
            <div className="pointer-events-auto flex items-center gap-1.5">
                {activeMode !== 'orbit' ? (
                    <Tooltip content={en ? 'Reset view' : 'Resetar vista'} align="right">
                        <IconButton onClick={onResetView} aria-label={en ? 'Reset view' : 'Resetar vista'}>
                            <RotateCcw className="size-3.5" />
                        </IconButton>
                    </Tooltip>
                ) : null}
                <Tooltip
                    content={showLabels
                        ? (en ? 'Hide markers' : 'Ocultar marcações')
                        : (en ? 'Show markers' : 'Mostrar marcações')}
                    align="right"
                >
                    <IconButton
                        onClick={() => onShowLabelsChange((v) => !v)}
                        aria-label={showLabels ? (en ? 'Hide markers' : 'Ocultar marcações') : (en ? 'Show markers' : 'Mostrar marcações')}
                    >
                        {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </IconButton>
                </Tooltip>
                <Tooltip
                    content={fullscreen
                        ? (en ? 'Exit fullscreen' : 'Sair da tela cheia')
                        : (en ? 'Fullscreen' : 'Tela cheia')}
                    align="right"
                >
                    <IconButton
                        onClick={() => onFullscreenChange((v) => !v)}
                        aria-label={fullscreen ? (en ? 'Exit fullscreen' : 'Sair da tela cheia') : (en ? 'Fullscreen' : 'Tela cheia')}
                    >
                        {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    );
}

function IconButton({ onClick, children, 'aria-label': ariaLabel }: { onClick: () => void; children: ReactNode; 'aria-label': string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            /* p-2.5 no mobile garante área de toque ~44px; p-1.5 mantém o visual compacto no desktop */
            className="flex items-center justify-center rounded-full border border-white/10 bg-space-950/80 p-2.5 text-white/50 backdrop-blur transition outline-none hover:border-white/20 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-signal-cyan lg:p-1.5"
        >
            {children}
        </button>
    );
}
