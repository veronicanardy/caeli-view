import { compactKm, formatNumber } from '@/lib/format';
import { SmallBody, SmallBodyCloseApproach } from '@/types';
import { ObjectTypeBadge } from './ObjectTypeBadge';

export function SimplifiedApproachDiagram({ smallBody, approach }: { smallBody: SmallBody; approach: SmallBodyCloseApproach | null }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Representação da aproximação</h2>
                    <p className="mt-1 text-sm text-white/60">Representação visual simplificada com base nos dados retornados pelo JPL.</p>
                </div>
                <ObjectTypeBadge type={smallBody.objectType} />
            </div>
            <div className="relative mt-6 aspect-[2/1] overflow-hidden rounded-lg border border-white/10 bg-space-950/70">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 400" role="img" aria-label="Diagrama conceitual de aproximação entre a Terra e o objeto">
                    <circle cx="210" cy="200" r="58" fill="#1f7aa5" />
                    <circle cx="210" cy="200" r="78" fill="none" stroke="rgba(84,214,214,0.25)" />
                    <circle cx="210" cy="200" r="150" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="7 9" />
                    <circle cx="360" cy="200" r="13" fill="rgba(226,232,240,0.92)" />
                    <text x="360" y="236" fill="rgba(255,255,255,0.62)" textAnchor="middle" fontSize="14">Lua média</text>
                    <path d="M290 200 C420 80 530 80 650 200" fill="none" stroke="rgba(248,199,107,0.65)" strokeWidth="2" strokeDasharray="8 8" />
                    <circle cx="650" cy="200" r={smallBody.objectType === 'comet' ? 13 : 10} fill={smallBody.objectType === 'comet' ? '#f8c76b' : '#54d6d6'} />
                    {smallBody.objectType === 'comet' ? <path d="M650 200 L704 184 L704 216 Z" fill="rgba(248,199,107,0.22)" /> : null}
                    <line x1="210" y1="290" x2="650" y2="290" stroke="rgba(255,255,255,0.25)" />
                    <text x="430" y="322" fill="rgba(255,255,255,0.72)" textAnchor="middle" fontSize="22">{compactKm(approach?.distanceKm)}</text>
                </svg>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <p className="rounded border border-white/10 bg-space-950/45 p-3 text-sm text-white/65">Distância destacada: <span className="text-white">{compactKm(approach?.distanceKm)}</span></p>
                <p className="rounded border border-white/10 bg-space-950/45 p-3 text-sm text-white/65">Velocidade relativa: <span className="text-white">{formatNumber(approach?.relativeVelocityKmS, 2)} km/s</span></p>
            </div>
        </section>
    );
}
