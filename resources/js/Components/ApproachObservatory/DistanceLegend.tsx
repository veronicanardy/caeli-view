import { Moon } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { LunarReference } from '@/types';

export function DistanceLegend({ reference, locale = 'pt-BR' }: { reference: LunarReference; locale?: 'pt-BR' | 'en' }) {
    const en = locale === 'en';
    return (
        <aside className="rounded-lg border border-white/10 bg-space-950/65 p-4">
            <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-100">
                    <Moon className="size-4" aria-hidden="true" />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-white">
                        {en ? 'Moon as a ruler' : 'Lua como régua de escala'}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-white/58">
                        {reference.label}: {formatNumber(reference.distanceKm, 0)} km{en ? ', about ' : ', cerca de '}{formatNumber(reference.earthDiametersApprox, 0)} {en ? 'Earths.' : 'Terras.'}
                        {' '}
                        {en ? 'Objects beyond this mark appear outside the lunar ring.' : 'Objetos além dessa marca aparecem fora do anel lunar.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-signal-coral/30 bg-signal-coral/10 px-2.5 py-1 text-signal-coral">
                            {en ? 'Inside the Moon distance' : 'Dentro da distância lunar'}
                        </span>
                        <span className="rounded-full border border-signal-amber/35 bg-signal-amber/10 px-2.5 py-1 text-signal-amber">
                            {en ? 'Near the Moon' : 'Próximo da Lua'}
                        </span>
                        <span className="rounded-full border border-signal-cyan/35 bg-signal-cyan/10 px-2.5 py-1 text-signal-cyan">
                            {en ? 'Beyond the Moon' : 'Além da Lua'}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
