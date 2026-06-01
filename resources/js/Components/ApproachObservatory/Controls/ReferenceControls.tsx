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
        <div className={compact ? '' : 'border-b border-white/10 px-2 py-1.5'}>
            <div className="flex flex-wrap items-center gap-1.5">
                <ReferenceIconButton label={en ? 'Sun' : 'Sol'} icon="☀️" onClick={onFocusSun} />
                <ReferenceIconButton label={en ? 'Earth' : 'Terra'} icon="🌍" onClick={onFocusEarth} />
                <ReferenceIconButton label={en ? 'Moon' : 'Lua'} icon="🌙" onClick={onFocusMoon} />
                {!orbitMode ? (
                    <ReferenceIconButton
                        label={en ? 'Planets' : 'Planetas'}
                        icon="🪐"
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
    icon: string;
    onClick: () => void;
    active?: boolean;
    className?: string;
}) {
    return (
        <span className={['group relative inline-flex', className].join(' ')}>
            <button
                type="button"
                onClick={onClick}
                aria-label={label}
                className={[
                    'inline-flex size-8 items-center justify-center rounded-lg border text-base transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                    active
                        ? 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan'
                        : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white',
                ].join(' ')}
            >
                <span aria-hidden>{icon}</span>
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-[90] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-signal-cyan/35 bg-[#07111f] px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(34,211,238,0.14)] transition group-hover:translate-y-[-1px] group-hover:opacity-100 group-focus-within:translate-y-[-1px] group-focus-within:opacity-100">
                {label}
                <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-signal-cyan/35 bg-[#07111f]" aria-hidden />
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
 */
export function PlanetFlyout({ en, focusedId, onFocus }: { en: boolean; focusedId: PlanetId | null; onFocus: (id: PlanetId) => void }) {
    const btnCls = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-white/80 transition outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan';
    return (
        <div className="px-1 py-1 space-y-0.5">
            {PLANET_LIST.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => onFocus(p.id)}
                    className={[btnCls, p.id === focusedId ? 'text-white' : ''].join(' ')}
                >
                    <span className="inline-block size-2 shrink-0 rounded-full ring-1 ring-white/20" style={{ backgroundColor: p.color }} />
                    <span className="font-medium">{en ? p.labelEn : p.labelPt}</span>
                </button>
            ))}
        </div>
    );
}
