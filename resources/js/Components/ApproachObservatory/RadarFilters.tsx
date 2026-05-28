import type { Translator } from '@/i18n';
import type { RadarMode } from '@/types';

/**
 * Backwards-compatible alias. The radar UI used to expose a client-side filter id; now it
 * exposes the *mode* (which decides what to fetch). Keeping the old name avoids touching
 * every import site, but the values are the new mode keys.
 */
export type RadarFilterId = RadarMode;

type Props = {
    activeId: RadarMode;
    onChange: (id: RadarMode) => void;
    counts?: Partial<Record<RadarMode, number>>;
    t: Translator;
};

export function RadarFilters({ activeId, onChange, counts, t }: Props) {
    const filters: Array<{ id: RadarMode; label: string }> = [
        { id: 'closest-5-now', label: t('observatory.radar.modes.closestNow') },
        { id: 'today', label: t('observatory.radar.modes.today') },
        { id: 'next-7d', label: t('observatory.radar.modes.next7d') },
        { id: 'pha', label: t('observatory.radar.modes.pha') },
        { id: 'all', label: t('observatory.radar.modes.all') },
    ];

    return (
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t('observatory.radar.filters.aria')}>
            {filters.map((filter) => {
                const isActive = filter.id === activeId;
                const count = counts?.[filter.id];
                return (
                    <button
                        key={filter.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(filter.id)}
                        className={[
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                            isActive
                                ? 'border-signal-cyan/55 bg-signal-cyan/12 text-white'
                                : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-white/25 hover:text-white',
                        ].join(' ')}
                    >
                        {filter.label}
                        {typeof count === 'number' ? (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>
                                {count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
