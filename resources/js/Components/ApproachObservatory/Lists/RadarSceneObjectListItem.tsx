import { useMemo } from 'react';
import type { ClosestNowObject, SelectionMode, UnifiedApproach } from '@/types';
import { compactKm } from '@/lib/format';

type ObjectListItemProps = {
    object: ClosestNowObject;
    palette: { future: string };
    isSelected: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    selectionMode: SelectionMode;
    compact?: boolean;
    orbitMode?: boolean;
};

export function ObjectListItem({ object: o, palette, isSelected, onSelect, locale, selectionMode, compact = false, orbitMode = false }: ObjectListItemProps) {
    const en = locale === 'en';
    const hasScenePosition = Boolean(o.trajectory?.currentPoint);
    const hasOrbit = Boolean(o.trajectory?.orbitalElements);
    const orbitBlocked = orbitMode && !hasOrbit;
    const hazard = o.approach.hazardFlag;

    const trailingLabel = useMemo(() => {
        if (selectionMode === 'upcoming' && o.approach.approachDate) {
            const normalized = o.approach.approachDate.replace(
                /^(\d{4})-([A-Za-z]{3})-(\d{2})\s/,
                (_, y, m, d) => {
                    const months: Record<string, string> = {
                        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
                    };
                    return `${y}-${months[m] ?? m}-${d}T`;
                },
            ).replace(' ', 'T') + 'Z';
            const d = new Date(normalized);
            if (!Number.isNaN(d.getTime())) {
                return new Intl.DateTimeFormat(locale, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }).format(d);
            }
        }
        return compactKm(o.currentDistanceKm);
    }, [selectionMode, o.approach.approachDate, o.currentDistanceKm, locale]);

    const title = orbitBlocked
        ? (en ? 'Orbit unavailable for this object — no orbital elements from Horizons.' : 'Órbita indisponível para este objeto — sem elementos orbitais do Horizons.')
        : !hasScenePosition
          ? (en ? 'No live position from Horizons right now — not shown on the radar.' : 'Sem posição do Horizons no momento — não exibido no radar.')
          : undefined;

    return (
        <li>
            <button
                type="button"
                disabled={orbitBlocked}
                onClick={() => onSelect(o.approach)}
                title={title}
                className={[
                    'flex w-full items-center gap-2 rounded-lg text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                    compact ? 'px-2 py-1' : 'px-2 py-2',
                    orbitBlocked
                        ? 'cursor-not-allowed opacity-35'
                        : isSelected
                          ? 'bg-signal-cyan/15 text-white ring-1 ring-signal-cyan/40'
                          : 'text-white/75 hover:bg-white/8 hover:text-white',
                    !orbitBlocked && !hasScenePosition ? 'opacity-50' : '',
                ].join(' ')}
            >
                <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10" style={{ backgroundColor: palette.future }} />
                <span className="min-w-0 flex-1 truncate font-medium">
                    {o.approach.displayName ?? o.approach.name}
                </span>
                {hazard ? (
                    <span className="shrink-0 text-[11px]" title={en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL'} aria-hidden>⚠️</span>
                ) : null}
                {orbitBlocked ? (
                    <span className="shrink-0 text-[10px] text-white/30" aria-hidden>
                        {en ? 'no orbit' : 'sem órbita'}
                    </span>
                ) : !hasScenePosition ? (
                    <span className="shrink-0 text-[10px] text-amber-200/60" aria-hidden>
                        {en ? 'no pos.' : 'sem pos.'}
                    </span>
                ) : null}
                <span className="shrink-0 tabular-nums text-white/55">
                    {trailingLabel}
                </span>
            </button>
        </li>
    );
}
