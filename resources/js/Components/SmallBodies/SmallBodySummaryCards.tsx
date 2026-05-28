import { CalendarClock, Gauge, Orbit, Sparkles, Target } from 'lucide-react';
import { ComponentType, ReactNode } from 'react';
import { compactKm, formatNumber } from '@/lib/format';
import { JplApproachSummary } from '@/types';
import { ApproachDistanceScale } from './ApproachDistanceScale';
import { VelocityIndicator } from './VelocityIndicator';

export function SmallBodySummaryCards({ summary }: { summary: JplApproachSummary }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryShell icon={Orbit} label="Aproximações" value={formatNumber(summary.total, 0)}>
                <div className="mt-4 grid grid-cols-10 gap-1" aria-hidden="true">
                    {Array.from({ length: 20 }).map((_, index) => (
                        <span key={index} className={`h-1.5 rounded-full ${index < Math.min(summary.total, 20) ? 'bg-signal-cyan' : 'bg-white/10'}`} />
                    ))}
                </div>
            </SummaryShell>
            <SummaryShell icon={Sparkles} label="Cometas encontrados" value={formatNumber(summary.comets, 0)} accent="text-signal-amber">
                <p className="mt-3 text-xs text-white/55">{summary.asteroids} asteroides no mesmo recorte.</p>
            </SummaryShell>
            <SummaryShell icon={Target} label="Menor distância" value={compactKm(summary.closestDistanceKm)}>
                <ApproachDistanceScale distanceAu={summary.closestDistanceAu} label={summary.closestObjectName ?? 'Objeto mais próximo'} />
            </SummaryShell>
            <SummaryShell icon={Gauge} label="Maior velocidade" value={`${formatNumber(summary.fastestVelocityKmS, 2)} km/s`}>
                <VelocityIndicator velocityKmS={summary.fastestVelocityKmS} />
            </SummaryShell>
            <SummaryShell icon={CalendarClock} label="Próxima aproximação" value={summary.nextApproachDate ?? 'Sem data'}>
                <p className="mt-3 text-xs text-white/55">{summary.nextApproachName ?? 'Ajuste os filtros para novas passagens.'}</p>
            </SummaryShell>
        </div>
    );
}

function SummaryShell({
    icon: Icon,
    label,
    value,
    accent = 'text-white',
    children,
}: {
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: string;
    accent?: string;
    children: ReactNode;
}) {
    return (
        <article className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow transition hover:-translate-y-1 hover:border-signal-cyan/35 hover:bg-white/[0.07]">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white/60">{label}</p>
                <span className="rounded-full border border-white/10 bg-white/5 p-2 text-signal-cyan">
                    <Icon className="size-4" aria-hidden={true} />
                </span>
            </div>
            <p className={`mt-3 break-words text-2xl font-semibold ${accent}`}>{value}</p>
            <div className="mt-3">{children}</div>
        </article>
    );
}
