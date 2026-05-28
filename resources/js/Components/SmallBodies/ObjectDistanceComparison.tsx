import { SmallBodyCloseApproach } from '@/types';
import { ApproachDistanceScale } from './ApproachDistanceScale';
import { LunarDistanceCard } from './LunarDistanceCard';

export function ObjectDistanceComparison({ approach }: { approach: SmallBodyCloseApproach | null }) {
    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <LunarDistanceCard distanceKm={approach?.distanceKm} lunarDistance={approach?.distanceLunar} />
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
                <ApproachDistanceScale distanceAu={approach?.distanceAu} label="Distância nominal da aproximação principal" />
                <p className="mt-4 text-xs leading-5 text-white/45">
                    Esta barra é um apoio visual simplificado. A posição e escala não representam geometria orbital absoluta.
                </p>
            </div>
        </div>
    );
}
