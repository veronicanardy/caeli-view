import { compactKm, formatNumber, lunarDistanceLabel } from '@/lib/format';
import { DistanceContext } from '@/types';

export function DistancePresenter({
    distance,
    compact = false,
}: {
    distance: DistanceContext;
    compact?: boolean;
}) {
    const primary = compactKm(distance.kilometers);

    if (compact) {
        return (
            <span>
                {primary}
                {distance.lunarDistance !== null ? <span className="text-white/45"> · {lunarDistanceLabel(distance.lunarDistance)}</span> : null}
            </span>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xl font-semibold text-white">{primary}</p>
            <p className="text-sm text-white/65">{distance.headline}</p>
            <p className="text-xs text-white/45">
                {distance.lunarDistance === null
                    ? distance.comparison
                    : `Aproximação equivalente a ${formatNumber(distance.lunarDistance, distance.lunarDistance < 10 ? 1 : 0)}× a distância média da Lua.`}
            </p>
        </div>
    );
}
