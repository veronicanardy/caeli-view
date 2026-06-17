/**
 * Mini teclado visual do tutorial (WASD + setas).
 *
 * Responsabilidade: mostrar quais teclas movem a câmera e acender cada tecla
 * quando pressionada. Uma vez pressionada, a tecla fica acesa para sempre:
 * é o registro visual do progresso do passo, que pede os dois grupos (WASD e
 * setas). Não move a câmera: quem faz isso é o KeyboardPan da cena; aqui é só
 * o espelho visual.
 */

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { isTypingTarget } from './radarTutorialDom';

/** Normaliza a tecla do evento para o id usado na grade (wasd minúsculo, setas literais). */
function keyId(eventKey: string): string {
    if (eventKey.startsWith('Arrow')) return eventKey;
    return eventKey.toLowerCase();
}

const TRACKED_KEYS = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function TutorialKeyboardHint() {
    // Teclas já usadas: acumulam e nunca apagam, marcando o progresso do passo.
    const [lit, setLit] = useState<Set<string>>(new Set());

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) return;
            const id = keyId(event.key);
            if (!TRACKED_KEYS.has(id)) return;
            setLit((prev) => {
                if (prev.has(id)) return prev;
                const updated = new Set(prev);
                updated.add(id);
                return updated;
            });
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div className="flex items-center justify-center gap-6 py-1.5" aria-hidden>
            {/* Bloco WASD */}
            <div className="flex flex-col items-center gap-1">
                <KeyCap label="W" active={lit.has('w')} />
                <div className="flex gap-1">
                    <KeyCap label="A" active={lit.has('a')} />
                    <KeyCap label="S" active={lit.has('s')} />
                    <KeyCap label="D" active={lit.has('d')} />
                </div>
            </div>
            {/* Bloco de setas */}
            <div className="flex flex-col items-center gap-1">
                <KeyCap icon={<ArrowUp className="size-3.5" />} active={lit.has('ArrowUp')} />
                <div className="flex gap-1">
                    <KeyCap icon={<ArrowLeft className="size-3.5" />} active={lit.has('ArrowLeft')} />
                    <KeyCap icon={<ArrowDown className="size-3.5" />} active={lit.has('ArrowDown')} />
                    <KeyCap icon={<ArrowRight className="size-3.5" />} active={lit.has('ArrowRight')} />
                </div>
            </div>
        </div>
    );
}

function KeyCap({ label, icon, active }: { label?: string; icon?: React.ReactNode; active: boolean }) {
    return (
        <span
            className={[
                'flex size-8 items-center justify-center rounded-md border text-[12.5px] font-semibold',
                'transition-colors duration-150 motion-reduce:transition-none',
                active
                    ? 'border-signal-cyan bg-signal-cyan/25 text-signal-cyan shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                    : 'border-white/20 bg-white/[0.04] text-white/60',
            ].join(' ')}
        >
            {icon ?? label}
        </span>
    );
}
