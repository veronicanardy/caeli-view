import { Link } from '@inertiajs/react';
import { JplCloseApproach } from '@/types';
import { ObjectTypeBadge } from './ObjectTypeBadge';

export function ApproachVisualMap({ approaches }: { approaches: JplCloseApproach[] }) {
    const visible = approaches.slice(0, 18);
    const maxDistance = Math.max(...visible.map((item) => item.distanceAu ?? 0.2), 0.2);

    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Mapa de aproximações</h2>
                    <p className="mt-1 text-sm text-white/60">Representação visual simplificada com base nos dados retornados pelo JPL.</p>
                </div>
                <p className="text-xs text-white/45">Distância radial proporcional dentro desta consulta.</p>
            </div>
            <div className="relative mt-6 aspect-[1.45] min-h-80 overflow-hidden rounded-lg border border-white/10 bg-space-950/70">
                <div className="absolute inset-8 rounded-full border border-white/10" />
                <div className="absolute inset-16 rounded-full border border-white/10" />
                <div className="absolute inset-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-signal-cyan to-blue-600 shadow-[0_0_55px_rgba(84,214,214,0.35)]" aria-label="Terra" />
                {visible.map((approach, index) => {
                    const angle = (index / Math.max(visible.length, 1)) * Math.PI * 2 - Math.PI / 2;
                    const radius = 18 + Math.min(42, ((approach.distanceAu ?? maxDistance) / maxDistance) * 42);
                    const left = 50 + Math.cos(angle) * radius;
                    const top = 50 + Math.sin(angle) * radius;
                    const comet = approach.objectType === 'comet';

                    return (
                        <Link
                            key={`${approach.designation}-${approach.julianDate}`}
                            href={`/radar/objetos/${encodeURIComponent(approach.detailId)}`}
                            className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            style={{ left: `${left}%`, top: `${top}%` }}
                            aria-label={`Ver detalhes de ${approach.displayName}`}
                        >
                            <span className={`block rounded-full ${comet ? 'size-4 bg-signal-amber' : 'size-3 bg-signal-cyan'} shadow-glow`} />
                            {comet ? <span className="absolute left-3 top-1/2 h-px w-7 -translate-y-1/2 bg-gradient-to-r from-signal-amber/80 to-transparent" aria-hidden="true" /> : null}
                            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-64 -translate-x-1/2 rounded border border-white/10 bg-space-950/95 p-3 text-left opacity-0 shadow-glow transition group-hover:opacity-100 group-focus-visible:opacity-100">
                                <span className="block text-sm font-semibold text-white">{approach.displayName}</span>
                                <span className="mt-2 flex"><ObjectTypeBadge type={approach.objectType} /></span>
                                <span className="mt-2 block text-xs text-white/60">{approach.calendarDate ?? 'Data não informada'} · {approach.approachBody ?? 'Corpo não informado'}</span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
