import { Gauge } from 'lucide-react';
import { formatNumber } from '@/lib/format';

export function VelocityIndicator({ velocityKmS, max = 40 }: { velocityKmS: number | null | undefined; max?: number }) {
    const percent = velocityKmS === null || velocityKmS === undefined ? 0 : Math.max(5, Math.min(100, (velocityKmS / max) * 100));

    return (
        <div className="space-y-2" aria-label={`Velocidade relativa: ${formatNumber(velocityKmS, 2)} quilômetros por segundo`}>
            <div className="flex items-center justify-between text-xs text-white/55">
                <span className="inline-flex items-center gap-1.5">
                    <Gauge className="size-3.5" aria-hidden="true" />
                    Velocidade relativa
                </span>
                <span>{formatNumber(velocityKmS, 2)} km/s</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-signal-mint to-signal-amber transition-all" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
