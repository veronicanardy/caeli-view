import { Activity, Compass, Orbit, RotateCcw, Timer, Waypoints } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { OrbitalElement } from '@/types';
import { EmptyScientificData } from './EmptyScientificData';
import { ScientificTooltip } from './ScientificTooltip';

const desired = [
    ['a', 'Semi-eixo maior', 'Metade do eixo maior da órbita osculante.', Orbit, 6],
    ['e', 'Excentricidade', 'Indica o quanto a órbita se afasta de um círculo.', Activity, 1],
    ['i', 'Inclinação', 'Ângulo entre o plano orbital e o plano de referência.', Compass, 180],
    ['q', 'Periélio', 'Menor distância do objeto ao Sol.', Waypoints, 6],
    ['ad', 'Afélio', 'Maior distância do objeto ao Sol, quando fornecida.', Waypoints, 12],
    ['per', 'Período orbital', 'Tempo para completar uma volta ao redor do Sol.', Timer, 4000],
    ['om', 'Longitude do nó ascendente', 'Orientação do ponto em que a órbita cruza o plano de referência.', RotateCcw, 360],
    ['w', 'Argumento do periélio', 'Orientação do periélio dentro do plano orbital.', RotateCcw, 360],
    ['ma', 'Anomalia média', 'Posição orbital média na época dos elementos.', RotateCcw, 360],
] as const;

export function OrbitalElementsVisualGrid({ elements }: { elements: OrbitalElement[] }) {
    const byName = new Map(elements.map((element) => [element.name, element]));
    const visible = desired.map(([name, fallbackTitle, help, Icon, max]) => ({ element: byName.get(name), name, fallbackTitle, help, Icon, max })).filter((item) => item.element?.displayValue);

    if (!visible.length) {
        return <EmptyScientificData title="Elementos orbitais em atualização" message="O retorno atual do JPL não trouxe elementos orbitais suficientes para desenhar a trajetória." />;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ element, name, fallbackTitle, help, Icon, max }) => {
                const percent = element?.value === null || element?.value === undefined ? 0 : Math.max(5, Math.min(100, (Math.abs(element.value) / max) * 100));

                return (
                    <article key={name} className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow transition hover:-translate-y-1 hover:border-signal-cyan/30">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <ScientificTooltip label={help}>
                                    <h3 className="text-sm font-medium text-white/70">{element?.title ?? fallbackTitle}</h3>
                                </ScientificTooltip>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                    {formatNumber(element?.value, 4)} <span className="text-sm font-normal text-white/50">{element?.units}</span>
                                </p>
                            </div>
                            <Icon className="size-5 text-signal-cyan" aria-hidden="true" />
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-signal-mint to-signal-cyan" style={{ width: `${percent}%` }} />
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
