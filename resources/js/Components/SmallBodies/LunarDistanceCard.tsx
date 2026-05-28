import { Moon } from 'lucide-react';
import { compactKm, formatNumber, lunarDistanceLabel } from '@/lib/format';

export function LunarDistanceCard({ distanceKm, lunarDistance }: { distanceKm: number | null | undefined; lunarDistance: number | null | undefined }) {
    const band = lunarDistance === null || lunarDistance === undefined ? 'unknown' : lunarDistance < 1 ? 'inside' : lunarDistance <= 1.5 ? 'near' : 'beyond';
    const headline = band === 'inside' ? 'Mais perto do que a órbita média da Lua' : band === 'near' ? 'Próximo da faixa lunar' : band === 'beyond' ? 'Além da órbita média da Lua' : 'Distância sem comparação lunar';

    return (
        <article className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
            <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-100">
                    <Moon className="size-5" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-sm text-white/55">Escala da aproximação</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{headline}</h3>
                </div>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-white/10 bg-space-950/45 p-3">
                    <dt className="text-xs text-white/45">Distância nominal</dt>
                    <dd className="mt-1 text-base font-semibold text-white">{compactKm(distanceKm)}</dd>
                </div>
                <div className="rounded border border-white/10 bg-space-950/45 p-3">
                    <dt className="text-xs text-white/45">Comparação com a Lua</dt>
                    <dd className="mt-1 text-base font-semibold text-white">{lunarDistanceLabel(lunarDistance)}</dd>
                </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-white/45">
                A referência usa a distância média Terra-Lua de {formatNumber(384400, 0)} km, uma régua didática para sentir a escala.
            </p>
        </article>
    );
}
