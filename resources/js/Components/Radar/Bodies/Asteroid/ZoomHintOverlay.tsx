/**
 * Responsabilidade: renderizar o botão de "afastar para ver trajetória" em coordenadas
 * de tela fixas, lendo o estado publicado pelo ZoomHint (dentro do Canvas) via contexto.
 * Vive fora do Canvas para que SVG e HTML não sejam interceptados pelo reconciliador R3F.
 */

import { useEffect, useRef, useState } from 'react';
import { Tooltip } from '../../Controls/Tooltip';
import { useZoomHintState } from './ZoomHintContext';

function MagnifyMinusIcon() {
    return (
        <svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="4" y1="6.5" x2="9" y2="6.5" />
            <line x1="10.2" y1="10.2" x2="14" y2="14" />
        </svg>
    );
}

const FADE_IN_MS = 400;

export function ZoomHintOverlay() {
    const state = useZoomHintState();
    const lastState = useRef(state);
    if (state) lastState.current = state;

    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (!state?.visible) {
            setOpacity(0);
            return;
        }
        // Força reflow antes de animar para garantir o fade in.
        setOpacity(0);
        const raf = requestAnimationFrame(() => setOpacity(1));
        return () => cancelAnimationFrame(raf);
    }, [state?.visible]);

    if (!state?.visible && opacity === 0) return null;

    const s = lastState.current!;

    return (
        <div
            style={{
                position: 'fixed',
                left: s.x + 250,
                top: s.y + 130,
                pointerEvents: state?.visible ? 'auto' : 'none',
                userSelect: 'none',
                zIndex: 40,
                opacity,
                transition: state?.visible ? `opacity ${FADE_IN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none',
            }}
        >
            <Tooltip content="Afastar para ver a trajetória" side="top" hideDelay={200}>
                <button
                    onClick={s.onZoomOut}
                    style={{
                        background: 'rgba(255,255,255,0.11)',
                        border: '1px solid rgba(255,255,255,0.28)',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1,
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                        padding: 0,
                    }}
                    onMouseEnter={(e) => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.background = 'rgba(255,255,255,0.18)';
                        btn.style.color = 'rgba(255,255,255,0.9)';
                    }}
                    onMouseLeave={(e) => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.background = 'rgba(255,255,255,0.11)';
                        btn.style.color = 'rgba(255,255,255,0.65)';
                    }}
                >
                    <MagnifyMinusIcon />
                </button>
            </Tooltip>
        </div>
    );
}
