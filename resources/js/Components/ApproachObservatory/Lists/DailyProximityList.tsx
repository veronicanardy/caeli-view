import { CalendarClock, LocateFixed, Moon, SatelliteDish } from 'lucide-react';
import type { ReactNode } from 'react';
import { compactKm, formatNumber, lunarDistanceFromKm } from '@/lib/format';
import { bestDistanceKm, bestDistanceLD } from '@/lib/radarData';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { AsteroidTrajectory, HorizonsPositionResult, UnifiedApproach } from '@/types';
import { dailyReasonText, distanceBandLabel, formatApproachTime, horizonsStatusLabel, isToday, motionText } from './dailyProximityPresentation';

type Props = {
    approaches: UnifiedApproach[];
    positionsById: Record<string, HorizonsPositionResult>;
    focusId: string | null;
    selectedDate: string;
    locale: 'pt-BR' | 'en';
    trajectoryByKey: Record<string, AsteroidTrajectory>;
    trajectoryLoadingKey: string | null;
};

// Renderiza os cards diarios a partir de dados ja preparados por outras camadas.
export function DailyProximityList({ approaches, positionsById, focusId, selectedDate, locale, trajectoryByKey, trajectoryLoadingKey }: Props) {
    const en = locale === 'en';
    const sorted = approaches
        .slice()
        .sort((left, right) => (bestDistanceKm(left, positionsById[left.id]) ?? Infinity) - (bestDistanceKm(right, positionsById[right.id]) ?? Infinity));

    if (!sorted.length) {
        return (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
                {en ? 'No relevant close approach found for this date.' : 'Nenhuma aproxima\u00E7\u00E3o relevante encontrada para esta data.'}
            </div>
        );
    }

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {sorted.map((approach) => {
                const identity = resolveApproachIdentity(approach);
                const distanceKm = bestDistanceKm(approach, positionsById[approach.id]);
                const lunar = bestDistanceLD(approach, positionsById[approach.id]) ?? approach.lunarDistance ?? lunarDistanceFromKm(distanceKm);
                const key = `${approach.id}:${approach.approachDate ?? ''}`;
                const trajectory = trajectoryByKey[key] ?? null;
                const isLoading = trajectoryLoadingKey === key;
                const isFocus = approach.id === focusId;
                const time = formatApproachTime(approach.approachDate, locale);
                const todaySelected = isToday(selectedDate);

                return (
                    <article
                        key={approach.id}
                        className={`rounded-lg border p-4 transition ${
                            isFocus
                                ? 'border-signal-cyan/40 bg-signal-cyan/[0.08] shadow-[0_0_28px_rgba(84,214,214,0.12)]'
                                : 'border-white/10 bg-white/[0.035]'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-semibold text-white">{identity.displayName}</h3>
                                    {isFocus ? (
                                        <span className="rounded-full border border-signal-cyan/35 bg-signal-cyan/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-cyan">
                                            {en ? 'In focus' : 'Em foco'}
                                        </span>
                                    ) : null}
                                </div>
                                {identity.subtitle ? <p className="mt-0.5 truncate text-xs text-white/45">{identity.subtitle}</p> : null}
                            </div>
                            <span className="shrink-0 rounded-full border border-white/10 bg-space-950/70 px-2 py-1 text-xs text-white/62">
                                {distanceBandLabel(lunar, locale)}
                            </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-white/68">
                            {dailyReasonText(identity.displayName, lunar, time, selectedDate, todaySelected, locale)}
                        </p>

                        <div className="mt-4 grid gap-2 text-xs text-white/58 sm:grid-cols-2">
                            <Fact icon={<Moon className="size-3.5" />} label={en ? 'Lunar distance' : 'Dist\u00E2ncia lunar'} value={lunar !== null ? `${formatNumber(lunar, lunar < 10 ? 1 : 0)} DL` : '\u2014'} />
                            <Fact icon={<LocateFixed className="size-3.5" />} label={todaySelected ? (en ? 'Distance now' : 'Dist\u00E2ncia agora') : (en ? 'Distance' : 'Dist\u00E2ncia')} value={compactKm(distanceKm)} />
                            <Fact icon={<CalendarClock className="size-3.5" />} label={en ? 'Closest approach' : 'M\u00E1xima aproxima\u00E7\u00E3o'} value={time} />
                            <Fact icon={<SatelliteDish className="size-3.5" />} label="Horizons" value={horizonsStatusLabel(trajectory, isLoading, isFocus, locale)} />
                        </div>

                        {trajectory?.status === 'available' ? (
                            <p className="mt-3 rounded border border-white/10 bg-space-950/55 px-3 py-2 text-xs leading-5 text-white/55">
                                {motionText(trajectory.motionState, trajectory.referencePoint?.distanceLunar ?? null, locale)}
                            </p>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}

// Bloco visual pequeno para manter a grade de fatos legivel dentro do card.
function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded border border-white/10 bg-space-950/45 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/42">
                {icon}
                {label}
            </div>
            <p className="mt-1 font-medium text-white/78">{value}</p>
        </div>
    );
}
