/**
 * Tabela unificada de aproximações do radar.
 *
 * Responsabilidade: apresentar a lista completa de objetos próximos em formato
 * tabular com ordenação, badges de atenção e link para o dossiê individual.
 * Não filtra nem calcula dados — recebe aproximações já processadas.
 */

import { Link } from '@inertiajs/react';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { classifyApproachAttention } from '@/lib/approachAttention';
import { resolveApproachIdentity } from '@/lib/asteroidIdentity';
import { compactKm, compactMeters, formatNumber, lunarDistanceFromKm, lunarDistanceLabel } from '@/lib/format';
import { UnifiedApproach } from '@/types';
import { ObjectTypeBadge } from '../Presenters/ObjectTypeBadge';

const headers = [
    ['approachDate', 'Aproxima\u00E7\u00E3o'],
    ['nominalDistanceKm', 'Dist\u00E2ncia da Terra'],
    ['relativeVelocityKph', 'Velocidade'],
] as const;

// Mantem a tabela desktop e a lista mobile sincronizadas a partir do mesmo preparo de linha.
export function UnifiedApproachTable({
    approaches,
    sortKey,
    onSort,
}: {
    approaches: UnifiedApproach[];
    sortKey: string;
    onSort: (key: string) => void;
}) {
    return (
        <>
            <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                        <thead className="text-left text-white/60">
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
                                <th className="px-4 py-3 font-medium">Compara\u00E7\u00E3o com a Lua</th>
                                <th className="px-4 py-3 font-medium">Tamanho estimado</th>
                                <th className="px-4 py-3 font-medium">Aten\u00E7\u00E3o</th>
                                <th className="px-4 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {approaches.map((approach) => {
                                const row = buildApproachRow(approach);

                                return (
                                    <tr key={approach.id} className="transition hover:bg-white/[0.03]">
                                        <td className="px-4 py-3">
                                            <Link className="font-medium text-white hover:text-signal-cyan" href={approach.detailRoute}>
                                                {row.identity.displayName}
                                            </Link>
                                            <p className="mt-0.5 text-xs text-white/40">{row.subtitle}</p>
                                        </td>
                                        <td className="px-4 py-3"><ObjectTypeBadge type={approach.objectType} /></td>
                                        <td className="px-4 py-3 text-white/65">{row.approachDateLabel}</td>
                                        <td className="px-4 py-3 text-white/65">{row.distanceLabel}</td>
                                        <td className="px-4 py-3 text-white/65">{row.velocityLabel}</td>
                                        <td className="px-4 py-3 text-white/65">{row.lunarDistanceLabel}</td>
                                        <td className="px-4 py-3 text-white/65">{row.sizeLabel}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full border border-signal-violet/25 bg-signal-violet/10 px-2.5 py-0.5 text-xs font-medium text-signal-violet">
                                                {row.attention.label}
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
                    const row = buildApproachRow(approach);

                    return (
                        <li key={approach.id}>
                            <Link
                                href={approach.detailRoute}
                                className="block rounded-lg border border-white/10 bg-white/[0.035] p-3 outline-none transition active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white">{row.identity.displayName}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-white/40">{row.subtitle}</p>
                                    </div>
                                    <ObjectTypeBadge type={approach.objectType} />
                                </div>
                                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                    <div>
                                        <dt className="text-white/40">Dist\u00E2ncia</dt>
                                        <dd className="text-white/75">{row.distanceLabel}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-white/40">Lua</dt>
                                        <dd className="text-white/75">{row.lunarDistanceLabel}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-white/40">Velocidade</dt>
                                        <dd className="text-white/75">{row.velocityLabel}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-white/40">Data</dt>
                                        <dd className="text-white/75">{row.approachDateLabel}</dd>
                                    </div>
                                </dl>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="inline-flex rounded-full border border-signal-violet/25 bg-signal-violet/10 px-2 py-0.5 text-[10px] font-medium text-signal-violet">
                                        {row.attention.label}
                                    </span>
                                    <span className="text-[10px] text-white/40">{row.sizeLabel}</span>
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

    return 'Indispon\u00EDvel';
}

// Concentra apenas derivacoes de apresentacao reutilizadas entre desktop e mobile.
function buildApproachRow(approach: UnifiedApproach) {
    const attention = classifyApproachAttention(approach);
    const identity = resolveApproachIdentity(approach);
    const lunarDistance = lunarDistanceFromKm(approach.nominalDistanceKm) ?? approach.lunarDistance;

    return {
        approachDateLabel: approach.approachDate ?? 'Sem data',
        attention,
        distanceLabel: compactKm(approach.nominalDistanceKm),
        identity,
        lunarDistanceLabel: lunarDistanceLabel(lunarDistance),
        sizeLabel: sizeLabel(approach),
        subtitle: identity.subtitle ?? approach.designation ?? approach.detailIdentifier,
        velocityLabel: `${formatNumber(approach.relativeVelocityKph, 0)} km/h`,
    };
}
