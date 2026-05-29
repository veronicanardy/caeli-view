import { Gauge } from 'lucide-react';
import { formatNumber } from '@/lib/format';

/** Exibe a velocidade relativa de um objeto como barra de progresso com gradiente de cor. */
export function VelocityIndicator({
    velocityKph,
    maxVelocityKph = 120_000,
}: {
    velocityKph: number | null | undefined;
    /** Velocidade máxima de referência para escalar a barra (padrão: 120.000 km/h). */
    maxVelocityKph?: number;
}) {
    // Mínimo de 6% para que a barra nunca desapareça visualmente mesmo em velocidades muito baixas.
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

            {/* Gradiente: ciano (lento) → menta → âmbar (rápido) */}
            <div className="h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Velocidade relativa" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div
                    className="h-full rounded-full bg-gradient-to-r from-signal-cyan via-signal-mint to-signal-amber transition-all duration-500"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
