import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calculator, GripHorizontal, Orbit, Radar, X } from 'lucide-react';
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

    const modeLabel = mode === 'radar'
        ? (en ? 'Radar mode' : 'Modo radar')
        : (en ? 'Orbit mode' : 'Modo órbita');

    const modeSubtitle = mode === 'radar'
        ? (en ? 'Earth-centred · geocentric view' : 'Centrado na Terra · vista geocêntrica')
        : (en ? 'Sun-centred · heliocentric view' : 'Centrado no Sol · vista heliocêntrica');

    return (
        <div
            className="pointer-events-none fixed inset-0 z-50"
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
                <header
                    onPointerDown={startDrag}
                    className={[
                        'flex shrink-0 flex-col gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    ].join(' ')}
                >
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-signal-cyan">
                                {mode === 'radar' ? <Radar className="size-3.5" aria-hidden /> : <Orbit className="size-3.5" aria-hidden />}
                                {modeLabel}
                            </div>
                            <span
                                className="inline-flex items-center gap-1 text-[11px] text-white/40"
                                title={en ? 'Drag to move' : 'Arraste para mover'}
                            >
                                <GripHorizontal className="size-3.5" aria-hidden />
                                {en ? 'drag' : 'arraste'}
                            </span>
                        </div>
                        <h2 id="map-manual-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                            {en ? 'Map manual' : 'Manual do mapa'}
                        </h2>
                        <p className="mt-0.5 text-sm text-white/45">{modeSubtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={onClose}
                            className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            aria-label={en ? 'Close manual' : 'Fechar manual'}
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="flex shrink-0 gap-1 border-b border-white/10 bg-black/16 px-3 py-2 sm:px-5">
                    <ManualTabButton active={tab === 'guide'} onClick={() => setTab('guide')} icon="guide">
                        {en ? 'Reading guide' : 'Guia de leitura'}
                    </ManualTabButton>
                    <ManualTabButton active={tab === 'technical'} onClick={() => setTab('technical')} icon="technical">
                        {en ? 'Under the hood' : 'Por dentro'}
                    </ManualTabButton>
                </div>

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
                    className="absolute bottom-0 right-0 z-10 flex size-5 cursor-se-resize items-end justify-end p-0.5 text-white/40 outline-none hover:text-white/80 focus-visible:text-white"
                >
                    <svg viewBox="0 0 10 10" className="size-3" aria-hidden>
                        <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
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
