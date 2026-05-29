import { CalendarClock, LocateFixed, Moon, SatelliteDish } from 'lucide-react';
import type { ReactNode } from 'react';
import { compactKm, formatNumber, lunarDistanceFromKm } from '@/lib/format';
import { bestDistanceKm, bestDistanceLD } from '@/lib/radarData';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { AsteroidTrajectory, HorizonsPositionResult, UnifiedApproach } from '@/types';

type Props = {
    approaches: UnifiedApproach[];
    positionsById: Record<string, HorizonsPositionResult>;
    focusId: string | null;
    selectedDate: string;
    locale: 'pt-BR' | 'en';
    trajectoryByKey: Record<string, AsteroidTrajectory>;
    trajectoryLoadingKey: string | null;
};

export function DailyProximityList({ approaches, positionsById, focusId, selectedDate, locale, trajectoryByKey, trajectoryLoadingKey }: Props) {
    const en = locale === 'en';
    const sorted = approaches
        .slice()
        .sort((left, right) => (bestDistanceKm(left, positionsById[left.id]) ?? Infinity) - (bestDistanceKm(right, positionsById[right.id]) ?? Infinity));

    if (!sorted.length) {
        return (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
                {en ? 'No relevant close approach found for this date.' : 'Nenhuma aproximação relevante encontrada para esta data.'}
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
                            <Fact icon={<Moon className="size-3.5" />} label={en ? 'Lunar distance' : 'Distância lunar'} value={lunar !== null ? `${formatNumber(lunar, lunar < 10 ? 1 : 0)} DL` : '—'} />
                            <Fact icon={<LocateFixed className="size-3.5" />} label={todaySelected ? (en ? 'Distance now' : 'Distância agora') : (en ? 'Distance' : 'Distância')} value={compactKm(distanceKm)} />
                            <Fact icon={<CalendarClock className="size-3.5" />} label={en ? 'Closest approach' : 'Máxima aproximação'} value={time} />
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

function dailyReasonText(name: string, lunar: number | null, time: string, selectedDate: string, todaySelected: boolean, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    const dateLabel = formatSelectedDay(selectedDate, locale);
    const lunarText = lunar !== null ? formatNumber(lunar, lunar < 10 ? 1 : 0) : null;

    if (todaySelected) {
        if (en) {
            return lunarText
                ? `${name} is listed because it is among the closest monitored objects right now, at ${lunarText} lunar distances. Closest approach: ${time}.`
                : `${name} is listed because it is among the closest monitored objects right now. Closest approach: ${time}.`;
        }

        return lunarText
            ? `${name} aparece porque está entre os objetos monitorados mais próximos agora, a ${lunarText} distâncias lunares. Máxima aproximação: ${time}.`
            : `${name} aparece porque está entre os objetos monitorados mais próximos agora. Máxima aproximação: ${time}.`;
    }

    if (en) {
        return lunarText
            ? `${name} is listed because its closest approach to Earth happens on ${dateLabel}, at ${lunarText} lunar distances. Maximum approach occurs at ${time}.`
            : `${name} is listed because its closest approach to Earth happens on ${dateLabel}. Maximum approach occurs at ${time}.`;
    }

    return lunarText
        ? `${name} está aqui porque sua máxima aproximação com a Terra ocorre em ${dateLabel}, a ${lunarText} distâncias lunares. A máxima aproximação ocorre às ${time}.`
        : `${name} está aqui porque sua máxima aproximação com a Terra ocorre em ${dateLabel}. A máxima aproximação ocorre às ${time}.`;
}

function isToday(value: string): boolean {
    return value === localDateIso(new Date());
}

function localDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function horizonsStatusLabel(trajectory: AsteroidTrajectory | null, isLoading: boolean, isFocus: boolean, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    if (isLoading) return en ? 'Calculating now...' : 'Calculando agora...';
    if (trajectory?.status === 'available') return en ? 'Available' : 'Disponível';
    if (trajectory?.status === 'fallback') return en ? 'Fallback' : 'Fallback';
    if (trajectory?.status === 'unavailable') return en ? 'Unavailable' : 'Indisponível';
    return isFocus ? (en ? 'Waiting' : 'Aguardando') : (en ? 'Not requested' : 'Não consultado');
}

function motionText(state: AsteroidTrajectory['motionState'], currentLunar: number | null, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    const distance = currentLunar !== null ? ` ${formatNumber(currentLunar, currentLunar < 10 ? 1 : 0)} DL` : '';

    if (state === 'approaching') {
        return en ? `Current Horizons point suggests the object is still approaching Earth.${distance}` : `O ponto atual do Horizons sugere que o objeto ainda está se aproximando da Terra.${distance}`;
    }

    if (state === 'receding') {
        return en ? `Current Horizons point suggests the object is moving away from Earth.${distance}` : `O ponto atual do Horizons sugere que o objeto está se afastando da Terra.${distance}`;
    }

    if (state === 'near_closest') {
        return en ? `Current Horizons point is near the closest-approach window.${distance}` : `O ponto atual do Horizons está perto da janela de máxima aproximação.${distance}`;
    }

    return en ? `Current position calculated, but motion direction is inconclusive.${distance}` : `Posição atual calculada, mas a direção do movimento é inconclusiva.${distance}`;
}

function distanceBandLabel(lunar: number | null, locale: 'pt-BR' | 'en'): string {
    const en = locale === 'en';
    if (lunar === null) return en ? 'Unknown' : 'Sem distância';
    if (lunar < 1) return en ? '0-1 LD · Inside Moon' : '0-1 DL · Dentro da Lua';
    if (lunar <= 5) return en ? '1-5 LD · Very close' : '1-5 DL · Muito próximo';
    if (lunar <= 20) return en ? '5-20 LD · Close' : '5-20 DL · Próximo';
    return en ? '20+ LD · Monitored' : '20+ DL · Monitorado';
}

function formatApproachTime(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(parsed);
}

function formatSelectedDay(value: string, locale: 'pt-BR' | 'en'): string {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(parsed);
}
