import { Link } from '@inertiajs/react';
import { Asteroid } from '@/types';
import { compactKm, formatDate, formatNumber } from '@/lib/format';

export function AsteroidTable({ asteroids }: { asteroids: Asteroid[] }) {
    return (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-space-950/50 shadow-glow">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/[0.06] text-left text-white/70">
                        <tr>
                            <th className="px-4 py-3 font-medium">Nome</th>
                            <th className="px-4 py-3 font-medium">Aproximação</th>
                            <th className="px-4 py-3 font-medium">Velocidade</th>
                            <th className="px-4 py-3 font-medium">Distância</th>
                            <th className="px-4 py-3 font-medium">Diâmetro</th>
                            <th className="px-4 py-3 font-medium">Risco</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                        {asteroids.map((asteroid) => (
                            <tr key={asteroid.id} className="hover:bg-white/[0.04]">
                                <td className="px-4 py-3">
                                    <Link className="font-medium text-white hover:text-signal-cyan" href={`/asteroides/${asteroid.id}`}>
                                        {asteroid.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-white/70">{formatDate(asteroid.primaryApproach?.date)}</td>
                                <td className="px-4 py-3 text-white/70">{formatNumber(asteroid.primaryApproach?.velocityKmPerHour, 0)} km/h</td>
                                <td className="px-4 py-3 text-white/70">{compactKm(asteroid.primaryApproach?.missDistanceKm)}</td>
                                <td className="px-4 py-3 text-white/70">{formatNumber(asteroid.averageDiameterKm, 3)} km</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-full px-3 py-1 text-xs ${asteroid.potentiallyHazardous ? 'bg-signal-coral/15 text-signal-coral' : 'bg-signal-mint/15 text-signal-mint'}`}>
                                        {asteroid.potentiallyHazardous ? 'Potencialmente perigoso' : 'Monitorado'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
