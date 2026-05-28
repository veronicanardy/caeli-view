import { Link } from '@inertiajs/react';
import { Gauge, Ruler, ShieldAlert } from 'lucide-react';
import { Asteroid } from '@/types';
import { compactKm, formatDate, formatNumber } from '@/lib/format';

export function AsteroidCard({ asteroid }: { asteroid: Asteroid }) {
    return (
        <article className="hover-lift rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow backdrop-blur transition duration-300">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link className="text-lg font-semibold text-white hover:text-signal-cyan" href={`/asteroides/${asteroid.id}`}>
                        {asteroid.name}
                    </Link>
                    <p className="mt-1 text-sm text-white/60">{formatDate(asteroid.primaryApproach?.date)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${asteroid.potentiallyHazardous ? 'bg-signal-coral/15 text-signal-coral' : 'bg-signal-mint/15 text-signal-mint'}`}>
                    {asteroid.potentiallyHazardous ? 'Monitoramento especial' : 'Monitorado'}
                </span>
            </div>
            <dl className="mt-5 grid gap-3 text-sm text-white/70">
                <div className="flex items-center gap-2">
                    <Ruler className="size-4 text-signal-cyan" aria-hidden="true" />
                    <span>Diâmetro médio: {formatNumber(asteroid.averageDiameterKm, 3)} km</span>
                </div>
                <div className="flex items-center gap-2">
                    <Gauge className="size-4 text-signal-amber" aria-hidden="true" />
                    <span>Velocidade: {formatNumber(asteroid.primaryApproach?.velocityKmPerHour, 0)} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-signal-mint" aria-hidden="true" />
                    <span>Distância: {compactKm(asteroid.primaryApproach?.missDistanceKm)}</span>
                </div>
            </dl>
        </article>
    );
}
