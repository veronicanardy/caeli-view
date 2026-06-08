/**
 * Indicador visual de velocidade relativa de aproximação.
 *
 * Responsabilidade: apresentar a velocidade atual como percentual de uma escala
 * de referência, com barra de progresso e ícone. Não calcula velocidade real.
 */

import { Gauge } from 'lucide-react';
import { formatNumber } from '@/lib/format';

/** Referência padrão para escalar a barra quando o máximo recebido é inválido. */
const DEFAULT_MAX_VELOCITY_KPH = 120_000;

/**
 * Calcula o percentual visual da barra de velocidade.
 *
 * - Valores nulos, negativos ou não finitos viram zero.
 * - O máximo inválido cai para a referência padrão.
 * - O piso visual de 6% só vale para velocidades positivas.
 */
export function velocityPercent(velocityKph: number | null | undefined, maxVelocityKph = DEFAULT_MAX_VELOCITY_KPH): number {
    const safeVelocity = Number.isFinite(velocityKph ?? NaN) ? Math.max(0, velocityKph ?? 0) : 0;
    const safeMaxVelocity = Number.isFinite(maxVelocityKph) && maxVelocityKph > 0 ? maxVelocityKph : DEFAULT_MAX_VELOCITY_KPH;

    return safeVelocity > 0 ? Math.max(6, Math.min(100, (safeVelocity / safeMaxVelocity) * 100)) : 0;
}

/** Exibe a velocidade relativa de um objeto como barra de progresso com gradiente de cor. */
export function VelocityIndicator({
    velocityKph,
    maxVelocityKph = DEFAULT_MAX_VELOCITY_KPH,
}: {
    velocityKph: number | null | undefined;
    /** Velocidade máxima de referência para escalar a barra (padrão: 120.000 km/h). */
    maxVelocityKph?: number;
}) {
    const percent = velocityPercent(velocityKph, maxVelocityKph);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-white/60">
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
