import { Link } from '@inertiajs/react';
import { ArrowUpDown } from 'lucide-react';
import { compactKm, formatNumber } from '@/lib/format';
import { JplCloseApproach } from '@/types';
import { ObjectTypeBadge } from './ObjectTypeBadge';

export function CloseApproachTable({
    approaches,
    sortKey,
    onSort,
}: {
    approaches: JplCloseApproach[];
    sortKey: string;
    onSort: (key: string) => void;
}) {
    const headers = [
        ['calendarDate', 'Data'],
        ['distanceAu', 'Distância'],
        ['relativeVelocityKmS', 'Velocidade'],
    ] as const;

    return (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-glow">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="text-left text-white/60">
                        <tr>
                            <th className="px-5 py-4 font-medium">Viajante</th>
                            {headers.map(([key, label]) => (
                                <th key={key} className="px-5 py-4 font-medium">
                                    <button className="inline-flex items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan" onClick={() => onSort(key)}>
                                        {label}
                                        <ArrowUpDown className={`size-3.5 ${sortKey === key ? 'text-signal-cyan' : ''}`} aria-hidden="true" />
                                    </button>
                                </th>
                            ))}
                            <th className="px-5 py-4 font-medium">Corpo</th>
                            <th className="px-5 py-4 font-medium">Tipo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {approaches.map((approach) => (
                            <tr key={`${approach.designation}-${approach.julianDate}`} className="transition hover:bg-white/[0.04]">
                                <td className="px-5 py-4">
                                    <Link className="font-medium text-white hover:text-signal-cyan" href={`/radar/objetos/${encodeURIComponent(approach.detailId)}`}>
                                        {approach.displayName}
                                    </Link>
                                    <p className="mt-1 text-xs text-white/45">{approach.designation}</p>
                                </td>
                                <td className="px-5 py-4 text-white/70">{approach.calendarDate ?? 'Sem data'}</td>
                                <td className="px-5 py-4 text-white/70">{compactKm(approach.distanceKm)}</td>
                                <td className="px-5 py-4 text-white/70">{formatNumber(approach.relativeVelocityKmS, 2)} km/s</td>
                                <td className="px-5 py-4 text-white/70">{approach.approachBody ?? 'Terra'}</td>
                                <td className="px-5 py-4"><ObjectTypeBadge type={approach.objectType} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
