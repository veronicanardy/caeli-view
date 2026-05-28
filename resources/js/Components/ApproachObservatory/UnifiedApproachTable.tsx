import { Link } from '@inertiajs/react';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { classifyApproachAttention } from '@/lib/approachAttention';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactKm, compactMeters, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { UnifiedApproach } from '@/types';
import { ObjectTypeBadge } from './ObjectTypeBadge';

export function UnifiedApproachTable({
    approaches,
    sortKey,
    onSort,
}: {
    approaches: UnifiedApproach[];
    sortKey: string;
    onSort: (key: string) => void;
}) {
    const headers = [
        ['approachDate', 'Aproximação'],
        ['nominalDistanceKm', 'Distância da Terra'],
        ['relativeVelocityKph', 'Velocidade'],
    ] as const;

    return (
        <>
            <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                        <thead className="text-left text-white/55">
                            <tr>
                                <th className="px-4 py-3 font-medium">Objeto</th>
                                <th className="px-4 py-3 font-medium">Tipo</th>
                                {headers.map(([key, label]) => (
                                    <th key={key} className="px-4 py-3 font-medium">
                                        <button className="inline-flex items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan" onClick={() => onSort(key)}>
                                            {label}
                                            <ArrowUpDown className={`size-3.5 ${sortKey === key ? 'text-signal-cyan' : ''}`} aria-hidden="true" />
                                        </button>
                                    </th>
                                ))}
                                <th className="px-4 py-3 font-medium">Comparação com a Lua</th>
                                <th className="px-4 py-3 font-medium">Tamanho estimado</th>
                                <th className="px-4 py-3 font-medium">Atenção</th>
                                <th className="px-4 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {approaches.map((approach) => {
                                const attention = classifyApproachAttention(approach);
                                const lunarDistance = lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance;
                                const identity = resolveApproachIdentity(approach);

                                return (
                                    <tr key={approach.id} className="transition hover:bg-white/[0.03]">
                                        <td className="px-4 py-3">
                                            <Link className="font-medium text-white hover:text-signal-cyan" href={approach.detailRoute}>
                                                {identity.displayName}
                                            </Link>
                                            <p className="mt-0.5 text-xs text-white/40">{identity.subtitle ?? approach.designation ?? approach.detailIdentifier}</p>
                                        </td>
                                        <td className="px-4 py-3"><ObjectTypeBadge type={approach.objectType} /></td>
                                        <td className="px-4 py-3 text-white/65">{approach.approachDate ?? 'Sem data'}</td>
                                        <td className="px-4 py-3 text-white/65">{compactKm(approach.nominalDistanceKm)}</td>
                                        <td className="px-4 py-3 text-white/65">{formatNumber(approach.relativeVelocityKph, 0)} km/h</td>
                                        <td className="px-4 py-3 text-white/65">{lunarDistanceLabel(lunarDistance)}</td>
                                        <td className="px-4 py-3 text-white/65">{sizeLabel(approach)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full border border-signal-violet/25 bg-signal-violet/10 px-2.5 py-0.5 text-xs font-medium text-signal-violet">
                                                {attention.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white/80 transition hover:border-signal-cyan/40 hover:text-signal-cyan" href={approach.detailRoute}>
                                                Abrir
                                                <ExternalLink className="size-3" aria-hidden="true" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <ul className="grid gap-2 md:hidden">
                {approaches.map((approach) => {
                    const attention = classifyApproachAttention(approach);
                    const lunarDistance = lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance;
                    const identity = resolveApproachIdentity(approach);

                    return (
                        <li key={approach.id}>
                            <Link
                                href={approach.detailRoute}
                                className="block rounded-lg border border-white/10 bg-white/[0.035] p-3 outline-none transition active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white">{identity.displayName}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-white/40">{identity.subtitle ?? approach.designation ?? approach.detailIdentifier}</p>
                                    </div>
                                    <ObjectTypeBadge type={approach.objectType} />
                                </div>
                                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                    <div>
                                        <dt className="text-white/40">Distância</dt>
                                        <dd className="text-white/75">{compactKm(approach.nominalDistanceKm)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-white/40">Lua</dt>
                                        <dd className="text-white/75">{lunarDistanceLabel(lunarDistance)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-white/40">Velocidade</dt>
                                        <dd className="text-white/75">{formatNumber(approach.relativeVelocityKph, 0)} km/h</dd>
                                    </div>
                                    <div>
                                        <dt className="text-white/40">Data</dt>
                                        <dd className="text-white/75">{approach.approachDate ?? 'Sem data'}</dd>
                                    </div>
                                </dl>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="inline-flex rounded-full border border-signal-violet/25 bg-signal-violet/10 px-2 py-0.5 text-[10px] font-medium text-signal-violet">
                                        {attention.label}
                                    </span>
                                    <span className="text-[10px] text-white/40">{sizeLabel(approach)}</span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

function sizeLabel(approach: UnifiedApproach): string {
    if (approach.diameterMeters !== null) {
        return compactMeters(approach.diameterMeters);
    }

    if (approach.estimatedDiameterMinMeters !== null || approach.estimatedDiameterMaxMeters !== null) {
        return `${compactMeters(approach.estimatedDiameterMinMeters)} a ${compactMeters(approach.estimatedDiameterMaxMeters)}`;
    }

    return 'Indisponível';
}
