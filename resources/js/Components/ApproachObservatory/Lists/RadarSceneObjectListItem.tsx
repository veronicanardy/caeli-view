import type { ClosestNowObject, SelectionMode, UnifiedApproach } from '@/types';
import { formatObjectListTrailingLabel, objectListItemTitle } from './radarSceneObjectPresentation';

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

// Representa um item interativo da lista do radar sem alterar regras globais de selecao.
export function ObjectListItem({ object: o, palette, isSelected, onSelect, locale, selectionMode, compact = false, orbitMode = false }: ObjectListItemProps) {
    const en = locale === 'en';
    const hasScenePosition = Boolean(o.trajectory?.currentPoint);
    const hasOrbit = Boolean(o.trajectory?.orbitalElements);
    const orbitBlocked = orbitMode && !hasOrbit;
    const hazard = o.approach.hazardFlag;
    const trailingLabel = formatObjectListTrailingLabel(selectionMode, o.approach.approachDate, o.currentDistanceKm, locale);
    const title = objectListItemTitle(orbitBlocked, hasScenePosition, locale);

    return (
        <li>
            <button
                type="button"
                disabled={orbitBlocked}
                onClick={() => onSelect(o.approach)}
                title={title}
                className={[
                    'grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-lg text-left text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                    compact ? 'px-2 py-1' : 'px-2 py-2',
                    orbitBlocked
                        ? 'cursor-not-allowed opacity-35'
                        : isSelected
                          ? 'bg-signal-cyan/15 text-white ring-1 ring-signal-cyan/40'
                          : 'text-white/75 hover:bg-white/[0.08] hover:text-white',
                    !orbitBlocked && !hasScenePosition ? 'opacity-50' : '',
                ].join(' ')}
            >
                <span className="col-start-1 row-start-1 h-2 w-2 self-center rounded-full ring-1 ring-white/10" style={{ backgroundColor: palette.future }} />
                <span className="col-start-2 row-start-1 flex min-w-0 items-center gap-1 font-medium">
                    <span className="min-w-0 truncate">{o.approach.displayName ?? o.approach.name}</span>
                    {hazard ? (
                        <span className="shrink-0 text-[11px]" title={en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL'} aria-hidden>{'\u26A0\uFE0F'}</span>
                    ) : null}
                </span>
                {orbitBlocked ? (
                    <span className="col-start-1 col-span-2 row-start-2 min-w-0 truncate text-[10px] text-white/30" aria-hidden>
                        {en ? 'no orbit' : 'sem \u00F3rbita'}
                    </span>
                ) : !hasScenePosition ? (
                    <span className="col-start-1 col-span-2 row-start-2 min-w-0 truncate text-[10px] text-amber-200/60" aria-hidden>
                        {en ? 'no pos.' : 'sem pos.'}
                    </span>
                ) : null}
                <span className="col-start-3 row-span-2 row-start-1 justify-self-end whitespace-nowrap text-right tabular-nums text-[12px] text-white/60">
                    {trailingLabel}
                </span>
            </button>
        </li>
    );
}
