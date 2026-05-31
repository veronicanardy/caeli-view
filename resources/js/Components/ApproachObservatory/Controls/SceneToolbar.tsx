import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { SceneMode } from './MapManualModal';
import { IconViewButton, ViewButton } from './ViewButtons';
import type { CameraViewKey } from '../Scene/CameraRig';

type Props = {
    en: boolean;
    activeMode: SceneMode;
    view: CameraViewKey;
    hasVisibleFocusedObject: boolean;
    showLabels: boolean;
    onShowLabelsChange: Dispatch<SetStateAction<boolean>>;
    fullscreen: boolean;
    onFullscreenChange: Dispatch<SetStateAction<boolean>>;
    onPickView: (key: CameraViewKey) => void;
    onResetView: () => void;
};

/**
 * Controles sempre visíveis da cena.
 *
 * Renderiza as variações desktop/mobile para vistas de câmera, labels e fullscreen.
 * A toolbar apenas dispara comandos; a intenção de câmera fica no componente principal.
 */
export function SceneToolbar({
    en,
    activeMode,
    view,
    hasVisibleFocusedObject,
    showLabels,
    onShowLabelsChange,
    fullscreen,
    onFullscreenChange,
    onPickView,
    onResetView,
}: Props) {
    const labelTitle = showLabels
        ? (en ? 'Hide markers' : 'Ocultar marcações')
        : (en ? 'Show markers' : 'Mostrar marcações');
    const fullscreenTitle = fullscreen
        ? (en ? 'Exit fullscreen' : 'Sair da tela cheia')
        : (en ? 'Fullscreen' : 'Tela cheia');

    return (
        <div className="pointer-events-none absolute right-3 top-3 z-20">
            <div className="pointer-events-auto hidden sm:flex items-center gap-1.5">
                {activeMode !== 'orbit' ? (
                    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-space-950/82 p-1 backdrop-blur">
                        <ViewButton active={view === 'top' && !hasVisibleFocusedObject} onClick={() => onPickView('top')}>
                            {en ? 'Top' : 'Superior'}
                        </ViewButton>
                        <ViewButton active={view === 'side' && !hasVisibleFocusedObject} onClick={() => onPickView('side')}>
                            {en ? 'Side' : 'Lateral'}
                        </ViewButton>
                        <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
                        <ViewButton active={view === 'perspective' && !hasVisibleFocusedObject} onClick={onResetView}>
                            {en ? 'Reset' : 'Resetar'}
                        </ViewButton>
                    </div>
                ) : null}
                <IconToggleButton
                    title={labelTitle}
                    active={showLabels}
                    onClick={() => onShowLabelsChange((v) => !v)}
                >
                    {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </IconToggleButton>
                <IconToggleButton
                    title={fullscreenTitle}
                    active
                    onClick={() => onFullscreenChange((v) => !v)}
                >
                    {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </IconToggleButton>
            </div>

            <div className="pointer-events-auto flex sm:hidden flex-col items-center gap-1.5">
                {activeMode !== 'orbit' ? (
                    <div className="flex flex-col items-center gap-0.5 rounded-full border border-white/10 bg-space-950/82 py-1 px-1 backdrop-blur">
                        <IconViewButton active={view === 'top' && !hasVisibleFocusedObject} onClick={() => onPickView('top')} title={en ? 'Top view' : 'Vista superior'}>
                            <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="7" cy="7" r="5.5" />
                                <line x1="7" y1="1.5" x2="7" y2="4" /><line x1="7" y1="10" x2="7" y2="12.5" />
                                <line x1="1.5" y1="7" x2="4" y2="7" /><line x1="10" y1="7" x2="12.5" y2="7" />
                            </svg>
                        </IconViewButton>
                        <IconViewButton active={view === 'side' && !hasVisibleFocusedObject} onClick={() => onPickView('side')} title={en ? 'Side view' : 'Vista lateral'}>
                            <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <ellipse cx="7" cy="7" rx="5.5" ry="2.5" />
                                <line x1="1.5" y1="7" x2="12.5" y2="7" />
                            </svg>
                        </IconViewButton>
                        <span className="my-0.5 h-px w-3.5 bg-white/10" aria-hidden />
                        <IconViewButton active={view === 'perspective' && !hasVisibleFocusedObject} onClick={onResetView} title={en ? 'Reset view' : 'Resetar vista'}>
                            <RotateCcw className="size-3" />
                        </IconViewButton>
                    </div>
                ) : null}
                <IconToggleButton
                    title={labelTitle}
                    active={showLabels}
                    onClick={() => onShowLabelsChange((v) => !v)}
                >
                    {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </IconToggleButton>
                <IconToggleButton
                    title={fullscreenTitle}
                    active
                    onClick={() => onFullscreenChange((v) => !v)}
                >
                    {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </IconToggleButton>
            </div>
        </div>
    );
}

function IconToggleButton({
    title,
    active,
    onClick,
    children,
}: {
    title: string;
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={[
                'flex items-center justify-center rounded-full border p-1.5 backdrop-blur transition',
                active
                    ? 'border-white/10 bg-space-950/82 text-white/60 hover:border-white/25 hover:text-white'
                    : 'border-white/20 bg-white/8 text-white/35 hover:text-white/60',
            ].join(' ')}
        >
            {children}
        </button>
    );
}
