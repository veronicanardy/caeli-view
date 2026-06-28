import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';
import type { PlanetId } from '../Scene/planetConfig';
import type { KnownSpacecraft } from '../Bodies/Spacecraft/knownSpacecraft';
import { KNOWN_SPACECRAFT, knownSpacecraftId } from '../Bodies/Spacecraft/knownSpacecraft';

export function ReferenceSection({
    en,
    orbitMode = false,
    planetsOpen,
    onPlanetsOpenChange,
    spacecraftOpen,
    onSpacecraftOpenChange,
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
    spacecraftOpen: boolean;
    onSpacecraftOpenChange: (open: boolean) => void;
    onFocusEarth: () => void;
    onFocusMoon: () => void;
    onFocusSun: () => void;
    compact?: boolean;
    labelsAlwaysVisible?: boolean;
}) {
    const tutorial = useRadarTutorialOptional();
    const canFocusSun = tutorial?.isActionAllowed('focus-sun', { body: 'sun' }) ?? true;
    const canFocusEarth = tutorial?.isActionAllowed('focus-body', { body: 'earth' }) ?? true;
    const canFocusMoon = tutorial?.isActionAllowed('focus-body', { body: 'moon' }) ?? true;
    const canTogglePlanets = tutorial?.isActionAllowed('toggle-planets') ?? true;
    const canToggleSpacecraft = tutorial?.isActionAllowed('toggle-spacecraft') ?? true;

    return (
        <div className={compact ? '' : 'border-b border-white/[0.04] px-2 pb-1.5 pt-2'}>
            {!compact ? (
                <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    {en ? 'References' : 'Referências'}
                </div>
            ) : null}
            {/*
                A faixa separa as refer\u00eancias por natureza: a primeira linha foca a c\u00e2mera num corpo
                com um clique (Sol/Terra/Lua); a segunda abre grupos que expandem um flyout
                (Planetas/Naves). Antes os cinco controles dividiam uma linha s\u00f3 e o texto encostava
                nos divisores; agora cada grupo tem sua pr\u00f3pria linha e seu divisor interno.
            */}
            <div className="space-y-1" data-tutorial="reference-controls">
                <div className="flex items-center gap-px rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5">
                <AstroButton
                    symbol={'\u2609'}
                    label={en ? 'Sun' : 'Sol'}
                    onClick={() => {
                        if (!canFocusSun) return;
                        onFocusSun();
                        tutorial?.completeStep('focus-sun', { body: 'sun' });
                    }}
                    disabled={!canFocusSun}
                    dataTutorial="reference-body"
                    labelAlways={labelsAlwaysVisible}
                />
                <Divider />
                <AstroButton
                    symbol={'\u2641'}
                    label={en ? 'Earth' : 'Terra'}
                    onClick={() => {
                        if (!canFocusEarth) return;
                        onFocusEarth();
                        tutorial?.completeStep('focus-body', { body: 'earth' });
                    }}
                    disabled={!canFocusEarth}
                    dataTutorial="reference-body"
                    labelAlways={labelsAlwaysVisible}
                />
                <Divider />
                <AstroButton
                    symbol={'\u263D'}
                    label={en ? 'Moon' : 'Lua'}
                    onClick={() => {
                        if (!canFocusMoon) return;
                        onFocusMoon();
                        tutorial?.completeStep('focus-body', { body: 'moon' });
                    }}
                    disabled={!canFocusMoon}
                    dataTutorial="reference-body"
                    labelAlways={labelsAlwaysVisible}
                />
                </div>
                {!orbitMode ? (
                    <div className="flex items-center gap-px rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5">
                        <AstroButton
                            symbol={'\u2726'}
                            label={en ? 'Planets' : 'Planetas'}
                            onClick={() => {
                                if (!canTogglePlanets) return;
                                onPlanetsOpenChange(!planetsOpen);
                            }}
                            disabled={!canTogglePlanets}
                            active={planetsOpen}
                            chevron
                            chevronOpen={planetsOpen}
                            dataTutorial="reference-planets"
                            labelAlways={labelsAlwaysVisible}
                        />
                        <Divider />
                        <AstroButton
                            symbol={'\u29bf'}
                            label={en ? 'Spacecraft' : 'Naves'}
                            onClick={() => {
                                if (!canToggleSpacecraft) return;
                                onSpacecraftOpenChange(!spacecraftOpen);
                            }}
                            disabled={!canToggleSpacecraft}
                            active={spacecraftOpen}
                            chevron
                            chevronOpen={spacecraftOpen}
                            dataTutorial="reference-spacecraft"
                            labelAlways={labelsAlwaysVisible}
                        />
                    </div>
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
    disabled = false,
}: {
    symbol: string;
    label: string;
    onClick: () => void;
    active?: boolean;
    chevron?: boolean;
    chevronOpen?: boolean;
    dataTutorial?: string;
    labelAlways?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            data-tutorial={dataTutorial}
            className={[
                'group flex flex-1 items-center justify-center gap-1 rounded-md px-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:opacity-35',
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

export function PlanetFlyout({ en, focusedId, onFocus }: { en: boolean; focusedId: PlanetId | null; onFocus: (id: PlanetId) => void }) {
    const [visible, setVisible] = useState(false);
    const tutorial = useRadarTutorialOptional();
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
            {PLANET_LIST.map((p) => {
                const allowed = tutorial?.isActionAllowed('focus-planet', { planetId: p.id }) ?? true;
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                            if (!allowed) return;
                            onFocus(p.id);
                            tutorial?.completeStep('focus-planet', { planetId: p.id });
                        }}
                        disabled={!allowed}
                        data-tutorial="planet-option"
                        className={[
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:opacity-35',
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
                );
            })}
        </div>
    );
}

/** Cor discreta do marcador de nave no flyout (mesmo tom frio do SpacecraftMarker). */
const SPACECRAFT_DOT_COLOR = '#9fc0e8';

/**
 * Lista de naves famosas no flyout de Referências, espelho do PlanetFlyout. Cada item foca a câmera na
 * nave e abre o card dela. As naves estão sempre na cena (como os planetas), então não há gate de modo.
 */
export function SpacecraftFlyout({
    en,
    focusedId,
    onFocus,
}: {
    en: boolean;
    focusedId: string | null;
    onFocus: (craft: KnownSpacecraft) => void;
}) {
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
            {KNOWN_SPACECRAFT.map((craft) => {
                const id = knownSpacecraftId(craft);
                const isFocused = id === focusedId;
                return (
                    <button
                        key={craft.horizonsId}
                        type="button"
                        onClick={() => onFocus(craft)}
                        data-tutorial="spacecraft-option"
                        className={[
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            isFocused
                                ? 'bg-white/[0.04] text-white/85'
                                : 'text-white/60 hover:bg-white/[0.04] hover:text-white/75',
                        ].join(' ')}
                    >
                        <span
                            className="inline-block size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: SPACECRAFT_DOT_COLOR, opacity: isFocused ? 0.8 : 0.45 }}
                        />
                        <span className="font-medium">{craft.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
