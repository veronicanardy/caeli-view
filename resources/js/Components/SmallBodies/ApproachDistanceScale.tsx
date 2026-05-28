import { formatNumber } from '@/lib/format';

export function ApproachDistanceScale({ distanceAu, label = 'Escala de passagem' }: { distanceAu: number | null | undefined; label?: string }) {
    const maxAu = 0.2;
    const percent = distanceAu === null || distanceAu === undefined ? 0 : Math.max(4, Math.min(100, (distanceAu / maxAu) * 100));

    return (
        <div className="space-y-2" aria-label={`${label}: ${formatNumber(distanceAu, 4)} au`}>
            <div className="flex items-center justify-between text-xs text-white/55">
                <span>{label}</span>
                <span>{formatNumber(distanceAu, 4)} au</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-signal-coral via-signal-amber to-signal-cyan transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[11px] text-white/45">Barra proporcional simplificada dentro do intervalo consultado.</p>
        </div>
    );
}
