import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlanetId } from '../Scene/planetConfig';

// Símbolos astronômicos Unicode oficiais
// ☉ Sol  ♁ Terra  ☽ Lua  ✦ Planetas

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
    labelsAlwaysVisible = false,
}: {
    en: boolean;
    orbitMode?: boolean;
    planetsOpen: boolean;
    onPlanetsOpenChange: (open: boolean) => void;
    onFocusEarth: () => void;
    onFocusMoon: () => void;
    onFocusSun: () => void;
    compact?: boolean;
    /** Força os rótulos de texto mesmo abaixo de sm: (uso nos sheets mobile, onde há largura). */
    labelsAlwaysVisible?: boolean;
}) {
    return (
        <div className={compact ? '' : 'border-b border-white/[0.04] px-2 pb-1.5 pt-2'}>
            {!compact ? (
                <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    {en ? 'References' : 'Referências'}
                </div>
            ) : null}
            <div className="flex items-center gap-px rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5" data-tutorial="reference-controls">
                <AstroButton symbol="☉" label={en ? 'Sun' : 'Sol'}   onClick={onFocusSun} dataTutorial="reference-body" labelAlways={labelsAlwaysVisible} />
                <Divider />
                <AstroButton symbol="♁" label={en ? 'Earth' : 'Terra'} onClick={onFocusEarth} dataTutorial="reference-body" labelAlways={labelsAlwaysVisible} />
                <Divider />
                <AstroButton symbol="☽" label={en ? 'Moon' : 'Lua'}  onClick={onFocusMoon} dataTutorial="reference-body" labelAlways={labelsAlwaysVisible} />
                {!orbitMode ? (
                    <>
                        <Divider />
                        <AstroButton
                            symbol="✦"
                            label={en ? 'Planets' : 'Planetas'}
                            onClick={() => onPlanetsOpenChange(!planetsOpen)}
                            active={planetsOpen}
                            chevron
                            chevronOpen={planetsOpen}
                            dataTutorial="reference-planets"
                            labelAlways={labelsAlwaysVisible}
                        />
                    </>
                ) : null}
            </div>
        </div>
    );
}

function Divider() {
    return <span className="h-4 w-px shrink-0 bg-white/[0.07]" aria-hidden />;
}

function AstroButton({
    symbol,
    label,
    onClick,
    active = false,
    chevron = false,
    chevronOpen = false,
    dataTutorial,
    labelAlways = false,
}: {
    symbol: string;
    label: string;
    onClick: () => void;
    active?: boolean;
    chevron?: boolean;
    chevronOpen?: boolean;
    dataTutorial?: string;
    labelAlways?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            data-tutorial={dataTutorial}
            className={[
                'group flex flex-1 items-center justify-center gap-1 rounded-md px-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                labelAlways ? 'py-2.5 text-[12px]' : 'py-1.5 text-[11px]',
                active
                    ? 'bg-signal-cyan/10 text-signal-cyan shadow-[inset_0_1px_0_rgba(34,211,238,0.1)]'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70',
            ].join(' ')}
        >
            <span className="font-light leading-none" style={{ fontSize: '14px', fontFamily: 'serif' }}>
                {symbol}
            </span>
            <span className={`${labelAlways ? 'inline' : 'hidden sm:inline'} font-medium tracking-wide`} style={{ fontSize: '11px' }}>
                {label}
            </span>
            {chevron ? (
                <ChevronDown
                    className={`${labelAlways ? 'block' : 'hidden sm:block'} size-2.5 shrink-0 opacity-50 transition-transform`}
                    style={{ transform: chevronOpen ? 'rotate(90deg)' : 'rotate(-90deg)' }}
                    aria-hidden
                />
            ) : null}
        </button>
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
                    data-tutorial="planet-option"
                    className={[
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                        p.id === focusedId
                            ? 'bg-white/[0.04] text-white/85'
                            : 'text-white/60 hover:bg-white/[0.04] hover:text-white/75',
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
