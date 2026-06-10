import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calculator, GripHorizontal, X } from 'lucide-react';
import { FriendlyManual } from './Manual/FriendlyManual';
import { TechnicalManual } from './Manual/TechnicalManual';
import type { SceneMode } from './Manual/manualTypes';

type ManualTab = 'guide' | 'technical';

const MANUAL_MIN_WIDTH = 360;
const MANUAL_MIN_HEIGHT = 320;
const MANUAL_MARGIN = 12;

function clampManualBox(
    x: number,
    y: number,
    width: number,
    height: number,
): { x: number; y: number; width: number; height: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(MANUAL_MIN_WIDTH, Math.min(width, vw - MANUAL_MARGIN * 2));
    const h = Math.max(MANUAL_MIN_HEIGHT, Math.min(height, vh - MANUAL_MARGIN * 2));
    const cx = Math.max(MANUAL_MARGIN, Math.min(x, vw - w - MANUAL_MARGIN));
    const cy = Math.max(MANUAL_MARGIN, Math.min(y, vh - h - MANUAL_MARGIN));
    return { x: cx, y: cy, width: w, height: h };
}

/**
 * Shell arrastável do manual do mapa.
 *
 * Mantém apenas estado de aba, posicionamento, redimensionamento e fechamento.
 * Todo o conteúdo editorial e técnico vive em `Controls/Manual`.
 */
export function MapManualModal({
    mode,
    locale,
    lunarDistanceKm,
    onClose,
}: {
    mode: SceneMode;
    locale: 'pt-BR' | 'en';
    lunarDistanceKm: number;
    onClose: () => void;
}) {
    const en = locale === 'en';
    const [tab, setTab] = useState<ManualTab>('guide');

    const [box, setBox] = useState(() => {
        const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
        const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
        const width = Math.min(1024, vw - MANUAL_MARGIN * 2);
        const height = Math.min(Math.round(vh * 0.92), vh - MANUAL_MARGIN * 2);
        return clampManualBox((vw - width) / 2, (vh - height) / 2, width, height);
    });

    const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
    const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [onClose]);

    useEffect(() => {
        const onResize = () => { setBox((b) => clampManualBox(b.x, b.y, b.width, b.height)); };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!dragging && !resizing) return;
        const onMove = (event: PointerEvent) => {
            if (dragging && dragRef.current) {
                const { offsetX, offsetY } = dragRef.current;
                setBox((b) => clampManualBox(event.clientX - offsetX, event.clientY - offsetY, b.width, b.height));
            } else if (resizing && resizeRef.current) {
                const { startX, startY, startWidth, startHeight } = resizeRef.current;
                const dx = event.clientX - startX;
                const dy = event.clientY - startY;
                setBox((b) => clampManualBox(b.x, b.y, startWidth + dx, startHeight + dy));
            }
        };
        const onUp = () => {
            dragRef.current = null;
            resizeRef.current = null;
            setDragging(false);
            setResizing(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [dragging, resizing]);

    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button')) return;
        dragRef.current = { offsetX: event.clientX - box.x, offsetY: event.clientY - box.y };
        setDragging(true);
    };

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        resizeRef.current = { startX: event.clientX, startY: event.clientY, startWidth: box.width, startHeight: box.height };
        setResizing(true);
    };

    const modalTitle = mode === 'radar'
        ? (en ? 'Radar guide' : 'Guia do radar')
        : (en ? 'Orbit guide' : 'Guia da órbita');

    return (
        <div
            className="pointer-events-none fixed inset-0 z-[110]"
            role="dialog"
            aria-modal="false"
            aria-labelledby="map-manual-title"
        >
            <div
                className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border border-white/20 bg-[#07101d]/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] ring-1 ring-black/40 backdrop-blur"
                style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                    userSelect: dragging || resizing ? 'none' : undefined,
                }}
            >
                {/* Barra única: grip + título + abas + fechar */}
                <header
                    onPointerDown={startDrag}
                    className={[
                        'flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4 py-2.5 sm:px-5',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    ].join(' ')}
                >
                    <GripHorizontal className="size-3.5 shrink-0 text-white/20" aria-hidden />

                    <h2 id="map-manual-title" className="shrink-0 text-[13px] font-semibold text-white/70">
                        {modalTitle}
                    </h2>

                    <div className="flex min-w-0 flex-1 gap-1">
                        <ManualTabButton active={tab === 'guide'} onClick={() => setTab('guide')} icon="guide">
                            {en ? 'Reading guide' : 'Guia de leitura'}
                        </ManualTabButton>
                        <ManualTabButton active={tab === 'technical'} onClick={() => setTab('technical')} icon="technical">
                            {en ? 'Data & methods' : 'Dados e métodos'}
                        </ManualTabButton>
                    </div>

                    <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onClose}
                        className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white/35 transition hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                        aria-label={en ? 'Close guide' : 'Fechar guia'}
                    >
                        <X className="size-3.5" aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                    {tab === 'guide'
                        ? <FriendlyManual mode={mode} locale={locale} lunarDistanceKm={lunarDistanceKm} />
                        : <TechnicalManual mode={mode} locale={locale} lunarDistanceKm={lunarDistanceKm} />}
                </div>

                <button
                    type="button"
                    onPointerDown={startResize}
                    aria-label={en ? 'Resize manual' : 'Redimensionar manual'}
                    title={en ? 'Drag to resize' : 'Arraste para redimensionar'}
                    className="absolute bottom-0 right-0 z-10 flex size-8 cursor-se-resize items-end justify-end rounded-tl-md bg-[#07101d]/80 p-1.5 text-white/30 outline-none transition hover:text-white/70 focus-visible:text-white"
                >
                    <svg viewBox="0 0 10 10" className="size-3.5" aria-hidden>
                        <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function ManualTabButton({ active, onClick, icon, children }: {
    active: boolean;
    onClick: () => void;
    icon: ManualTab;
    children: React.ReactNode;
}) {
    const Icon = icon === 'guide' ? BookOpen : Calculator;
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-signal-cyan text-space-950' : 'text-white/60 hover:bg-white/[0.08] hover:text-white',
            ].join(' ')}
        >
            <Icon className="size-3.5" aria-hidden />
            {children}
        </button>
    );
}
