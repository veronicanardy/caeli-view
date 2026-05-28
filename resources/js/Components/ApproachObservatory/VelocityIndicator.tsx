import { Gauge } from 'lucide-react';
import { formatNumber } from '@/lib/format';

export function VelocityIndicator({ velocityKph, maxVelocityKph = 120000 }: { velocityKph: number | null | undefined; maxVelocityKph?: number }) {
    const percent = velocityKph ? Math.max(6, Math.min(100, (velocityKph / maxVelocityKph) * 100)) : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-white/55">
                <span className="inline-flex items-center gap-1.5">
                    <Gauge className="size-3.5 text-signal-amber" aria-hidden="true" />
                    Velocidade relativa
                </span>
                <span>{formatNumber(velocityKph, 0)} km/h</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-signal-cyan via-signal-mint to-signal-amber" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
