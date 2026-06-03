import { type ReactNode, useEffect, useState } from 'react';
import { Globe, Moon, Orbit, Sun } from 'lucide-react';
import type { PlanetId } from '../Scene/planetConfig';

/**
 * Atalhos de foco para corpos de referência da cena.
 *
 * Expõe ações rápidas para Sol, Terra, Lua e, fora do modo órbita, a lista de planetas.
 */
export function ReferenceSection({
    en,
    orbitMode = false,
    planetsOpen,
    onPlanetsOpenChange,
    onFocusEarth,
    onFocusMoon,
    onFocusSun,
    compact = false,
}: {
    en: boolean;
    orbitMode?: boolean;
    planetsOpen: boolean;
    onPlanetsOpenChange: (open: boolean) => void;
    onFocusEarth: () => void;
    onFocusMoon: () => void;
    onFocusSun: () => void;
    compact?: boolean;
}) {
    return (
        <div className={compact ? '' : 'border-b border-white/[0.04] px-2 pb-1.5 pt-2'}>
            {!compact ? (
                <div className="px-1 pb-1 text-[9px] font-semibold uppercase tracking-widest text-white/25">
                    {en ? 'References' : 'Referências'}
                </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5 overflow-visible">
                <ReferenceIconButton label={en ? 'Sun' : 'Sol'} icon={<Sun className="size-3.5" />} onClick={onFocusSun} />
                <ReferenceIconButton label={en ? 'Earth' : 'Terra'} icon={<Globe className="size-3.5" />} onClick={onFocusEarth} />
                <ReferenceIconButton label={en ? 'Moon' : 'Lua'} icon={<Moon className="size-3.5" />} onClick={onFocusMoon} />
                {!orbitMode ? (
                    <ReferenceIconButton
                        label={en ? 'Planets' : 'Planetas'}
                        icon={<Orbit className="size-3.5" />}
                        onClick={() => onPlanetsOpenChange(!planetsOpen)}
                        active={planetsOpen}
                        className="sm:ml-auto"
                    />
                ) : null}
            </div>
        </div>
    );
}

function ReferenceIconButton({
    label,
    icon,
    onClick,
    active = false,
    className = '',
}: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    active?: boolean;
    className?: string;
}) {
    return (
        <span className={['group relative inline-flex overflow-visible', className].join(' ')}>
            <button
                type="button"
                onClick={onClick}
                aria-label={label}
                className={[
                    'inline-flex size-7 items-center justify-center rounded-lg border transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                    active
                        ? 'border-signal-cyan/25 bg-signal-cyan/8 text-signal-cyan/70'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/65',
                ].join(' ')}
            >
                {icon}
            </button>
            <span className="pointer-events-none absolute left-1/2 top-full z-[120] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-signal-cyan/35 bg-[#07111f] px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(34,211,238,0.14)] transition group-hover:translate-y-[1px] group-hover:opacity-100 group-focus-within:translate-y-[1px] group-focus-within:opacity-100 sm:block">
                {label}
                <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-signal-cyan/35 bg-[#07111f]" aria-hidden />
            </span>
        </span>
    );
}

const PLANET_LIST = [
    { id: 'mercury' as PlanetId, color: '#b0b8c8', labelPt: 'Mercúrio', labelEn: 'Mercury' },
    { id: 'venus' as PlanetId, color: '#c8b870', labelPt: 'Vênus', labelEn: 'Venus' },
    { id: 'mars' as PlanetId, color: '#c0501a', labelPt: 'Marte', labelEn: 'Mars' },
    { id: 'jupiter' as PlanetId, color: '#c8a060', labelPt: 'Júpiter', labelEn: 'Jupiter' },
    { id: 'saturn' as PlanetId, color: '#c8a840', labelPt: 'Saturno', labelEn: 'Saturn' },
    { id: 'uranus' as PlanetId, color: '#4ab8c8', labelPt: 'Urano', labelEn: 'Uranus' },
    { id: 'neptune' as PlanetId, color: '#2878d8', labelPt: 'Netuno', labelEn: 'Neptune' },
];

/**
 * Lista flutuante de planetas usada pelo atalho de referência.
 * Entra com fade+slide suave ao montar.
 */
export function PlanetFlyout({ en, focusedId, onFocus }: { en: boolean; focusedId: PlanetId | null; onFocus: (id: PlanetId) => void }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    return (
        <div
            className="px-1 py-1 space-y-0.5"
            style={{
                transition: 'opacity 0.18s ease, transform 0.20s cubic-bezier(0.25,0.46,0.45,0.94)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(-6px)',
            }}
        >
            {PLANET_LIST.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => onFocus(p.id)}
                    className={[
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                        p.id === focusedId
                            ? 'bg-white/[0.04] text-white/85'
                            : 'text-white/45 hover:bg-white/[0.04] hover:text-white/70',
                    ].join(' ')}
                >
                    <span
                        className="inline-block size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color, opacity: p.id === focusedId ? 0.8 : 0.45 }}
                    />
                    <span className="font-medium">{en ? p.labelEn : p.labelPt}</span>
                </button>
            ))}
        </div>
    );
}
